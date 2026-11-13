# Airwise — flight outlook

A responsive US flight delay outlook with a trained prediction model, route map, typical flight time, and destination-local arrival estimate.

## Run locally

Install the model dependencies and start the combined website and prediction API:

```sh
python3 -m pip install -r requirements-model.txt
python3 predict_api.py
```

Then open <http://127.0.0.1:4173>. The form sends airline, route, local departure date and time, and route distance to `POST /predict`. The server returns a `delay_probability` between 0 and 1. The model artifact is `flight_delay_model.joblib`.

## Model

The model predicts whether departure delay is at least 15 minutes. It was trained on 2,336,665 flights and evaluated on 585,691 later flights, using a chronological cutoff of 2022-10-21. Test ROC AUC was 0.678 and average precision was 0.379. At a 0.5 threshold, precision was 51.5% and recall was 8.6%; the website displays the model probability rather than a yes/no threshold decision. Full metrics are in `model_metrics.json`.

Inputs are airline, origin, destination, date, scheduled departure time, and distance. Actual operation times, delay outcomes, and recorded delay causes are excluded from model inputs. Estimates use historical 2019–2023 data and do not include live airline, weather, or traffic conditions.

`history.json` continues to supply airline names and typical route durations/distances for the existing interface. `build_stats.py` recreates it when `flights_sample_3m.csv` is beside the script.
