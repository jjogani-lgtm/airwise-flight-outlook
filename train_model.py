"""Train and evaluate a pre-departure flight delay classifier."""
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (accuracy_score, average_precision_score,
                             brier_score_loss, precision_score, recall_score,
                             roc_auc_score, confusion_matrix)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "flights_sample_3m.csv"
MODEL = ROOT / "flight_delay_model.joblib"
REPORT = ROOT / "model_metrics.json"

CAT = ["AIRLINE_CODE", "ORIGIN", "DEST"]
NUM = ["YEAR", "MONTH", "DAY_OF_WEEK", "DEP_HOUR", "DEP_MINUTE", "DISTANCE"]
FEATURES = CAT + NUM


def make_features(frame):
    date = pd.to_datetime(frame["FL_DATE"], errors="coerce")
    dep = pd.to_numeric(frame["CRS_DEP_TIME"], errors="coerce").fillna(0).astype(int)
    x = pd.DataFrame(index=frame.index)
    for col in CAT:
        source = "AIRLINE_CODE" if col == "AIRLINE_CODE" else col
        x[col] = frame[source].fillna("UNKNOWN").astype(str)
    x["YEAR"] = date.dt.year
    x["MONTH"] = date.dt.month
    x["DAY_OF_WEEK"] = date.dt.dayofweek
    x["DEP_HOUR"] = dep // 100
    x["DEP_MINUTE"] = dep % 100
    x["DISTANCE"] = pd.to_numeric(frame["DISTANCE"], errors="coerce")
    return x


def main():
    # Read only the source fields permitted at prediction time and the label.
    df = pd.read_csv(CSV, usecols=["FL_DATE", "AIRLINE_CODE", "ORIGIN", "DEST",
                                  "CRS_DEP_TIME", "DISTANCE", "DEP_DELAY"])
    df["FL_DATE"] = pd.to_datetime(df["FL_DATE"], errors="coerce")
    df["DEP_DELAY"] = pd.to_numeric(df["DEP_DELAY"], errors="coerce")
    df = df.dropna(subset=["FL_DATE", "DEP_DELAY"])
    df = df.sort_values("FL_DATE", kind="stable")
    cutoff = df["FL_DATE"].quantile(0.8)
    train = df[df["FL_DATE"] < cutoff]
    test = df[df["FL_DATE"] >= cutoff]
    y_train = (train["DEP_DELAY"] >= 15).astype("uint8")
    y_test = (test["DEP_DELAY"] >= 15).astype("uint8")

    # Reserve the latest training dates for tuning; never tune on the test set.
    validation_cutoff = train["FL_DATE"].quantile(0.9)
    fit_train = train[train["FL_DATE"] < validation_cutoff]
    validation = train[train["FL_DATE"] >= validation_cutoff]
    pre = ColumnTransformer([
        ("categorical", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1, max_categories=254), CAT),
        ("numeric", "passthrough", NUM),
    ], verbose_feature_names_out=False)
    model = make_pipeline(pre, HistGradientBoostingClassifier(
        max_iter=120, max_leaf_nodes=31, learning_rate=0.12,
        l2_regularization=1.0, random_state=42, early_stopping=False,
        categorical_features=[0, 1, 2],
    ))
    # Select iteration count using only the later validation period.
    candidates = []
    for iterations in (40, 80, 120):
        model.set_params(histgradientboostingclassifier__max_iter=iterations)
        model.fit(make_features(fit_train), (fit_train["DEP_DELAY"] >= 15).astype("uint8"))
        validation_probs = model.predict_proba(make_features(validation))[:, 1]
        candidates.append((brier_score_loss((validation["DEP_DELAY"] >= 15).astype("uint8"), validation_probs), iterations))
    selected_iterations = min(candidates)[1]
    model.set_params(histgradientboostingclassifier__max_iter=selected_iterations)
    model.fit(make_features(train), y_train)
    probs = model.predict_proba(make_features(test))[:, 1]
    pred = probs >= 0.5
    report = {
        "target": "DEP_DELAY >= 15 minutes",
        "features": ["AIRLINE_CODE", "ORIGIN", "DEST", "FL_DATE (year/month/day-of-week)",
                     "CRS_DEP_TIME (hour/minute)", "DISTANCE"],
        "excluded": ["actual departure/arrival times", "DEP_DELAY as a feature", "arrival delay", "delay causes", "cancellation and diversion outcomes"],
        "split": "chronological 80/20 by flight date; cutoff date belongs to test",
        "cutoff_date": str(cutoff.date()),
        "train_rows": int(len(train)), "test_rows": int(len(test)),
        "positive_rate_test": float(y_test.mean()),
        "accuracy_at_0_5": float(accuracy_score(y_test, pred)),
        "precision_at_0_5": float(precision_score(y_test, pred, zero_division=0)),
        "recall_at_0_5": float(recall_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probs)),
        "average_precision": float(average_precision_score(y_test, probs)),
        "brier_score": float(brier_score_loss(y_test, probs)),
        "threshold": 0.5,
        "selected_iterations": selected_iterations,
        "validation": "latest 10% of training dates; iteration count selected by Brier score",
        "always_on_time_accuracy": float(1 - y_test.mean()),
        "confusion_matrix_at_0_5": confusion_matrix(y_test, pred, labels=[0, 1]).tolist(),
        "precision_at_0_25": float(precision_score(y_test, probs >= .25, zero_division=0)),
        "recall_at_0_25": float(recall_score(y_test, probs >= .25, zero_division=0)),
        "confusion_matrix_at_0_25": confusion_matrix(y_test, probs >= .25, labels=[0, 1]).tolist(),
        "calibration_bins": [
            {"lower": float(lo), "upper": float(lo+.1), "count": int(mask.sum()),
             "mean_prediction": float(probs[mask].mean()), "observed_delay_rate": float(y_test.to_numpy()[mask].mean())}
            for lo in np.arange(0, 1, .1)
            for mask in [(probs >= lo) & ((probs < lo+.1) if lo < .9 else (probs <= 1))]
            if mask.any()
        ],
    }
    joblib.dump(model, MODEL, compress=3)
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    print(f"Model: {MODEL} ({MODEL.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
