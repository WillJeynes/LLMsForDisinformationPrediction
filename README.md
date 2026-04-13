# AI models for identifying trigger events in disinformation analysis
Final Dissertation Submission Repository - Future work with created dataset

## Dataset link
[https://huggingface.co/datasets/WillJeynes/LLMsForDisinformationAnalysis-Dataset](https://huggingface.co/datasets/WillJeynes/LLMsForDisinformationAnalysis-Dataset)

## Finetuned Model
Tinetuning a LLM to better predict possible disinformation claims arising from world event

Kind of the opposite of dataset

Stats available [here](/finemodel/)

Final LoRa version available here: [https://huggingface.co/WillJeynes/LLMsForDisinformationPrediction](https://huggingface.co/WillJeynes/LLMsForDisinformationPrediction)

## Graph Viz
A way to visualise the connections between claims and trigger events

Visible here: [https://jillweynes.github.io/LLMsForDisinformationPrediction-GraphVizBuilt/](https://jillweynes.github.io/LLMsForDisinformationPrediction-GraphVizBuilt/)

## Repository Structure
```
├── query_model.py                  # call final finetuned LLM from hugging face
├── finemodel/
|   ├── eval*.py                    # Call APIs
|   ├── lora*.py, full.py           # Train models against dataset
|   └── q_*.py                      # Expose trained models as API
├── graphviz/
|   ├── frontend/                   # React + Parcel + react-force-graph frontend to visualise results
|   └── processing/                 # Python scripts to generate clusters and titles
└── data/                           # Holder from project data
    ├── dataset.jsonl               # Collated dataset - in full format
    └── dataset.csv                 # Collated dataset - in CSV format
```
