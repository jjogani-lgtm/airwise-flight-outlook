# Airwise — flight outlook

A responsive US flight delay outlook with a historical estimate, route map, typical flight time, and destination-local arrival estimate.

## Run locally

Run `python3 -m http.server 4173` from this folder, then open `http://localhost:4173`. The browser loads the compact `history.json` file beside the page.

## Historical estimate

The prototype uses smoothed historical cohort rates from the supplied 2019–2023 flight dataset (2.92 million usable departures). It estimates the chance of a departure delay of 15 minutes or more from airline, route, scheduled departure hour, month, and weekday. It does not use post-departure fields. This is a historical baseline, not a connected trained ML model or a live flight status feed.

`build_stats.py` recreates the compact history file when the source `flights_sample_3m.csv` is placed beside it. The original CSV is not included in this repository.
