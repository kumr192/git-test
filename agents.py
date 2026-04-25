"""
Full-mesh multi-agent system — every agent can talk to every other agent.

Topology:
  MasterAgent  ←→  WeatherAgent  ←→  CurrencyAgent
       ↑_________________↑_________________↑

Depth guard prevents infinite loops: peer calls set depth=1, and
agents called at depth=1 cannot call peers (only their own data tools).
"""

import json
import requests
import anthropic
from dotenv import load_dotenv
load_dotenv()

client = anthropic.Anthropic()
MODEL = "claude-opus-4-7"

# ──────────────────────────────────────────────────────────────────────────────
# Live data sources
# ──────────────────────────────────────────────────────────────────────────────

_WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Foggy", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
    75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}


def _fetch_weather(city: str) -> dict:
    try:
        geo = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "en", "format": "json"},
            timeout=10,
        ).json()
        if not geo.get("results"):
            return {"city": city, "error": "City not found"}
        loc = geo["results"][0]
        wx = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "timezone": "auto",
            },
            timeout=10,
        ).json()
        cur = wx["current"]
        return {
            "city": loc["name"],
            "country": loc.get("country", ""),
            "temp_c": cur["temperature_2m"],
            "humidity_pct": cur["relative_humidity_2m"],
            "wind_kph": cur["wind_speed_10m"],
            "condition": _WMO_CODES.get(cur["weather_code"], "Unknown"),
        }
    except Exception as e:
        return {"city": city, "error": str(e)}


def _fetch_exchange_rate(from_currency: str, to_currency: str) -> dict:
    f, t = from_currency.upper(), to_currency.upper()
    if f == t:
        return {"from": f, "to": t, "rate": 1.0}
    try:
        data = requests.get(
            f"https://api.frankfurter.app/latest",
            params={"from": f, "to": t},
            timeout=10,
        ).json()
        if "rates" not in data:
            return {"from": f, "to": t, "error": data.get("message", "Rate not available")}
        return {"from": f, "to": t, "rate": data["rates"][t], "date": data["date"]}
    except Exception as e:
        return {"from": f, "to": t, "error": str(e)}


# ──────────────────────────────────────────────────────────────────────────────
# Tool schema builders  (peer tools are only added at depth 0)
# ──────────────────────────────────────────────────────────────────────────────

_TOOL_GET_WEATHER = {
    "name": "get_weather",
    "description": "Retrieve current weather conditions for a city.",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "City name, e.g. 'Tokyo'"},
        },
        "required": ["city"],
    },
}

_TOOL_GET_RATE = {
    "name": "get_exchange_rate",
    "description": "Get the current exchange rate between two currencies.",
    "input_schema": {
        "type": "object",
        "properties": {
            "from_currency": {"type": "string", "description": "Source currency ISO code, e.g. 'USD'"},
            "to_currency":   {"type": "string", "description": "Target currency ISO code, e.g. 'EUR'"},
        },
        "required": ["from_currency", "to_currency"],
    },
}

_TOOL_ASK_WEATHER_AGENT = {
    "name": "ask_weather_agent",
    "description": (
        "Ask the weather specialist a question. Use this when you need weather data "
        "to give a more complete answer (e.g. travel advice combining rates + weather)."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The weather question to send."},
        },
        "required": ["query"],
    },
}

_TOOL_ASK_CURRENCY_AGENT = {
    "name": "ask_currency_agent",
    "description": (
        "Ask the currency specialist a question. Use this when you need exchange-rate data "
        "to give a more complete answer (e.g. travel advice combining weather + rates)."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The currency question to send."},
        },
        "required": ["query"],
    },
}

_TOOL_QUERY_WEATHER = {
    "name": "query_weather_agent",
    "description": "Forward a weather question to the weather specialist.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The weather question to delegate."},
        },
        "required": ["query"],
    },
}

_TOOL_QUERY_CURRENCY = {
    "name": "query_currency_agent",
    "description": "Forward a currency question to the currency specialist.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The currency question to delegate."},
        },
        "required": ["query"],
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Weather Agent
# ──────────────────────────────────────────────────────────────────────────────

