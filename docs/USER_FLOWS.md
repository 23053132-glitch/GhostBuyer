# User Flows

## 1. Overview

The application is an AI-powered shopping marketplace that allows customers to search for products using natural language, compare offers from onboarded merchants, evaluate product and merchant risk, and complete checkout through an integrated payment provider.

Merchants onboard onto the platform by verifying their domain, providing their product catalog, and registering a backend endpoint for order creation.

The platform connects customers with merchants, records order and payment states, and forwards paid orders to merchants for fulfilment.

### Primary Actors

- **Customer:** Searches for products, compares offers, selects products, and completes checkout.
- **Merchant:** Registers a business, verifies domain ownership, provides product data, and fulfils orders.
- **AI Shopping Agent:** Interprets customer requests and helps identify relevant products.
- **Platform Backend:** Manages merchant eligibility, catalog search, ranking, fraud screening, checkout, payment verification, and order routing.
- **Payment Provider:** Handles payment authorization/capture and provides payment status information.

---

## 2. Customer Shopping Flow

### Step 1: Customer submits a search

The customer interacts with a chat-based shopping interface and enters a natural-language request.

**Example:** "Find me shoes under ₹5,000."

The AI Shopping Agent interprets the request and extracts relevant search criteria.

Possible criteria:
- Product category: Shoes
- Maximum budget: ₹5,000
- Additional preferences: Brand, size, color, use case, etc., if provided

If essential information is missing, the agent may ask a follow-up question.

### Step 2: Retrieve available products

The backend searches the platform's stored product catalogs for matching products.

Only products belonging to eligible, verified merchants should be considered.

Product data may include:
- Product ID and name
- Description and category
- Price and currency
- Availability or stock status
- Merchant ID
- Product URL or image
- Relevant product attributes

The platform should use its stored catalog as the initial source of product candidates rather than allowing the AI to invent product listings.

### Step 3: Filter, evaluate risk, and rank offers

The backend filters the results according to the customer's requirements.

The platform evaluates eligible offers using factors such as:

- **Price:** Whether the product meets the budget and offers competitive pricing.
- **Relevance:** How closely the product matches the customer's request.
- **Availability:** Whether the product is available for purchase.
- **Merchant risk:** Signals associated with merchant verification, account status, and suspicious activity.
- **Product risk:** Inconsistencies or other suspicious signals associated with a listing, where applicable.

The platform ranks eligible offers according to its configured ranking policy.

Fraud screening should act as a separate eligibility or risk-control step where appropriate; a low price alone should not establish that an offer is trustworthy.

### Step 4: Display ranked offers

The application presents the matching products to the customer.

Each result may display:
- Product name and image
- Merchant name
- Price
- Availability
- Relevant product details
- Checkout option

The customer can compare the available offers and select a product.

If no eligible products are found, the application informs the customer and allows them to modify their request.

### Step 5: Customer initiates checkout

When the customer selects a product and proceeds to checkout, the backend revalidates the offer.

The backend verifies:
- The merchant remains eligible.
- The product belongs to that merchant.
- The product is still available.
- The current price and currency match the checkout details.
- The order amount is calculated using trusted server-side data.

The platform creates a pending checkout or order record with a unique identifier.

### Step 6: Payment

The customer proceeds through the integrated payment provider's checkout and authentication flow.

The payment provider handles the payment process according to the configured integration.

The backend associates the payment with the correct customer, selected offer, merchant, and order.

The application must not treat a browser redirect or client-side success message as proof of successful payment.

### Step 7: Verify and record payment

The backend verifies the payment using the payment provider's authoritative server-side response or webhook.

The platform records the relevant payment reference and updates the payment status.

Possible states include:
- `PENDING`
- `SUCCESSFUL`
- `FAILED`

Duplicate payment notifications must not create duplicate records or trigger duplicate fulfilment actions.

### Step 8: Create and route the merchant order

After the appropriate payment confirmation, the backend sends an authenticated order-creation request to the merchant's registered endpoint.

The request includes the information agreed upon in the merchant API contract, such as:
- Unique platform order ID
- Merchant product ID
- Quantity
- Confirmed price and currency
- Customer shipping details, when required and consented to
- Payment or transaction reference, where appropriate

The backend records the merchant's response and any merchant-side order reference.

If the merchant endpoint is temporarily unavailable, the platform records the failure and retries safely using an idempotency key or equivalent duplicate-prevention mechanism.

### Step 9: Customer receives order status

The application shows the customer the current order and payment status.

Possible order states include:
- `PENDING`
- `CONFIRMED`
- `FULFILLED`
- `CANCELLED`

Payment status and order status are tracked separately.

The customer can see whether payment succeeded and whether the merchant has accepted or fulfilled the order.

---

## 3. Merchant Onboarding Flow

### Step 1: Merchant registers

The merchant submits the required business and account details.

Expected information includes:
- Business or merchant name
- Business email
- Domain
- Payment-provider merchant identity, where required
- Catalog integration details
- Order-creation endpoint details

The backend creates a merchant record with an initial onboarding status.

### Step 2: Verify domain ownership

The platform generates a unique, unpredictable verification token associated with the merchant and its domain.

The merchant is instructed to publish the token as a DNS TXT record under the specified record name.

The backend queries DNS and checks whether the expected token is present.

Possible outcomes:
- **Verified:** The expected token is found and the challenge is valid.
- **Pending:** The record has not propagated or is not yet present.
- **Failed/Expired