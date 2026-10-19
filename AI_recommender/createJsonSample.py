#!/usr/bin/env python3
"""
build_catalog.py - builds the hackathon demo catalog from DummyJSON.

DummyJSON (https://dummyjson.com) acts as the "reference market": a stable public
source whose product pages and prices the AI can fetch and compare against.

Outputs (written next to this script):
  products.json     - 20 listings the agent is allowed to see
  groundtruth.json  - the correct verdict for each listing id (NEVER show this to the agent;
                      use it afterwards to score how well the agent catches the fakes)
  reference_prices.json - SIMULATED market benchmark: for every product, 3-5 prices from other
                      (fictional) retailers plus their median. Independent of any listing's URL,
                      so a price check against it is not circular. Label it as simulated in demos.

Run:  python build_catalog.py     (standard library only, needs internet access)
"""
import json
import random
import statistics
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "https://dummyjson.com"
OUT_DIR = Path(__file__).parent
random.seed(42)  # same catalog every run, so demos are repeatable

# Python's default urllib User-Agent is blocked by many hosts (HTTP 403), so send a normal one.
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; hackathon-catalog-builder/1.0)",
    "Accept": "application/json",
}


def fetch(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=15) as resp:
        return json.load(resp)


def real_url(pid):
    return f"{BASE}/products/{pid}"


def listing(p, **overrides):
    """Build a listing from a real reference product, then apply overrides."""
    item = {
        "title": p["title"],
        "description": p.get("description", ""),
        "price": round(float(p["price"]), 2),
        "currency": "USD",
        "category": p.get("category", ""),
        "marketplace": "DummyJSON Store",
        "sourceUrl": real_url(p["id"]),
    }
    item.update(overrides)
    return item


# Fictional "other retailers" that make up the simulated market.
RETAILERS = ["ShopNest", "BazaarHub", "TrendMart", "ValueVilla", "MegaMart"]


def generate_reference_prices(products):
    """Build a SIMULATED market benchmark for every product.

    For each real DummyJSON product, 3-5 fictional retailers each get a price a few percent
    above or below the product's true price, and the median is stored. Keyed by product title.
    These are synthetic numbers (not real retailer data): say so in your demo. Because they are
    derived from the true product price and not from any listing, tampered or scam listings
    can be compared against them honestly.
    """
    rng = random.Random(7)  # separate generator, so the catalog itself is unaffected
    reference = {}
    for p in products:
        base = float(p["price"])
        chosen = rng.sample(RETAILERS, rng.randint(3, 5))
        prices = {r: round(base * rng.uniform(0.92, 1.12), 2) for r in chosen}
        reference[p["title"]] = {
            "dummyjsonId": p["id"],
            "category": p.get("category", ""),
            "prices": prices,
            "medianPrice": round(statistics.median(prices.values()), 2),
            "minPrice": min(prices.values()),
            "maxPrice": max(prices.values()),
            "sourceCount": len(prices),
            "synthetic": True,
        }
    return reference


def main():
    # Fallback: if the API is blocked for you, open https://dummyjson.com/products?limit=100
    # in your browser, save the page as dummyjson_products.json next to this script, and re-run.
    local = OUT_DIR / "dummyjson_products.json"
    if local.exists():
        pool = json.loads(local.read_text(encoding="utf-8"))["products"]
    else:
        pool = fetch(f"{BASE}/products?limit=100")["products"]
    random.shuffle(pool)
    nxt = iter(pool).__next__

    entries = []  # (listing, verdict, reason)

    # 12 genuine listings: real URL, real title, real price
    for _ in range(12):
        p = nxt()
        entries.append((listing(p), "valid", "URL resolves and title and price match the reference market"))

    # 2 suspiciously cheap: real URL, but listed far below the live page and market price
    for _ in range(2):
        p = nxt()
        cheap = round(float(p["price"]) * random.uniform(0.15, 0.25), 2)
        entries.append((
            listing(p, price=cheap, marketplace="QuickCart",
                    description=p.get("description", "") + " Limited stock, hurry. No returns."),
            "price_mismatch",
            "listed price is far below the live page and the market price",
        ))

    # 1 overpriced: real URL, listed well above the market price
    p = nxt()
    entries.append((
        listing(p, price=round(float(p["price"]) * 2.5, 2), marketplace="MegaDeals24"),
        "price_mismatch",
        "listed price is about 2.5x the market price",
    ))

    # 2 dead links: real domain, product id that does not exist (expect a 404)
    for i in range(2):
        p = nxt()
        entries.append((
            listing(p, sourceUrl=real_url(9000 + i), marketplace="QuickCart"),
            "dead_link",
            "product page does not exist (404)",
        ))

    # 2 lookalike domains: .example never resolves, so the link can't be verified.
    # Priced far below market too: the scammer's own page would agree with their own low price,
    # so only the independent market benchmark can expose the price.
    for _ in range(2):
        p = nxt()
        cheap = round(float(p["price"]) * random.uniform(0.2, 0.35), 2)
        entries.append((
            listing(p, price=cheap,
                    sourceUrl=f"https://dummyjson-store.example/products/{p['id']}",
                    marketplace="MegaDeals24",
                    description=p.get("description", "") + " Today only. Pay within 1 hour. Contact seller on chat."),
            "fake_domain",
            "domain does not match the claimed marketplace, does not resolve, and the price is far below market",
        ))

    # 1 content mismatch: URL is a real product, but the title and details describe a different one
    p, q = nxt(), nxt()
    entries.append((
        listing(q, sourceUrl=real_url(p["id"]), marketplace="TrendMart"),
        "content_mismatch",
        "URL points to a different product than the listing claims",
    ))

    random.shuffle(entries)  # so ids don't reveal which listings are fake

    catalog, truth = [], {}
    for i, (item, verdict, reason) in enumerate(entries, start=1):
        pid = f"p{i:03d}"
        catalog.append({"id": pid, **item})
        truth[pid] = {"verdict": verdict, "reason": reason}

    (OUT_DIR / "products.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    (OUT_DIR / "groundtruth.json").write_text(json.dumps(truth, indent=2), encoding="utf-8")

    reference = generate_reference_prices(pool)  # every product, not just the 20 listed
    (OUT_DIR / "reference_prices.json").write_text(json.dumps(reference, indent=2), encoding="utf-8")

    counts = {}
    for t in truth.values():
        counts[t["verdict"]] = counts.get(t["verdict"], 0) + 1
    print(f"Wrote {len(catalog)} listings:", counts)
    print(f"Wrote simulated reference prices for {len(reference)} products")


if __name__ == "__main__":
    main()