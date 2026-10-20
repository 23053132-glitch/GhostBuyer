import type { Product, SellerSignals } from "./types";
import { evaluateFraud } from "./fraudshield";

export const CATEGORIES = ["headphones", "smartwatch", "laptop bag"] as const;
export type Category = (typeof CATEGORIES)[number];

interface RawProduct {
  id: string;
  name: string;
  sellerName: string;
  category: Category;
  priceInr: number;
  rating: number;
  signals: SellerSignals;
}

const USD_RATE = 84; // fixed demo rate: ₹84 = $1

// signals: [accountAgeDays, totalReviews, reviewShareLast7Days, duplicateReviewRatio, returnRate]
function p(
  id: string, name: string, sellerName: string, category: Category,
  priceInr: number, rating: number, s: [number, number, number, number, number]
): RawProduct {
  return {
    id, name, sellerName, category, priceInr, rating,
    signals: { accountAgeDays: s[0], totalReviews: s[1], reviewShareLast7Days: s[2], duplicateReviewRatio: s[3], returnRate: s[4] },
  };
}

const CATALOG: RawProduct[] = [
  // Headphones
  p("h1", "Boat Rockerz 450", "Boat Official", "headphones", 1549, 4.3, [1400, 5200, 0.03, 0.02, 0.08]),
  p("h2", "JBL Tune 510BT", "Audio Hub", "headphones", 2999, 4.4, [21, 140, 0.2, 0.1, 0.27]),
  p("h3", "Sony WH-CH520", "SoundDeal", "headphones", 1170, 4.9, [9, 180, 0.7, 0.45, 0.05]),
  p("h4", "realme Buds Wireless 3", "realme Store", "headphones", 1799, 4.2, [900, 3100, 0.04, 0.03, 0.1]),
  p("h5", "Noise Two Wireless", "Noise Official", "headphones", 1299, 4.1, [1100, 2600, 0.05, 0.02, 0.09]),
  // Smartwatches
  p("s1", "Noise ColorFit Pulse 3", "Noise Official", "smartwatch", 1799, 4.1, [1100, 3800, 0.03, 0.02, 0.07]),
  p("s2", "boAt Wave Call 3", "Boat Official", "smartwatch", 1999, 4.2, [1400, 4100, 0.04, 0.03, 0.08]),
  p("s3", "Fire-Boltt Ninja Call Pro", "Fire-Boltt Store", "smartwatch", 1499, 4.0, [800, 2100, 0.05, 0.04, 0.12]),
  p("s4", "Fastrack Reflex Vox", "Titan Retail", "smartwatch", 2495, 4.3, [2000, 1500, 0.02, 0.01, 0.06]),
  p("s5", "Smart Watch Ultra X", "FlashDeals", "smartwatch", 699, 4.9, [12, 160, 0.75, 0.5, 0.06]),
  p("s6", "Amazfit Bip 5", "Zepp Store", "smartwatch", 4999, 4.4, [700, 1200, 0.04, 0.02, 0.05]),
  // Laptop bags
  p("b1", "Wildcraft Laptop Backpack", "Wildcraft Official", "laptop bag", 1299, 4.3, [1800, 2700, 0.03, 0.02, 0.07]),
  p("b2", "American Tourister Backpack", "AT Store", "laptop bag", 1499, 4.4, [2200, 3300, 0.02, 0.01, 0.06]),
  p("b3", "Skybags Gradient", "Skybags Store", "laptop bag", 1199, 4.2, [1500, 2400, 0.04, 0.03, 0.09]),
  p("b4", "Safari Rhino Backpack", "Safari Retail", "laptop bag", 1349, 4.1, [1700, 1900, 0.03, 0.02, 0.08]),
  p("b5", "Premium Leather Laptop Bag", "LuxuryDeal", "laptop bag", 399, 4.9, [8, 150, 0.8, 0.5, 0.04]),
  p("b6", "Tech Gear Laptop Bag", "BagWorld", "laptop bag", 899, 4.4, [25, 210, 0.15, 0.1, 0.3]),
];

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianFor(category: Category): number {
  return median(CATALOG.filter((r) => r.category === category).map((r) => r.priceInr));
}

function build(r: RawProduct, spendingLimitInr: number): Product {
  return {
    id: r.id,
    name: r.name,
    sellerName: r.sellerName,
    priceInr: r.priceInr,
    priceUsd: Math.round((r.priceInr / USD_RATE) * 100) / 100,
    rating: r.rating,
    fraud: evaluateFraud(r.priceInr, r.signals, {
      medianPriceInr: medianFor(r.category),
      spendingLimitInr,
    }),
  };
}

// Shopping agent: matching products within the user's budget, scored by FraudShield.
export function searchCatalog(category: Category, budgetInr: number): Product[] {
  return CATALOG.filter((r) => r.category === category && r.priceInr <= budgetInr).map((r) =>
    build(r, budgetInr)
  );
}

// Used by the payment route so the server never trusts a price or decision from the browser.
export function getProductById(id: string): Product | null {
  const r = CATALOG.find((x) => x.id === id);
  return r ? build(r, Number.POSITIVE_INFINITY) : null;
}