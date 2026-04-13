# Results

| Model/Technique                       | Coherence     | Plausibility  | Disinformation?   |
|---------------------------------------|---------------|---------------|-------------------|
| distilGPT2 + LoRa                     | 6/9           | 4/9           | 2/9
| miniLLama + LoRa                      | 7/9           | 6/9           | 5/9
| deepseek + LoRa                       | 7/9           | 5/9           | 5/9
| distilGPT2 (full training)            | 4/9           | 3/9           | 2/9
| miniLLama + LoRa (rotate q + multigen)| 8/9           | 8/9           | 7/9