import { NextResponse } from "next/server";
import {checkDnsTxt,createDnsChallenge,domainFromEmail,isExpired} from "@/lib/verifier";
import {prisma} from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const userId=await req.json();
        const user=await prisma.merchant.findUnique({
            where:{
                userId:userId,
            },
        })
        if(!user){
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }
        const domain=user.domain
        const challenge=createDnsChallenge(domain);
        await prisma.merchant.update({
            where:{
                userId:userId,
            },
            data:{
                dnsToken: challenge.token,
                dnsExpiresAt: challenge.expiresAt,
            },
        })

        return NextResponse.json({
            message: "Challenge created successfully",
            recordName: challenge.recordName,
            recordValue: challenge.recordValue,
        });
    }catch (error) {
        console.error("Error creating challenge:", error);
        return NextResponse.json({ message: "Error creating challenge" }, { status: 500 });
    }
}