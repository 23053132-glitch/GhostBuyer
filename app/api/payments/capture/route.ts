import { NextResponse } from "next/server";
import { getAccessToken, PAYPAL_BASE } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const token = await getAccessToken();
    const res = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `capture-${orderId}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok || data.status !== "COMPLETED") {
      console.error("PayPal capture error:", res.status, JSON.stringify(data));
      return NextResponse.json({ error: "Capture failed" }, { status: 502 });
    }
    return NextResponse.json({
      status: data.status,
      captureId: data.purchase_units?.[0]?.payments?.captures?.[0]?.id,
    });
  } catch (err) {
    console.error("capture crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}