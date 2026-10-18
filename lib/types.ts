export type FraudDecision = "allow" | "review" | "block";

export interface FraudResult {
  score: number;
  decision: FraudDecision;
  reasons: string[];
}

export interface Product {
  id: string;
  name: string;
  sellerName: string;
  priceUsd: number;
  priceInr: number;
  rating: number;
  fraud: FraudResult;
}

export type AgentName = "Intent" | "Shopping" | "Comparison" | "Verifier" | "FraudShield";

export interface AgentEvent {
  id: string;
  agent: AgentName;
  message: string;
  status: "done" | "blocked";
}

export interface LedgerEntry {
  id: string;
  from: string;
  to: string;
  amountInr: number;
  purpose: string;
}

export type PaymentStatus = "idle" | "processing" | "success" | "failed";

export interface SellerSignals {
  accountAgeDays: number;
  totalReviews: number;
  reviewShareLast7Days: number;
  duplicateReviewRatio: number;
  returnRate: number;
}

export interface RunResult {
  events: AgentEvent[];
  products: Product[];
  ledger: LedgerEntry[];
  bestId: string | null;
}