def run_weather_agent(query: str, depth: int = 0) -> str:
    """
    Weather specialist.
    At depth=0 it can also consult the currency agent for richer answers.
    At depth=1 (called by a peer) it only uses its own data tool.
    """
    tools = [_TOOL_GET_WEATHER]
    peer_note = ""
    if depth == 0:
        tools.append(_TOOL_ASK_CURRENCY_AGENT)
        peer_note = (
            "You also have ask_currency_agent — use it if knowing exchange rates "
            "would make your answer more useful (e.g. travel cost questions)."
        )

    system = (
        "You are a weather specialist. "
        "Always call get_weather before answering. "
        "Include temperature (°C and °F), conditions, and humidity. "
        + peer_note
    )

    messages: list = [{"role": "user", "content": query}]

    while True:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            tools=tools,
            messages=messages,
        )

        if resp.stop_reason == "end_turn":
            return next(b.text for b in resp.content if b.type == "text")

        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "get_weather":
                result = json.dumps(_fetch_weather(block.input["city"]))
            elif block.name == "ask_currency_agent" and depth == 0:
                print("  WeatherAgent consulting CurrencyAgent...")
                result = run_currency_agent(block.input["query"], depth=1)
            else:
                result = "Tool not available at this depth."
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result or "No result."})
        if tool_results:
            messages.append({"role": "user", "content": tool_results})


# ──────────────────────────────────────────────────────────────────────────────
# Currency Agent
# ──────────────────────────────────────────────────────────────────────────────

def run_currency_agent(query: str, depth: int = 0) -> str:
    """
    Currency specialist.
    At depth=0 it can also consult the weather agent for richer answers.
    At depth=1 (called by a peer) it only uses its own data tool.
    """
    tools = [_TOOL_GET_RATE]
    peer_note = ""
    if depth == 0:
        tools.append(_TOOL_ASK_WEATHER_AGENT)
        peer_note = (
            "You also have ask_weather_agent — use it if knowing the weather "
            "would make your answer more useful (e.g. travel planning questions)."
        )

    system = (
        "You are a currency exchange specialist. "
        "Always call get_exchange_rate before answering. "
        "Show the rate and calculate converted amounts when given. "
        + peer_note
    )

    messages: list = [{"role": "user", "content": query}]

    while True:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            tools=tools,
            messages=messages,
        )

        if resp.stop_reason == "end_turn":
            return next(b.text for b in resp.content if b.type == "text")

        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "get_exchange_rate":
                result = json.dumps(_fetch_exchange_rate(block.input["from_currency"], block.input["to_currency"]))
            elif block.name == "ask_weather_agent" and depth == 0:
                print("  CurrencyAgent consulting WeatherAgent...")
                result = run_weather_agent(block.input["query"], depth=1)
            else:
                result = "Tool not available at this depth."
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result or "No result."})
        if tool_results:
            messages.append({"role": "user", "content": tool_results})


# ──────────────────────────────────────────────────────────────────────────────
# Master (Orchestrator) Agent
# ──────────────────────────────────────────────────────────────────────────────

_MASTER_SYSTEM = """\
You are a smart routing assistant with two specialist agents:

• query_weather_agent  — weather specialist (can also consult currency agent internally)
• query_currency_agent — currency specialist (can also consult weather agent internally)

Rules:
1. Analyse the user's request and call the relevant agent(s).
2. The specialists can talk to each other if needed — you don't need to coordinate that.
3. Combine the responses into a single clear answer.
4. Never answer weather or currency questions from your own knowledge — always delegate.
"""


def run_master_agent(user_query: str) -> tuple[str, list[str]]:
    """Orchestrator that routes to sub-agents; sub-agents can also call each other."""
    messages: list = [{"role": "user", "content": user_query}]
    tools = [_TOOL_QUERY_WEATHER, _TOOL_QUERY_CURRENCY]
    agents_used: list[str] = []

    while True:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            thinking={"type": "adaptive"},
            system=_MASTER_SYSTEM,
            tools=tools,
            messages=messages,
        )

        if resp.stop_reason == "end_turn":
            return next(b.text for b in resp.content if b.type == "text"), agents_used

        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "query_weather_agent":
                agents_used.append("WeatherAgent")
                result = run_weather_agent(block.input["query"], depth=0)
            elif block.name == "query_currency_agent":
                agents_used.append("CurrencyAgent")
                result = run_currency_agent(block.input["query"], depth=0)
            else:
                result = f"Unknown tool: {block.name}"
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
        messages.append({"role": "user", "content": tool_results})


# ──────────────────────────────────────────────────────────────────────────────
# Interactive chat
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Multi-Agent Mesh (weather ↔ currency ↔ master)")
    print("Agents can consult each other. Type 'quit' to exit.")
    print(f"{'─' * 64}")

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "bye"}:
            print("Goodbye!")
            break

        print("\nThinking...", flush=True)
        try:
            answer, agents_used = run_master_agent(user_input)
            print(f"\n Agents used: {', '.join(agents_used)}", flush=True)
            print(f"\n{'─' * 64}", flush=True)
            print(f"\nAnswer:\n{answer}\n", flush=True)
        except Exception as e:
            print(f"\nError: {e}\n", flush=True)
