import { NextResponse } from "next/server";
import {fetchMerchantsToRefresh} from "@/lib/merchants";

export async function GET() {
    try{
        const merchants = await fetchMerchantsToRefresh();
        return NextResponse.json(merchants);
    }catch (error) {
        console.error("Error fetching merchants to refresh:", error);
        return NextResponse.json({ message: "Error fetching merchants to refresh" }, { status: 500 });
    }
}