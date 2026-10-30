import {prisma} from "./prisma";

export async function fetchMerchantsToRefresh() {
    try{
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const merchants = await prisma.merchant.findMany({
            where: {
                OR: [
            {
                lastRatingDate: {
                    lte: sevenDaysAgo
                }
            },
            {
                lastRatingDate: null
            }
        ]
            }
        });
        return merchants;
    }catch (error) {
        console.error("Error fetching merchants to refresh:", error);
        throw error;
    }
}

export async function fetchMerchantById(merchantId: string) {
    try{
        const merchants = await prisma.merchant.findUnique({
            where: {
                userId: merchantId,
            },
        });
        return merchants;
    }catch (error) {
        console.error("Error fetching merchants to refresh:", error);
        throw error;
    }
}

//TODO
// export async function createMerchant()