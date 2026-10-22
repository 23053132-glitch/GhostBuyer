import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from collections import Counter
from dotenv import load_dotenv
from smolagents import CodeAgent, OpenAIModel, ToolCallingAgent, tool


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
    api_url = os.getenv("MERCHANT_API_URL")
    if not api_url:
        raise ValueError("MERCHANT_API_URL is not configured.")

    data = fetch_json(f"{api_url}/merchants/needs-refresh")

    if not isinstance(data, list):
        raise ValueError("Expected a list of merchants.")

    return data


@tool
def collect_merchant_order_evidence(merchant_id: str) -> dict:
    """
    Fetch a merchant's orders and calculate order-performance metrics.

    Args:
        merchant_id: The merchant's unique identifier.

    Returns:
        Order counts and calculated performance rates.
    """
    api_url = os.getenv("MERCHANT_API_URL")
    if not api_url:
        raise ValueError("MERCHANT_API_URL is not configured.")

    orders = fetch_json(
        f"{api_url}/merchants/{merchant_id}/orders"
    )

    if not isinstance(orders, list):
        raise ValueError("Expected a list of orders.")

    statuses = Counter(
        str(order.get("status", "unknown")).strip().lower()
        for order in orders
    )

    total = len(orders)
    fulfilled = statuses["fulfilled"]
    returned = statuses["returned"]
    pending = statuses["pending"]
    cancelled = statuses["cancelled"]

    known_statuses = {"fulfilled", "returned", "pending", "cancelled"}
    unknown = sum(
        count
        for status, count in statuses.items()
        if status not in known_statuses
    )

    # Only use terminal statuses for these rates.
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