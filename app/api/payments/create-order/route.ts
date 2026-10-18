import { NextResponse } from "next/server";
import { MOCK_PRODUCTS } from "@/lib/mock";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";

const SPEND_LIMIT_USD = 60;

export async function POST(req: Request) {
  try {
    const { productId, requestId } = await req.json();

    // The price comes from the server's own data, never from the browser.
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 404 });
    }
    if (product.fraud.decision === "block") {
      return NextResponse.json({ error: "Blocked by FraudShield" }, { status: 403 });
    }
    if (product.priceUsd > SPEND_LIMIT_USD) {
      return NextResponse.json({ error: "Over spending limit" }, { status: 403 });
    }

    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": String(requestId),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: product.id,
            description: product.name,
            amount: { currency_code: "USD", value: product.priceUsd.toFixed(2) },
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("PayPal create-order error:", res.status, JSON.stringify(data));
      return NextResponse.json({ error: "Could not create order" }, { status: 502 });
    }
    return NextResponse.json({ orderId: data.id });
  } catch (err) {
    console.error("create-order crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}