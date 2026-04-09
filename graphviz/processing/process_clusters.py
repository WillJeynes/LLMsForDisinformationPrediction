import json
from collections import defaultdict, deque
from openai import OpenAI
from tqdm import tqdm 
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# -------------------------------
# CONFIG
# -------------------------------
INPUT_FILE = "../../data/clustered_output.json"        # Your original JSON
OUTPUT_FILE = "../../data/clustered_output2.json"  # Output JSON file
OPENAI_MODEL = "gpt-5-nano"


# -------------------------------
# Load data
# -------------------------------
with open(INPUT_FILE, "r") as f:
    data = json.load(f)

# -------------------------------
# Prepare cluster sets
# -------------------------------
claim_clusters = {c["cluster_id"] for c in data["claim_clusters"]}
event_clusters = {e["cluster_id"] for e in data["event_clusters"]}
all_clusters = claim_clusters.union(event_clusters)

# -------------------------------
# Build graph
# -------------------------------
graph = defaultdict(set)
for link in data.get("cluster_links", []):
    c_id = link["claim_cluster_id"]
    e_id = link["event_cluster_id"]
    graph[c_id].add(e_id)
    graph[e_id].add(c_id)

for cid in all_clusters:
    graph[cid] = graph[cid]

# -------------------------------
# Find connected components
# -------------------------------
visited = set()
components = []

for node in graph:
    if node not in visited:
        queue = deque([node])
        component = set()
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            component.add(current)
            for neighbor in graph[current]:
                if neighbor not in visited:
                    queue.append(neighbor)
        components.append(component)

# Filter components with size > 8
large_components = [c for c in components if len(c) > 8 and len(c) < 50]

print("Connected components (size > 8):", len(large_components))
print("Total clusters in those components:", sum(len(c) for c in large_components))

# -------------------------------
# Prepare lookups
# -------------------------------
claim_lookup = {c["id"]: c["text"] for c in data["claims"]}
event_lookup = {e["id"]: e["text"] for e in data["events"]}
claim_cluster_map = {c["cluster_id"]: c["members"] for c in data["claim_clusters"]}
event_cluster_map = {e["cluster_id"]: e["members"] for e in data["event_clusters"]}

def extract_texts_for_cluster(cluster_id):
    texts = []
    if cluster_id in claim_cluster_map:
        texts.extend([claim_lookup[mid] for mid in claim_cluster_map[cluster_id] if mid in claim_lookup])
    elif cluster_id in event_cluster_map:
        texts.extend([event_lookup[mid] for mid in event_cluster_map[cluster_id] if mid in event_lookup])
    return texts

# -------------------------------
# GPT-based title generation
# -------------------------------
def generate_title(texts):
    prompt = (
        "Summarize the following texts into a concise 2 - 4 word title that captures the main theme:\n\n"
        + "\n".join(f"- {t}" for t in texts) +
        "\n\nTitle:"
    )
    try:
        response = client.chat.completions.create(model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant who creates short, meaningful titles."},
            {"role": "user", "content": prompt}
        ])
        title = response.choices[0].message.content.strip()
        print(title)
        return title
    except Exception as e:
        print("Error generating title:", e)
        return "Untitled Cluster"

# -------------------------------
# Generate title per cluster with progress bar
# -------------------------------
clusters_in_large_components = [cid for comp in large_components for cid in comp]
output = []

print("\nGenerating GPT titles for clusters...")
for cluster_id in tqdm(clusters_in_large_components, desc="Clusters", ncols=100):
    texts = extract_texts_for_cluster(cluster_id)
    title = generate_title(texts)
    output.append({
        "cluster_id": cluster_id,
        "title": title
    })

# -------------------------------
# Save JSON
# -------------------------------
with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f, indent=2)

print(f"\nSaved cluster titles to {OUTPUT_FILE}")