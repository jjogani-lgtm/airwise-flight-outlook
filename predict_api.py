"""Serve Airwise and its trained-model prediction endpoint."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import math
from datetime import date
from urllib.parse import urlsplit
from pathlib import Path

import joblib
import pandas as pd

MODEL = joblib.load(Path(__file__).with_name("flight_delay_model.joblib"))


def features(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request must be a JSON object")
    flight_date = pd.Timestamp(date.fromisoformat(payload["date"]))
    for key in ("origin", "destination"):
        if not isinstance(payload[key], str) or len(payload[key]) != 3 or not payload[key].isascii() or not payload[key].isalpha():
            raise ValueError("Airport codes must contain three ASCII letters")
    if payload["origin"].upper() == payload["destination"].upper():
        raise ValueError("Origin and destination must differ")
    if not isinstance(payload["airline"], str) or not 1 <= len(payload["airline"].strip()) <= 80:
        raise ValueError("Airline must contain 1–80 characters")
    distance = float(payload["distance"])
    if not math.isfinite(distance) or not 0 < distance <= 15000:
        raise ValueError("Distance must be finite and between 0 and 15000 miles")
    if isinstance(payload["scheduled_departure_time"], bool) or str(payload["scheduled_departure_time"]) != str(int(payload["scheduled_departure_time"])):
        raise ValueError("Departure time must be an integer in HHMM format")
    hhmm = int(payload["scheduled_departure_time"])
    row = pd.DataFrame([{
        "AIRLINE_CODE": str(payload["airline"]).upper(),
        "ORIGIN": str(payload["origin"]).upper(),
        "DEST": str(payload["destination"]).upper(),
        "YEAR": flight_date.year,
        "MONTH": flight_date.month,
        "DAY_OF_WEEK": flight_date.dayofweek,
        "DEP_HOUR": hhmm // 100,
        "DEP_MINUTE": hhmm % 100,
        "DISTANCE": float(payload["distance"]),
    }])
    if not 0 <= hhmm <= 2359 or hhmm % 100 >= 60:
        raise ValueError("scheduled_departure_time must be a valid local HHMM time")
    if row.loc[0, "DISTANCE"] < 0:
        raise ValueError("distance must be nonnegative")
    return row


class Handler(SimpleHTTPRequestHandler):
    PUBLIC_FILES = {"/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/styles.css": "styles.css", "/history.json": "history.json", "/model_metrics.json": "model_metrics.json", "/route-land.svg": "route-land.svg"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).resolve().parent), **kwargs)

    def send_head(self):
        if urlsplit(self.path).path not in self.PUBLIC_FILES:
            self.send_error(404)
            return None
        return super().send_head()

    def do_POST(self):
        if self.path != "/predict":
            return self.send_json(404, {"error": "Use POST /predict"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                return self.send_json(413, {"error": "Request body must be between 1 and 8192 bytes"})
            payload = json.loads(self.rfile.read(length))
            probability = float(MODEL.predict_proba(features(payload))[0, 1])
            return self.send_json(200, {"delay_probability": probability,
                                        "prediction": probability >= 0.5,
                                        "threshold": 0.5})
        except (KeyError, TypeError, ValueError, OverflowError, json.JSONDecodeError) as exc:
            return self.send_json(400, {"error": str(exc)})

    def send_json(self, status, obj):
        data = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    print("Airwise listening at http://127.0.0.1:4173")
    ThreadingHTTPServer(("127.0.0.1", 4173), Handler).serve_forever()
