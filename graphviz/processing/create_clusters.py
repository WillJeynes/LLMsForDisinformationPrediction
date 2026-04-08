import csv
import json
import uuid
from typing import List, Dict

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm


INPUT_CSV = "../../data/dataset-dev.csv"
OUTPUT_JSON = "../../data/clustered_output.json"
MODEL_NAME = "all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.55

def generate_guid():
    return str(uuid.uuid4())


def read_csv(file_path: str):
    data = []

    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in tqdm(reader, desc="Reading CSV"):
            row = [r.strip() for r in row if r.strip()]
            if not row:
                continue

            claim = row[0]
            events = row[1:]

            claim_id = generate_guid()

            event_objects = []
            for e in events:
                event_objects.append({
                    "id": generate_guid(),
                    "text": e
                })

            data.append({
                "claim": {
                    "id": claim_id,
                    "text": claim
                },
                "events": event_objects
            })

    return data

def embed_texts(model, texts: List[str], desc="Embedding"):
    embeddings = []
    for t in tqdm(texts, desc=desc):
        emb = model.encode(t, normalize_embeddings=True)
        embeddings.append(emb)
    return np.array(embeddings)


def cluster_embeddings(embeddings, threshold=0.75):
    distance_matrix = 1 - cosine_similarity(embeddings)

    clustering = AgglomerativeClustering(
        metric='precomputed',
        linkage='average',
        distance_threshold=1 - threshold,
        n_clusters=None
    )

    labels = clustering.fit_predict(distance_matrix)
    return labels

def main():
    print("Loading model...")
    model = SentenceTransformer(MODEL_NAME)

    data = read_csv(INPUT_CSV)

    claim_texts, claim_ids = [], []
    event_texts, event_ids = [], []

    raw_links = []  # temporary for cluster mapping

    for entry in tqdm(data, desc="Processing rows"):
        claim = entry["claim"]
        claim_ids.append(claim["id"])
        claim_texts.append(f"Claim: {claim['text']}")

        for event in entry["events"]:
            event_ids.append(event["id"])
            event_texts.append(f"Event: {event['text']}")

            raw_links.append({
                "claim_id": claim["id"],
                "event_id": event["id"]
            })

    print("Embedding claims...")
    claim_embeddings = embed_texts(model, claim_texts, desc="Claims")

    print("Embedding events...")
    event_embeddings = embed_texts(model, event_texts, desc="Events")

    print("Clustering claims...")
    claim_labels = cluster_embeddings(claim_embeddings, SIMILARITY_THRESHOLD)

    print("Clustering events...")
    event_labels = cluster_embeddings(event_embeddings, SIMILARITY_THRESHOLD)

    # Assign GUIDs to clusters
    claim_cluster_map = {}
    for label in set(claim_labels):
        claim_cluster_map[int(label)] = generate_guid()

    event_cluster_map = {}
    for label in set(event_labels):
        event_cluster_map[int(label)] = generate_guid()

    # Build cluster membership
    claim_clusters = {}
    for cid, label in zip(claim_ids, claim_labels):
        cluster_guid = claim_cluster_map[int(label)]
        claim_clusters.setdefault(cluster_guid, []).append(cid)

    event_clusters = {}
    for eid, label in zip(event_ids, event_labels):
        cluster_guid = event_cluster_map[int(label)]
        event_clusters.setdefault(cluster_guid, []).append(eid)

    # Build ONLY cluster-level links
    cluster_links = set()

    for link in raw_links:
        claim_label = int(claim_labels[claim_ids.index(link["claim_id"])])
        event_label = int(event_labels[event_ids.index(link["event_id"])])

        claim_cluster_guid = claim_cluster_map[claim_label]
        event_cluster_guid = event_cluster_map[event_label]

        cluster_links.add((claim_cluster_guid, event_cluster_guid))

    cluster_links = [
        {"claim_cluster_id": c, "event_cluster_id": e}
        for c, e in cluster_links
    ]

    output = {
        "claims": [
            {"id": cid, "text": txt.replace("Claim: ", "")}
            for cid, txt in zip(claim_ids, claim_texts)
        ],
        "events": [
            {"id": eid, "text": txt.replace("Event: ", "")}
            for eid, txt in zip(event_ids, event_texts)
        ],
        "claim_clusters": [
            {"cluster_id": k, "members": v}
            for k, v in claim_clusters.items()
        ],
        "event_clusters": [
            {"cluster_id": k, "members": v}
            for k, v in event_clusters.items()
        ],
        "cluster_links": cluster_links
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Saved output to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
