"""Build compact historical aggregates for the Airwise browser demo."""
import csv, json, os, sys
from collections import defaultdict
from datetime import date
SOURCE = os.path.join(os.path.dirname(__file__), "flights_sample_3m.csv")
OUTPUT = os.path.join(os.path.dirname(__file__), "history.json")
BUCKETS = {k: defaultdict(lambda: [0, 0]) for k in ("airline", "origin", "route", "routeHour", "airlineRoute", "airlineHour", "month", "weekday")}
GLOBAL = [0, 0]; DURATIONS = defaultdict(lambda: [0, 0]); DISTANCES = defaultdict(lambda: [0, 0]); AIRLINES = {}; AIRPORTS = {}
with open(SOURCE, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, 1):
        try:
            dep_delay = float(row["DEP_DELAY"]); flight_date = date.fromisoformat(row["FL_DATE"])
            carrier = row["AIRLINE_CODE"].strip(); origin = row["ORIGIN"].strip(); dest = row["DEST"].strip()
            hour = (int(float(row["CRS_DEP_TIME"] or 0)) // 100) % 24
            if not carrier or not origin or not dest: continue
        except (ValueError, TypeError, KeyError): continue
        late = int(dep_delay >= 15); route = origin + "-" + dest
        AIRLINES[carrier] = row["AIRLINE"].strip(); AIRPORTS[origin] = row["ORIGIN_CITY"].strip(); AIRPORTS[dest] = row["DEST_CITY"].strip()
        GLOBAL[0] += 1; GLOBAL[1] += late
        keys = {"airline": carrier, "origin": origin, "route": route, "routeHour": f"{route}|{hour}", "airlineRoute": f"{carrier}|{route}", "airlineHour": f"{carrier}|{hour}", "month": str(flight_date.month), "weekday": str(flight_date.weekday())}
        for kind, key in keys.items():
            b = BUCKETS[kind][key]; b[0] += 1; b[1] += late
        for source, store in (("CRS_ELAPSED_TIME", DURATIONS), ("DISTANCE", DISTANCES)):
            try:
                value = float(row[source])
                if value > 0:
                    b = store[route]; b[0] += 1; b[1] += value
            except (ValueError, TypeError): pass
        if i % 500000 == 0: print(f"Processed {i:,} rows", file=sys.stderr)
obj = {"source":"flights_sample_3m.csv","period":"2019–2023","target":"departure delay of 15 minutes or more","global":GLOBAL,"buckets":{k:dict(v) for k,v in BUCKETS.items()},"duration":dict(DURATIONS),"distance":dict(DISTANCES),"airlines":AIRLINES,"airports":AIRPORTS}
with open(OUTPUT,"w",encoding="utf-8") as f: json.dump(obj,f,separators=(",",":"))
print(f"Wrote {OUTPUT} ({os.path.getsize(OUTPUT):,} bytes); {GLOBAL[0]:,} valid flights")
