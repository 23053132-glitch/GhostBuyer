import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from collections import Counter
from dotenv import load_dotenv
from smolagents import CodeAgent, OpenAIModel, ToolCallingAgent, tool

from phoenix.otel import register
from openinference.instrumentation.smolagents import SmolagentsInstrumentor

# Register Phoenix as the trace destination
tracer_provider = register(
    project_name="paypal-hackathon-manager-agent"
)

# Instrument smolagents
SmolagentsInstrumentor().instrument(
    tracer_provider=tracer_provider
)


def fetch_json(url: str) -> dict | list:
    request = Request(
        url,
        headers={"Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"API request failed: {url}") from exc


@tool
def fetch_merchants_to_refresh() -> list[dict]:
    """
    Fetch merchants whose reliability scores need refreshing.

    Returns:
        A list of merchant records, each containing a merchant ID.
    """
    api_url = os.getenv("API_URL")
    if not api_url:
        raise ValueError("API_URL is not configured.")

    data = fetch_json(f"{api_url}/merchants/getMerchantToRefresh")

    if not isinstance(data, list):
        raise ValueError("Expected a list of merchants.")

    return data


@tool
def collect_merchant_order_evidence(merchant_id: str) -> dict:
    """
    Fetch a merchant's orders and calculate order-performance metrics.

    Args:
        merchant_id: The unique ID of the merchant whose orders
            need to be fetched and analyzed.

    Returns:
        A dictionary containing order counts, product quantities and calculated
        performance rates for the merchant.
    """
    api_url = os.getenv("API_URL")
    if not api_url:
        raise ValueError("API_URL is not configured.")

    orders = fetch_json(
        f"{api_url}/orders/getOrdersFromMerchantId?merchantId={merchant_id}"
    )

    if not isinstance(orders, list):
        raise ValueError("Expected a list of orders.")

    statuses = Counter(
        str(order.get("orderStatus", "unknown")).strip().lower()
        for order in orders
    )

    # Count orders and product units separately.
    total = len(orders)
    fulfilled = statuses["delivered"]
    returned = statuses["returned"]
    pending = statuses["pending"]
    cancelled = statuses["cancelled"]

    known_statuses = {"delivered", "returned", "pending", "cancelled"}
    unknown = sum(
        count
        for status, count in statuses.items()
        if status not in known_statuses
    )

    # Sum product quantities for each order status.
    quantities = Counter()

    for order in orders:
        status = str(
            order.get("orderStatus", "unknown")
        ).strip().lower()

        quantity = order.get("quantity", 0)

        if (
            isinstance(quantity, int)
            and not isinstance(quantity, bool)
            and quantity >= 0
        ):
            quantities[status] += quantity

    total_products = sum(quantities.values())

    fulfilled_products = quantities["delivered"]
    returned_products = quantities["returned"]
    cancelled_products = quantities["cancelled"]
    pending_products = quantities["pending"]

    resolved = fulfilled + returned + cancelled

    return {
        "merchantId": merchant_id,
        "orderMetrics": {
            "totalOrders": total,
            "fulfilledOrders": fulfilled,
            "returnedOrders": returned,
            "pendingOrders": pending,
            "cancelledOrders": cancelled,
            "unknownStatusOrders": unknown,
            "fulfillmentRate": (
                round(fulfilled / resolved, 4)
                if resolved else None
            ),
            "returnRate": (
                round(returned / resolved, 4)
                if resolved else None
            ),
        },
        "productMetrics": {
            "totalProducts": total_products,
            "deliveredProducts": fulfilled_products,
            "returnedProducts": returned_products,
            "cancelledProducts": cancelled_products,
            "pendingProducts": pending_products,
            "unknownStatusProducts": sum(
                quantity
                for status, quantity in quantities.items()
                if status not in known_statuses
            ),
        },
    }


def build_merchant_agent():
    skill_path = Path(__file__).with_name("skill.md")
    skill_instructions = skill_path.read_text(encoding="utf-8")

    model = OpenAIModel(
            model_id="gpt-oss:120b",
            api_base="https://ollama.com/v1",
            api_key=os.environ["OLLAMA_API_KEY"],
        )
    
    return CodeAgent(
        tools=[fetch_merchants_to_refresh, collect_merchant_order_evidence],
        model=model,
        additional_authorized_imports=["collections", "json", "pathlib", "urllib"],
        instructions=f"""
        {skill_instructions}

        ## Execution requirements

        1. Start by calling fetch_merchants_to_refresh().
        2. For every returned merchant, call
        collect_merchant_order_evidence(merchant_id).
        3. Evaluate every merchant using the formulas and rules in the skill.
        4. Do not invent unavailable product quantities, tenure, or other metrics.
        5. Return one valid JSON result per merchant.
        """,
    )

if __name__ == "__main__":
    load_dotenv()
    agent = build_merchant_agent()
    result = agent.run("Give merchant reliability scores.")
    print(json.dumps(result, indent=2))