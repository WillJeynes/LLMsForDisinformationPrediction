# AI models for identifying trigger events in disinformation analysis
Final Dissertation Submission Repository - Future work with created dataset

## Graph Viz
A way to visualise the connections between claims and trigger events
Visible here: [https://jillweynes.github.io/LLMsForDisinformationPrediction-GraphVizBuilt/](https://jillweynes.github.io/LLMsForDisinformationPrediction-GraphVizBuilt/)

## Repository Structure
```
├── run.sh                          # Bash script to run project elements from one place
├── graphviz
|   ├── frontend                    # React + Parcel + react-force-graph frontend to visualise results
|   └── processing                  # Python scripts to generate clusters and titles
└── data/                           # Holder from project data
    ├── dataset.jsonl               # Collated dataset - in full format
    └── dataset.csv                 # Collated dataset - in CSV format
```
