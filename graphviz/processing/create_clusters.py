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
SIMILARITY_THRESHOLD = 0.65

def generate_guid():
    return str(uuid.uuid4())


def read_csv(file_path: str):
    """
    Expected format per row:
    [claim, event1, event2, event3, ...]
    """
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


def cluster_embeddings(embeddings, threshold=0.75, desc="Clustering"):
    """
    Uses Agglomerative clustering with cosine distance
    """
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

    # Collect all claims and events separately
    claim_texts = []
    claim_ids = []

    event_texts = []
    event_ids = []

    links = []  # claim -> events

    for entry in tqdm(data, desc="Processing rows"):
        claim = entry["claim"]
        claim_ids.append(claim["id"])

        # Context-enhanced claim
        claim_texts.append(f"Claim: {claim['text']}")

        for event in entry["events"]:
            event_ids.append(event["id"])

            # Context-enhanced event
            event_texts.append(f"Event: {event['text']}")

            links.append({
                "claim_id": claim["id"],
                "event_id": event["id"]
            })

    # Embed
    print("Embedding claims...")
    claim_embeddings = embed_texts(model, claim_texts, desc="Claims")

    print("Embedding events...")
    event_embeddings = embed_texts(model, event_texts, desc="Events")

    # Cluster
    print("Clustering claims...")
    claim_labels = cluster_embeddings(claim_embeddings, SIMILARITY_THRESHOLD)

    print("Clustering events...")
    event_labels = cluster_embeddings(event_embeddings, SIMILARITY_THRESHOLD)

    # Build cluster structures
    claim_clusters: Dict[int, List[str]] = {}
    for cid, label in zip(claim_ids, claim_labels):
        claim_clusters.setdefault(int(label), []).append(cid)

    event_clusters: Dict[int, List[str]] = {}
    for eid, label in zip(event_ids, event_labels):
        event_clusters.setdefault(int(label), []).append(eid)

    # Build cluster-level links
    cluster_links = []
    for link in links:
        claim_cluster = int(claim_labels[claim_ids.index(link["claim_id"])])
        event_cluster = int(event_labels[event_ids.index(link["event_id"])])

        cluster_links.append({
            "claim_cluster": claim_cluster,
            "event_cluster": event_cluster
        })

    # Output structure
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
            {"cluster_id": int(k), "members": v}
            for k, v in claim_clusters.items()
        ],
        "event_clusters": [
            {"cluster_id": int(k), "members": v}
            for k, v in event_clusters.items()
        ],
        "links": links,
        "cluster_links": cluster_links
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Saved output to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
