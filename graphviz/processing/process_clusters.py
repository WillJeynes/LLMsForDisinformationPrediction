import json
from collections import defaultdict, deque

# -------------------------------
# CONFIG
# -------------------------------
INPUT_FILE = "../../data/clustered_output.json"        # Your original JSON
OUTPUT_FILE = "../../data/clustered_output2.json"  # Output JSON file

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
# Build graph from cluster links
# -------------------------------
graph = defaultdict(set)
for link in data.get("cluster_links", []):
    c_id = link["claim_cluster_id"]
    e_id = link["event_cluster_id"]
    graph[c_id].add(e_id)
    graph[e_id].add(c_id)

# Make sure all clusters appear in graph (even isolated ones)
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

# -------------------------------
# Output stats
# -------------------------------
num_components = len(large_components)
num_nodes = sum(len(c) for c in large_components)

print("Connected components (size > 8):", num_components)
print("Total clusters in those components:", num_nodes)

# -------------------------------
# Prepare lookup tables
# -------------------------------
claim_lookup = {c["id"]: c["text"] for c in data["claims"]}
event_lookup = {e["id"]: e["text"] for e in data["events"]}

claim_cluster_map = {c["cluster_id"]: c["members"] for c in data["claim_clusters"]}
event_cluster_map = {e["cluster_id"]: e["members"] for e in data["event_clusters"]}

def extract_texts(component):
    texts = []
    for cid in component:
        if cid in claim_cluster_map:
            texts.extend([claim_lookup[mid] for mid in claim_cluster_map[cid] if mid in claim_lookup])
        elif cid in event_cluster_map:
            texts.extend([event_lookup[mid] for mid in event_cluster_map[cid] if mid in event_lookup])
    return texts

# -------------------------------
# Optional: Generate titles
# -------------------------------
user_input = input("Generate titles for each component? (y/n): ")

if user_input.lower() == "y":
    output = []

    for i, comp in enumerate(large_components):
        texts = extract_texts(comp)

        # Show a few sample texts
        print(f"\nComponent {i} sample texts:")
        for t in texts[:5]:
            print("-", t)

        # Ask user for a 3-5 word title (could be automated with OpenAI API)
        title = input("Enter 3-5 word title: ")

        output.append({
            "component_id": i,
            "cluster_ids": list(comp),
            "title": title
        })

    # Save JSON
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Saved cluster titles to {OUTPUT_FILE}")
else:
    print("No titles generated. Script finished.")