import {prisma} from "./prisma";

export async function getOrdersByMerchantId(merchantId: string) {
    try {
        const orders = await prisma.order.findMany({
            where: {
                merchantId: merchantId
            }
        });
        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
}