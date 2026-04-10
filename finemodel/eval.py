import requests
import json
import csv
import os
from datetime import datetime, timedelta
import feedparser

# -----------------------------
# Config
# -----------------------------
RSS_URL = "https://feeds.skynews.com/feeds/rss/world.xml"

HEADLINES_FILE = "../data/headlines.json"
RESULTS_FILE = "../data/results.json"

API_URL = "http://localhost:8000/compare"


# -----------------------------
# Fetch BBC headlines (only if not cached)
# -----------------------------
def fetch_and_cache_headlines():
    if os.path.exists(HEADLINES_FILE):
        print("[INFO] Using cached headlines")
        with open(HEADLINES_FILE, "r") as f:
            return json.load(f)

    print("[INFO] Fetching new headlines from BBC")

    feed = feedparser.parse(RSS_URL)
    headlines = []

    for entry in feed.entries:
        headlines.append({
            "title": entry.title,
        })

    # save headlines snapshot
    with open(HEADLINES_FILE, "w") as f:
        json.dump(headlines, f, indent=2)

    return headlines


# -----------------------------
# Save results cache
# -----------------------------
def save_results(results):
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)


# -----------------------------
# Call API
# -----------------------------
def call_api(headline):
    try:
        response = requests.post(
            API_URL,
            json={"event": headline}
        )
        response.raise_for_status()
        data = response.json()

        return data["base_output"], data["lora_output"]

    except Exception as e:
        print(f"[ERROR] API failed for: {headline}")
        print(e)
        return None, None


# -----------------------------
# Main pipeline
# -----------------------------
def run():
    headlines = fetch_and_cache_headlines()
    print(f"[INFO] {len(headlines)} headlines loaded")

    results = {}

    for item in headlines:
        title = item["title"]

        print(f"[PROCESSING] {title}")

        base_out, lora_out = call_api(title)

        results[title] = {
            "base": base_out,
            "lora": lora_out
        }

    save_results(results)


# -----------------------------
# Run
# -----------------------------
if __name__ == "__main__":
    run()