import type { AgentEvent, LedgerEntry, Product, SellerSignals } from "./types";
import { evaluateFraud } from "./fraudshield";

const CONTEXT = { medianPriceInr: 2000, spendingLimitInr: 5000 };

type RawProduct = Omit<Product, "fraud"> & { signals: SellerSignals };

const RAW_PRODUCTS: RawProduct[] = [
  {
    id: "p1", name: "Boat Rockerz 450", sellerName: "Boat Official",
    priceUsd: 18.5, priceInr: 1549, rating: 4.3,
    signals: { accountAgeDays: 1400, totalReviews: 5200, reviewShareLast7Days: 0.03, duplicateReviewRatio: 0.02, returnRate: 0.08 },
  },
  {
    id: "p2", name: "JBL Tune 510BT", sellerName: "Audio Hub",
    priceUsd: 36.0, priceInr: 2999, rating: 4.4,
    signals: { accountAgeDays: 21, totalReviews: 140, reviewShareLast7Days: 0.2, duplicateReviewRatio: 0.1, returnRate: 0.27 },
  },
  {
    id: "p3", name: "Sony WH-CH520", sellerName: "SoundDeal",
    priceUsd: 14.0, priceInr: 1170, rating: 4.9,
    signals: { accountAgeDays: 9, totalReviews: 180, reviewShareLast7Days: 0.7, duplicateReviewRatio: 0.45, returnRate: 0.05 },
  },
];

// FraudShield runs on every product; the UI and the payment route both read this result.
export const MOCK_PRODUCTS: Product[] = RAW_PRODUCTS.map(({ signals, ...p }) => ({
  ...p,
  fraud: evaluateFraud(p.priceInr, signals, CONTEXT),
}));

export const MOCK_EVENTS: AgentEvent[] = [
  { id: "1", agent: "Intent", message: "Category: headphones. Budget: ₹5,000.", status: "done" },
  { id: "2", agent: "Shopping", message: "Found 3 matching products.", status: "done" },
  { id: "3", agent: "Verifier", message: "Checked 3 sellers (paid ₹5 to Verifier agent).", status: "done" },
  { id: "4", agent: "FraudShield", message: "Blocked SoundDeal: price is 42% below category median.", status: "blocked" },
  { id: "5", agent: "Comparison", message: "Best option within budget: Boat Rockerz 450.", status: "done" },
];

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: "l1", from: "Shopping agent", to: "Verifier agent", amountInr: 5, purpose: "Seller verification" },
];