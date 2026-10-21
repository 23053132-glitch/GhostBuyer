import { NextResponse } from "next/server";
import {checkDnsTxt,createDnsChallenge,domainFromEmail,isExpired} from "@/lib/verifier";
import {prisma} from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const userId=await req.json();

        const merchant=await prisma.merchant.findUnique({
            where:{
                userId:userId,
            },
})
        if(isExpired(merchant.dnsExpiresAt)){
            return NextResponse.json({message:"Challenge expired, please create a new challenge"});
        }
        const verified=await checkDnsTxt(merchant.domain,merchant.dnsToken);
        if(verified.status==="verified"){
            await prisma.merchant.update({
                where:{
                    userId:userId,
                },
                data:{
                    stats:"DNS_VERIFIED",
                    verfiedAt:new Date(),
                },
            })
            return NextResponse.json({message:"Domain verified successfully, Please proceed to verify email"});
        }
        return NextResponse.json({message:"verification Failed, please check your DNS settings and try again"});
    
    }
    catch (error) {
        console.error("Error verifying challenge:", error);
        return NextResponse.json({ message: "Error verifying challenge" }, { status: 500 });
    }
}
