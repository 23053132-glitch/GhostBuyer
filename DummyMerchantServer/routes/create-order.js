import express from "express";

const router = express.Router();


const BASE_URL="https://api-m.sandbox.paypal.com"


router.post(`/create-order`, async (req, res) => {

    const body=req.body;

    const credentials = Buffer
  .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
  .toString("base64");

    const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
myHeaders.append("Authorization", `Basic ${credentials}`);

const urlencoded = new URLSearchParams();
urlencoded.append("grant_type", "client_credentials");

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: urlencoded,
  redirect: "follow"
};

const token= await (await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", requestOptions)).json()
// console.log(token);

    const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
    "Authorization":`Bearer ${token.access_token}`,
    // "PayPal-Auth-Assertion": "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im15QGVtYWlsLmNvbSJ9"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.json(data.links[1].href);
})

router.get(`/returnUrl`,async(req,res)=>{
    console.log(req.query);

    const credentials = Buffer
  .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
  .toString("base64");

    const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
myHeaders.append("Authorization", `Basic ${credentials}`);

const urlencoded = new URLSearchParams();
urlencoded.append("grant_type", "client_credentials");

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: urlencoded,
  redirect: "follow"
};

const token= await (await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", requestOptions)).json()
// console.log(token);
    const orderDetail=await fetch(`${BASE_URL}/v2/checkout/orders/${req.query.token}`,{
        method:"GET",
        headers:{
            "Content-Type": "application/json",
    "Authorization":`Bearer ${token.access_token}`,
        }
    })
    const data=await orderDetail.json();
    console.log(data);
    res.json({message:"your order is completed successfully"});

})

export default router;