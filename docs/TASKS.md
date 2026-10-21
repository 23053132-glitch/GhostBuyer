# Project Tasks

This document tracks implementation tasks, ownership, and progress for the hackathon project.

## Status Definitions

- **Completed:** Implemented and verified.
- **In Progress:** Implementation exists but still requires work.
- **Pending:** Not yet completed.
- **Superseded:** Replaced by a newer approach or no longer required.

## 1. AI Screener & Merchant Risk Assessment

**Owner:** Thunder

**Status:** In Progress

### Tasks
- [x] Create the basic AI screener.
- [ ] Incorporate merchant verification status into risk assessment.
- [ ] Consider total orders received when evaluating merchant reliability.
- [ ] Consider completed orders when evaluating merchant reliability.
- [ ] Consider returned orders when evaluating merchant reliability.
- [ ] Define how these factors influence the final screening result.
- [ ] Test the screener against verified, unverified, and merchants with different order histories.

**Notes:** The basic screener exists. The merchant verification and order-history signals still need to be integrated.

## 2. Next.js Application & Merchant Registration UI

**Owner:** Glitch

**Status:** In Progress

### Tasks
- [x] Create the initial Next.js application.
- [ ] Investigate and select the appropriate PayPal payment integration.
- [ ] Create a merchant registration form with the following fields:
  - [ ] Merchant name
  - [ ] Merchant ID
  - [ ] Email
  - [ ] PayPal Merchant ID (temporary integration field)
  - [ ] Backend endpoint for order creation
- [ ] Connect the form to the merchant registration API.
- [ ] Display appropriate validation errors and registration status.

**Notes:** The Next.js app exists. Payment integration remains under investigation. The PayPal Merchant ID field is a temporary design choice and does not imply that payment routing has been finalized.

## 3. Dummy Merchant Server

**Owner:** Glitch

**Status:** Pending

### Tasks
- [ ] Create a dummy merchant server for integration testing.
- [ ] Implement the order-creation endpoint expected by the platform.
- [ ] Validate incoming order requests.
- [ ] Update the dummy merchant's own backend with the received order.
- [ ] Return an order confirmation response.
- [ ] Handle invalid requests and duplicate order submissions.
- [ ] Test the full flow from platform order request to merchant-side order update.

**Expected Outcome:** The platform can send an order to the dummy merchant, and the merchant server records the order and returns a confirmation.

## 4. Merchant Details, DNS Verification & Email Verification

**Owner:** Thunder

**Status:** Pending

### Tasks
- [ ] Implement backend handling for merchant registration details.
- [ ] Store merchant information in the database.
- [ ] Generate a unique DNS TXT verification token.
- [ ] Implement DNS TXT record verification for the merchant's domain.
- [ ] Implement email code generation and verification.
- [ ] Add appropriate code expiration and retry/attempt limits.
- [ ] Track merchant verification status.
- [ ] Ensure unverified merchants cannot become eligible for product discovery and order routing.
- [ ] Test successful verification, invalid tokens, expired codes, and failed attempts.

**Expected Outcome:** Merchant domain ownership and email control are verified before the merchant is activated, according to the platform's onboarding rules.

## 5. Merchant Endpoint Testing & Liveness Monitoring

**Owner:** Glitch

**Status:** Pending

### Tasks
- [ ] Create a function that accepts a merchant's registered order API endpoint.
- [ ] Test endpoint connectivity.
- [ ] Validate the expected authentication and request/response contract.
- [ ] Check whether the endpoint returns an acceptable response.
- [ ] Implement endpoint timeout and error handling.
- [ ] Record the endpoint's health or last successful test result.
- [ ] Implement a way to check whether the endpoint is still live.
- [ ] Integrate endpoint validation into merchant onboarding.
- [ ] Test the function against the dummy merchant server.

**Expected Outcome:** The platform can validate a merchant's order endpoint during onboarding and check its availability when needed.

**Security Note:** Validate endpoint destinations and restrict network access to prevent SSRF. Do not blindly request arbitrary URLs supplied by a merchant.

---

## 6. Cross-Task Integration

**Owner:** Thunder & Glitch

**Status:** Pending

### Tasks
- [ ] Agree on the merchant data model and registration API contract.
- [ ] Agree on the merchant verification status values.
- [ ] Agree on the order-creation request and response formats.
- [ ] Connect the merchant registration form to the verification backend.
- [ ] Connect endpoint testing to the merchant onboarding flow.
- [ ] Integrate merchant verification and order-history signals into the AI screener.
- [ ] Test the complete merchant onboarding flow.
- [ ] Test order creation and confirmation using the dummy merchant.
- [ ] Document any remaining payment-routing limitations.

**Expected Outcome:** The merchant can register, complete verification, provide an order endpoint, pass integration checks, and become eligible for the platform's customer shopping flow.

---

## 7. Superseded Tasks

No superseded tasks have been identified yet.

Add tasks here only when an existing approach is explicitly replaced or a task is no longer required.

---

## 8. Completion Log

Update this section as tasks are verified.

| Date | Task | Owner | Status / Notes |
|---|---|---|---|
| TBD | Initial AI screener | Thunder | Basic implementation exists |
| TBD | Initial Next.js app | Glitch | App created |

**Update rule:** Mark a task as Completed only after its implementation has been tested. Keep partially implemented tasks In Progress.