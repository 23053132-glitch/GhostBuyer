# Design & Technical Decisions

This document records the major architectural and technical decisions for the project, including the reasoning behind them and decisions that remain unresolved.

**Status definitions**
- **Accepted:** Decision has been made.
- **Proposed:** Approach under consideration but not finalized.
- **Pending:** Requires further investigation or agreement.
- **Superseded:** Replaced by a later decision.

---

## D-001: Use Next.js for the Main Application

**Status:** Accepted

### Context
The application requires a customer-facing interface and backend functionality for handling application requests.

### Decision
Use Next.js as the main application framework for the frontend and the application-facing backend.

### Reasoning
- Provides frontend and backend capabilities within one project structure.
- Keeps related application code in a single repository and framework.
- Simplifies development and coordination during the hackathon.

### Scope
This decision covers the main web application. The AI backend will be implemented separately in Python.

---

## D-002: Use Python for the AI Backend

**Status:** Accepted

### Context
The application uses AI agents to interpret customer requests, search product catalogs, and coordinate tools.

### Decision
Implement the AI backend in Python.

### Reasoning
Python provides a broad ecosystem of AI libraries, model integrations, and SDKs, making it suitable for agent development and experimentation.

### Scope
The Python backend is responsible for AI-related processing and agent orchestration. The exact API contract between the Next.js application and the Python backend will be documented separately.

---

## D-003: Use Smolagents for Managed Agent Orchestration

**Status:** Accepted

### Context
The application needs AI agents that can interpret user requests and invoke tools to perform specific operations.

### Decision
Use the `smolagents` framework to orchestrate agents, with `CodeAgent` and `ToolCallingAgent` as the preferred agent types.

### Reasoning
- Provides flexibility in how agents perform tasks.
- Supports code-based execution through `CodeAgent`.
- Supports structured tool invocation through `ToolCallingAgent`.
- Provides an existing framework for agent orchestration rather than requiring a custom orchestration system.

### Scope
The framework will be used for the AI workflows required by the application. The exact division of responsibilities between agent types remains subject to implementation needs.

---

## D-004: Use Ollama with a Free-Tier LLM

**Status:** Accepted

### Context
The AI backend requires an LLM for agent execution, and the project aims to minimize model-inference costs during development and the hackathon.

### Decision
Use Ollama to access a free-tier LLM for the AI workflows.

### Reasoning
- Helps control inference costs during development.
- Provides a practical way to experiment with agent-based workflows.
- Allows the AI implementation to be developed without depending on a paid inference API as the default.

### Scope
The specific model and hosting configuration are not fixed by this decision. Model capability, tool-calling compatibility, inference latency, and resource limits will affect the final choice.

---

## D-005: Use Prisma ORM with PostgreSQL

**Status:** Accepted

### Context
The application stores structured information about merchants, products, customers, orders, and payments. These entities have relationships and require consistent data handling.

### Decision
Use Prisma ORM with PostgreSQL as the relational data layer.

### Reasoning
- PostgreSQL supports relational data and constraints.
- Prisma provides a schema-driven data model and typed database client.
- Explicit models and relationships help maintain a clear data structure.
- Relational integrity is important for an application that handles financial transactions and order records.

### Scope
Prisma and PostgreSQL will be used for the application's structured persistent data. The exact transaction boundaries, constraints, and payment-state transitions will be defined during implementation.

---

## D-006: Merchant Payment Routing Through PayPal

**Status:** Pending

### Context
The application allows customers to discover products from different merchants and complete checkout through an integrated payment provider.

A major unresolved question is how payments will be associated with the correct merchant's PayPal account and how the merchant will receive the funds.

### Proposed Approach
Ask the merchant to provide a PayPal Client ID during onboarding and investigate whether the platform can use the merchant's PayPal integration details to create an order associated with that merchant.

### Motivation
- Associate checkout with the intended merchant.
- Allow customers to purchase products from different onboarded merchants.
- Avoid incorrectly routing every payment through a single platform-owned merchant account.

### Questions to Resolve
1. Does the proposed PayPal integration support creating an order on behalf of a merchant using that merchant's Client ID?
2. What merchant onboarding or partner permissions are required?
3. Does the platform need to use a PayPal-supported marketplace or partner integration?
4. How are the payer, payee, merchant account, and platform's role represented in the order and capture flow?
5. How will payment status, capture confirmation, fees, refunds, and disputes be handled?
6. What server-side credentials and authorization mechanisms are required?

### Important Distinction
A PayPal Client ID identifies an application in a particular integration context. It should not be assumed that collecting a merchant's Client ID alone authorizes the platform to route payments to that merchant.

The proposed approach must be validated against PayPal's supported merchant onboarding and partner-payment capabilities before it is implemented.

### Current Status
**No final payment-routing architecture has been selected.**

The implementation should not assume that a merchant-provided Client ID is sufficient to receive payments until the required PayPal integration flow has been confirmed.

---

## Decision Review Process

When a major technical or product decision is made or changed:

1. Update the relevant decision entry.
2. Record the reasoning behind the decision.
3. Update its status.
4. Document important consequences for the architecture or implementation.

New decisions should be added only when they have actually been discussed and agreed upon.