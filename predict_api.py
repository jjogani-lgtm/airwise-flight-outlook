"""Serve Airwise and its trained-model prediction endpoint."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
from pathlib import Path

import joblib
import pandas as pd

MODEL = joblib.load(Path(__file__).with_name("flight_delay_model.joblib"))


def features(payload):
    flight_date = pd.Timestamp(payload["date"])
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
    def do_POST(self):
        if self.path != "/predict":
            return self.send_json(404, {"error": "Use POST /predict"})
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            probability = float(MODEL.predict_proba(features(payload))[0, 1])
            return self.send_json(200, {"delay_probability": probability,
                                        "prediction": probability >= 0.5,
                                        "threshold": 0.5})
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
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
