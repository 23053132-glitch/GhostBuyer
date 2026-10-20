import { NextResponse } from "next/server";
import {checkDnsTxt,createDnsChallenge,domainFromEmail,isExpired} from "@/lib/verifier";
import {prisma} from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        try {
        const domain = domainFromEmail(email);
        }catch (err) {
            return NextResponse.json({ error: "Please provide your business email, not a free domain email" }, { status: 400 });
        }
        
    }
}