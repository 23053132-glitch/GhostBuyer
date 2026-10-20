import type { FraudDecision, FraudResult, SellerSignals } from "./types";

export interface FraudContext {
  medianPriceInr: number;   // typical price for this category
  spendingLimitInr: number; // the user's limit
}

export function evaluateFraud(priceInr: number, s: SellerSignals, ctx: FraudContext): FraudResult {
  let score = 0;
  const reasons: string[] = [];

  // Rule 1: price far below the category median
  const below = (ctx.medianPriceInr - priceInr) / ctx.medianPriceInr;
  if (below > 0.4) {
    score += 40;
    reasons.push(`Price ${Math.round(below * 100)}% below category median`);
  } else if (below > 0.25) {
    score += 15;
    reasons.push(`Price ${Math.round(below * 100)}% below category median`);
  }

  // Rule 2: very new seller account
  if (s.accountAgeDays < 30) {
    score += 25;
    reasons.push(`Seller account is ${s.accountAgeDays} days old`);
  } else if (s.accountAgeDays < 90) {
    score += 10;
    reasons.push(`Seller account is only ${s.accountAgeDays} days old`);
  }

  // Rule 3: sudden burst of reviews
  if (s.totalReviews >= 20 && s.reviewShareLast7Days > 0.5) {
    score += 25;
    reasons.push(`${Math.round(s.reviewShareLast7Days * 100)}% of reviews posted in the last 7 days`);
  }

  // Rule 4: copied or templated review text
  if (s.duplicateReviewRatio > 0.3) {
    score += 20;
    reasons.push(`${Math.round(s.duplicateReviewRatio * 100)}% of reviews have duplicate text`);
  }

  // Rule 5: high return rate
  if (s.returnRate > 0.25) {
    score += 10;
    reasons.push(`High return rate (${Math.round(s.returnRate * 100)}%)`);
  }

  score = Math.min(100, score);

  // Hard rule: above the user's spending limit is always blocked
  if (priceInr > ctx.spendingLimitInr) {
    reasons.push("Price is above your spending limit");
    score = Math.max(score, 70);
  }

  const decision: FraudDecision = score >= 70 ? "block" : score >= 30 ? "review" : "allow";
  return { score, decision, reasons };
}