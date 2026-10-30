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



---

## D-007: Use Hugging Face for AI Model Access and Agent Development

**Status:** Accepted

### Context
The application requires an AI backend capable of analyzing merchant performance, retrieving relevant order and product information, and executing scoring workflows through AI agents. The project also aims to minimize development complexity and inference costs during the hackathon.

### Decision
Use Hugging Face's ecosystem for convenient access to AI models and agent-development resources. Integrate Hugging Face-compatible models with the Python AI backend and use `smolagents` for agent orchestration.

The implementation will prioritize models and configurations that can be used within the project's cost constraints.

### Reasoning
- Provides convenient access to a variety of AI models.
- Simplifies experimentation with different models during development.
- Integrates with the Python ecosystem and the `smolagents` framework.
- Supports rapid prototyping of AI workflows without requiring the development of a custom agent framework.
- Allows model selection to evolve based on tool-calling capabilities, reasoning quality, inference latency, and resource requirements.

### Scope
Hugging Face will be used as part of the AI development and model-access workflow. The specific model, inference provider, and deployment configuration remain subject to implementation requirements and cost constraints.

The use of Hugging Face does not require all inference to run on Hugging Face-hosted infrastructure. The final model-hosting approach may depend on the selected model and its compatibility with the agent framework.

---

## D-008: Use CodeAgent for Merchant Scoring and Tool-Orchestrated Analysis

**Status:** Accepted

### Context
The application requires an AI-driven merchant scoring workflow that gathers merchant information, retrieves associated order data, analyzes relevant performance metrics, and produces a rating with supporting reasoning.

The workflow requires more than a single LLM response. It involves multiple data-retrieval operations and the interpretation of structured evidence.

### Decision
Use `CodeAgent` from `smolagents` as the primary agent type for the merchant-scoring workflow, subject to the capabilities of the selected LLM.

The agent will use explicitly defined tools to retrieve merchant details and associated order information. It will then analyze the available evidence and produce a merchant rating with an explanation.

### Proposed Workflow
1. Retrieve the merchant's details, including merchant tenure and previous rating where available.
2. Retrieve the merchant's orders and relevant order-performance information.
3. Retrieve product information associated with those orders, including product quantities where required.
4. Analyze the collected evidence using the project's defined scoring criteria.
5. Consider the relative importance of merchant tenure, previous ratings, order performance, and product sales.
6. Generate the merchant's rating and a supporting explanation based on the available evidence.
7. Return a structured result containing the merchant identifier, assigned rating, and reasoning.

### Reasoning
- `CodeAgent` allows an agent to coordinate multi-step workflows using executable Python code.
- Python is well suited to processing structured data and calculating performance metrics.
- Explicit tools separate data retrieval from analysis.
- The agent can combine evidence gathered from multiple application endpoints.
- The workflow can be extended as additional scoring criteria become available.

### Important Implementation Considerations
- The agent must use actual retrieved data rather than inventing merchant or order information.
- Numerical metrics should be calculated using clearly defined rules wherever possible.
- The scoring criteria and weights should be documented and validated independently of the agent's natural-language explanation.
- Missing or incomplete data must be handled explicitly.
- Tool access must be restricted to the operations required by the scoring workflow.
- Agent-generated ratings should be validated against the expected rating format and allowed range before being persisted or returned to the application.

### Scope
This decision covers the AI agent's orchestration and analysis responsibilities. The Python backend will expose the necessary tools for retrieving merchant and order data from the main application.

The exact scoring formula, criterion weights, and validation rules may be refined as the implementation evolves.

---

## D-009: Extend the Database Schema to Support Product-Level Order Analysis

**Status:** Accepted

### Context
The merchant-scoring workflow requires evidence of merchant performance, including order activity and product sales.

The existing data model must expose sufficient information to associate orders with their products and determine the quantities associated with those products. Without these relationships and fields, the AI backend cannot reliably retrieve the evidence required for product-level scoring.

### Decision
Extend the Prisma/PostgreSQL database schema with the following changes:

1. **Add product identification to orders:** Introduce the necessary product identifier field or relationship in the order-related data model so that an order can be associated with the relevant product.
2. **Add quantity to products:** Introduce a `quantity` field in the product data model to represent the quantity information required by the application's product and scoring workflows.

The schema changes must be reflected in the Prisma models, database migrations, and relevant application endpoints.

### Reasoning
- Product identifiers allow order records to be associated with the relevant products.
- Quantity information provides additional evidence for product-level analysis.
- The relationships enable the application to retrieve the data required for merchant scoring.
- Explicit schema fields reduce dependence on unstructured data or assumptions made by the AI agent.
- A consistent relational model improves data integrity and makes scoring inputs easier to validate.

### Implementation Considerations
- Define the appropriate relationship between orders and products according to the actual checkout and order-item model.
- If an order can contain multiple products, use an order-item or line-item model containing the order ID, product ID, and purchased quantity rather than assuming that an order has only one product.
- Clarify the meaning of the product `quantity` field. Current inventory quantity and quantity sold are different metrics and should not be treated interchangeably.
- If product sales are used for scoring, calculate sold quantities from completed or otherwise eligible order items, applying the application's order-status rules.
- Preserve referential integrity between orders, order items, and products.
- Handle existing records when introducing new required fields, using an appropriate migration and backfill strategy.
- Update API responses so that the Python AI backend can retrieve the required fields.

### Scope
These changes support the data requirements of the AI scoring workflow. They do not, by themselves, define the merchant-scoring formula or establish that inventory quantity is equivalent to sales volume.

---

## Decision Review Process

When a major technical or product decision is made or changed:

1. Update the relevant decision entry.
2. Record the reasoning behind the decision.
3. Update its status.
4. Document important consequences for the architecture or implementation.

New decisions should be added only when they have actually been discussed and agreed upon.