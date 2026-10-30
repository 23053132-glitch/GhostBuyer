import { NextResponse } from "next/server";
import {getProductById,updateProductById} from '../../../../lib/products'



export async function POST(req:Request){
    try{
        const body = await req.json();
    
        const { productIds } = body;

        if (!Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json(
            { error: "A non-empty array of product IDs is required" },
            { status: 400 }
        );
    }

        const results = await Promise.all(
        productIds.map(async (productId: string) => {
        const embedd = await getProductById(productId);
        await updateProductById(productId, embedd.embedding);
            return {
            productId,
            success: true
        };
            })
            
        );
        return NextResponse.json({
        message: "Products updated successfully",
        results,
        });
    }catch(error){
        console.log(error)
        return NextResponse.json(
            
        { error: "Failed to update products" },
        { status: 500 })
    }
}