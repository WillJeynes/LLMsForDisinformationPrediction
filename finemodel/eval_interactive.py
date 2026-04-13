import requests
API_URL = "http://localhost:8000/compare"

def call_api(headline):
    try:
        response = requests.post(
            API_URL,
            json={"event": headline}
        )
        response.raise_for_status()
        data = response.json()

        return data["lora_output"]

    except Exception as e:
        print(f"[ERROR] API failed for: {headline}")
        print(e)
        return None, None


while(True):
    headline = input()
    if (headline == "none"):
        break
    results = call_api(headline)

    for result in results:
        print(result.split("\n")[0])