
"use client";

import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { AgentEvent, AgentName, LedgerEntry, PaymentStatus, Product } from "@/lib/types";
import { MOCK_EVENTS, MOCK_LEDGER, MOCK_PRODUCTS } from "@/lib/mock";

const STAGES: AgentName[] = ["Intent", "Shopping", "Verifier", "FraudShield", "Comparison"];
const SUGGESTIONS = ["Best headphones under ₹5,000", "Smartwatch under ₹3,000", "Laptop bag under ₹1,500"];
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const LABEL = { allow: "Safe", review: "Needs review", block: "Blocked" } as const;

export default function Home() {
  const [query, setQuery] = useState(SUGGESTIONS[0]);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentStatus>("idle");

  const selected = products.find((p) => p.id === selectedId) ?? null;
  const done = new Set(events.map((e) => e.agent));
  const alerts = new Set(events.filter((e) => e.status === "blocked").map((e) => e.agent));
  const activeIdx = running ? STAGES.findIndex((s) => !done.has(s)) : -1;
  const started = events.length > 0 || running;

  // Replace with POST /api/runs + an EventSource stream.
  function startRun() {
    setRunning(true);
    setEvents([]);
    setProducts([]);
    setLedger([]);
    setSelectedId(null);
    setPayment("idle");
    MOCK_EVENTS.forEach((e, i) =>
      setTimeout(() => {
        setEvents((prev) => [...prev, e]);
        if (i === MOCK_EVENTS.length - 1) {
          setProducts(MOCK_PRODUCTS);
          setLedger(MOCK_LEDGER);
          setSelectedId("p1");
          setRunning(false);
        }
      }, 800 * (i + 1))
    );
  }

  return (
    <PayPalScriptProvider
      options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: "USD", intent: "capture" }}
    >
      <nav className="nav">
        <div className="brand">
          <span className="logo">G</span>
          <strong>GhostBuyer</strong>
        </div>
        <span className="pill">PayPal Sandbox</span>
      </nav>

      <main className="page">
        <section className="hero">
          <h1>
            Your AI. Your budget.
            <br />
            Your control.
          </h1>
          <p>
            Tell GhostBuyer what you need. Agents find it, verify the seller and screen for fraud.
            Nothing is paid until you approve.
          </p>
          <div className="command">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what to buy and your budget"
              aria-label="What do you want to buy?"
            />
            <button className="primary" onClick={startRun} disabled={running || !query.trim()}>
              {running ? "Agents working…" : "Find products"}
            </button>
          </div>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => setQuery(s)}>{s}</button>
            ))}
          </div>
          <ul className="trust">
            <li>Spending limit you set</li>
            <li>Every seller checked for fraud</li>
            <li>You approve every payment</li>
          </ul>
        </section>

        {started && (
          <section className="card">
            <ol className="stages">
              {STAGES.map((s, i) => {
                const state = alerts.has(s) ? "alert" : done.has(s) ? "done" : i === activeIdx ? "active" : "idle";
                return (
                  <li key={s} className={state}>
                    <span className="node">{state === "done" ? "✓" : state === "alert" ? "!" : i + 1}</span>
                    <span className="stage-name">{s}</span>
                  </li>
                );
              })}
            </ol>
            <ul className="log">
              {events.map((e) => (
                <li key={e.id} className={e.status}>
                  <strong>{e.agent}</strong>
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {products.length > 0 && (
          <div className="grid">
            <section>
              <h2>Results</h2>
              <div className="products">
                {products.map((p) => {
                  const blocked = p.fraud.decision === "block";
                  return (
                    <label key={p.id} className={`product ${blocked ? "disabled" : ""} ${p.id === selectedId ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="product"
                        disabled={blocked}
                        checked={p.id === selectedId}
                        onChange={() => { setSelectedId(p.id); setPayment("idle"); }}
                      />
                      <div className="p-main">
                        <div className="p-head">
                          <div>
                            <strong>{p.name}</strong>
                            <div className="muted">{p.sellerName} · {p.rating} rating</div>
                          </div>
                          <div className="p-price">
                            <strong>{inr(p.priceInr)}</strong>
                            <div className="muted">${p.priceUsd.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="risk">
                          <div className="meter"><span className={p.fraud.decision} style={{ width: `${p.fraud.score}%` }} /></div>
                          <span className={`status ${p.fraud.decision}`}>{LABEL[p.fraud.decision]} · risk {p.fraud.score}</span>
                        </div>
                        {p.fraud.reasons.length > 0 && (
                          <ul className="reasons">{p.fraud.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <aside>
              <section className="card">
                <h2>Checkout</h2>
                {selected ? (
                  <>
                    <div className="row"><span className="muted">Item</span><strong>{selected.name}</strong></div>
                    <div className="row"><span className="muted">Total</span><strong>{inr(selected.priceInr)}</strong></div>
                    <div className="row"><span className="muted">Charged in sandbox</span><span>${selected.priceUsd.toFixed(2)}</span></div>
                    {payment === "success" ? (
                      <p className="success">Payment complete. Receipt sent to your orders.</p>
                    ) : (
                      <div style={{ marginTop: 14 }}>
                        <PayPalButtons
                          key={selected.id}
                          style={{ layout: "vertical", shape: "rect", label: "pay" }}
                          disabled={payment === "processing"}
                          createOrder={async () => {
                            const res = await fetch("/api/payments/create-order", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ productId: selected.id, requestId: crypto.randomUUID() }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            return data.orderId;
                          }}
                          onApprove={async (data) => {
                            setPayment("processing");
                            const res = await fetch("/api/payments/capture", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderId: data.orderID }),
                            });
                            setPayment(res.ok ? "success" : "failed");
                          }}
                                                 onError={(err) => { console.error("PayPal button error:", err); setPayment("failed"); }}
                        />
                      </div>
                    )}
                    {payment === "failed" && (
                      <p className="error">Payment failed. Nothing was charged. Try again.</p>
                    )}
                    <p className="note">Nothing is charged until you approve.</p>
                  </>
                ) : (
                  <p className="muted">Select a product to continue.</p>
                )}
              </section>

              <section className="card">
                <h2>Agent payments</h2>
                {ledger.map((l) => (
                  <div key={l.id} className="row">
                    <span>{l.from} → {l.to}<div className="muted">{l.purpose}</div></span>
                    <strong>{inr(l.amountInr)}</strong>
                  </div>
                ))}
              </section>
            </aside>
          </div>
        )}
      </main>
    </PayPalScriptProvider>
  );
}