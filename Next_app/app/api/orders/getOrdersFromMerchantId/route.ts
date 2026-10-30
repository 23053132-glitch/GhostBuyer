import { NextResponse } from "next/server";
import {getOrdersByMerchantId} from "@/lib/orders";

export async function GET(req: Request) {
    try{
        // console.log(req.url);
    const { searchParams } = new URL(req.url);
    // console.log("Search Params:", searchParams); // Log the search parameters
    const merchantId = searchParams.get("merchantId");
    console.log("merchantId",merchantId)
    if (!merchantId) {
        return NextResponse.json({ error: "Missing merchantId parameter" }, { status: 400 });
    }

    try {
        const orders = await getOrdersByMerchantId(merchantId);
        return NextResponse.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
}
}