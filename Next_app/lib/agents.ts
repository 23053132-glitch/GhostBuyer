import type { AgentEvent, AgentName, LedgerEntry, Product, RunResult } from "./types";
import { CATEGORIES, searchCatalog, type Category } from "./catalog";

interface Intent {
  category: Category;
  budgetInr: number;
  source: "AI" | "rules";
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const DEFAULT_BUDGET = 5000;

// Fallback so the demo never breaks if there is no API key or the AI call fails.
function ruleIntent(query: string): Intent | null {
  const q = query.toLowerCase();
  let category: Category | null = null;
  if (/headphone|earphone|earbud|buds|headset/.test(q)) category = "headphones";
  else if (/watch/.test(q)) category = "smartwatch";
  else if (/bag|backpack/.test(q)) category = "laptop bag";
  if (!category) return null;

  const m = q.match(/(?:₹|rs\.?|inr|under|below|within)\s*([\d,]+)/);
  const budget = m ? parseInt(m[1].replace(/,/g, ""), 10) : DEFAULT_BUDGET;
  return { category, budgetInr: budget > 0 ? budget : DEFAULT_BUDGET, source: "rules" };
}

const SYSTEM =
  `Extract the shopping intent from the user's message. Reply with JSON only, no other text: ` +
  `{"category": one of ${JSON.stringify(CATEGORIES)}, "budgetInr": number}. ` +
  `If the budget is not stated use ${DEFAULT_BUDGET}. If the category does not match, reply {"category": null, "budgetInr": 0}.`;

// Calls whichever free-tier provider has a key in .env.local (Groq first, then Gemini).
async function callLLM(query: string): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 100,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  }

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: query }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 400, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  return null;
}

// Intent agent: the AI turns free text into { category, budgetInr }. Output is strictly validated.
async function aiIntent(query: string): Promise<Intent | null> {
  try {
    const text = await callLLM(query);
    if (!text) return null;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const category = CATEGORIES.find((c) => c === parsed.category);
    const budget = Number(parsed.budgetInr);
    if (!category || !Number.isFinite(budget) || budget <= 0) return null;
    return { category, budgetInr: Math.round(budget), source: "AI" };
  } catch {
    return null; // any failure falls back to the keyword rules
  }
}

function rank(p: Product, min: number, max: number): number {
  if (p.fraud.decision === "block") return -1;
  const priceScore = 1 - (p.priceInr - min) / (max - min || 1);
  const ratingScore = Math.max(0, (p.rating - 3) / 2);
  const safety = 1 - p.fraud.score / 100;
  return 0.4 * priceScore + 0.4 * ratingScore + 0.2 * safety;
}

export async function runAgents(query: string): Promise<RunResult> {
  const events: AgentEvent[] = [];
  const log = (agent: AgentName, message: string, status: AgentEvent["status"] = "done") =>
    events.push({ id: String(events.length + 1), agent, message, status });
  const empty = (): RunResult => ({ events, products: [], ledger: [], bestId: null });

  const intent = (await aiIntent(query)) ?? ruleIntent(query);
  if (!intent) {
    log("Intent", "Could not tell what to buy. Try headphones, a smartwatch or a laptop bag, with a budget.", "blocked");
    return empty();
  }
  log("Intent", `Category: ${intent.category}. Budget: ${inr(intent.budgetInr)}. Read by ${intent.source === "AI" ? "AI" : "rules"}.`);

  const products = searchCatalog(intent.category, intent.budgetInr);
  log("Shopping", `Found ${products.length} matching products within budget.`);
  if (products.length === 0) return empty();

  const sellers = new Set(products.map((p) => p.sellerName)).size;
  const fee = sellers * 2;
  log("Verifier", `Checked ${sellers} sellers (paid ${inr(fee)} to Verifier agent).`);

  const blocked = products.filter((p) => p.fraud.decision === "block");
  if (blocked.length > 0) {
    log("FraudShield", `Blocked ${blocked.map((p) => p.sellerName).join(", ")}: ${blocked[0].fraud.reasons[0]}.`, "blocked");
  } else {
    log("FraudShield", "No risky sellers found.");
  }

  const prices = products.map((p) => p.priceInr);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const order = { allow: 0, review: 1, block: 2 } as const;
  const scored = products
    .map((p) => ({ p, score: rank(p, min, max) }))
    .sort((a, b) => order[a.p.fraud.decision] - order[b.p.fraud.decision] || b.score - a.score);
  const sorted = scored.map((x) => x.p);
  const best = sorted.find((p) => p.fraud.decision === "allow") ?? null;

  if (best) log("Comparison", `Best option within budget: ${best.name}.`);
  else log("Comparison", "No safe option found within budget.", "blocked");

  const ledger: LedgerEntry[] = [
    { id: "l1", from: "Shopping agent", to: "Verifier agent", amountInr: fee, purpose: `Verified ${sellers} sellers` },
  ];
  return { events, products: sorted, ledger, bestId: best?.id ?? null };
}