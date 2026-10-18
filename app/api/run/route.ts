import { NextResponse } from "next/server";
import { runAgents } from "@/lib/agents";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (typeof query !== "string" || !query.trim() || query.length > 200) {
      return NextResponse.json({ error: "Enter what you want to buy (max 200 characters)." }, { status: 400 });
    }
    return NextResponse.json(await runAgents(query.trim()));
  } catch (err) {
    console.error("run crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}