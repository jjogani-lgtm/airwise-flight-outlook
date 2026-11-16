const AIRPORT_META = {
  SEA:{city:'Seattle, WA',tz:'America/Los_Angeles',lat:47.44794,lon:-122.31028},
  PDX:{city:'Portland, OR',tz:'America/Los_Angeles',lat:45.58870,lon:-122.59800},
  SFO:{city:'San Francisco, CA',tz:'America/Los_Angeles',lat:37.61981,lon:-122.37482},
  LAX:{city:'Los Angeles, CA',tz:'America/Los_Angeles',lat:33.94250,lon:-118.40800},
  SAN:{city:'San Diego, CA',tz:'America/Los_Angeles',lat:32.73360,lon:-117.19000},
  LAS:{city:'Las Vegas, NV',tz:'America/Los_Angeles',lat:36.08336,lon:-115.15182},
  PHX:{city:'Phoenix, AZ',tz:'America/Phoenix',lat:33.43530,lon:-112.00590},
  SLC:{city:'Salt Lake City, UT',tz:'America/Denver',lat:40.78886,lon:-111.97987},
  DEN:{city:'Denver, CO',tz:'America/Denver',lat:39.86003,lon:-104.67379},
  DFW:{city:'Dallas/Fort Worth, TX',tz:'America/Chicago',lat:32.89680,lon:-97.03800},
  IAH:{city:'Houston, TX',tz:'America/Chicago',lat:29.98440,lon:-95.34140},
  AUS:{city:'Austin, TX',tz:'America/Chicago',lat:30.19753,lon:-97.66201},
  ORD:{city:'Chicago, IL',tz:'America/Chicago',lat:41.97860,lon:-87.90480},
  MDW:{city:'Chicago, IL',tz:'America/Chicago',lat:41.78600,lon:-87.75240},
  MSP:{city:'Minneapolis, MN',tz:'America/Chicago',lat:44.88008,lon:-93.22174},
  DTW:{city:'Detroit, MI',tz:'America/Detroit',lat:42.21377,lon:-83.35379},
  STL:{city:'St. Louis, MO',tz:'America/Chicago',lat:38.74870,lon:-90.37000},
  ATL:{city:'Atlanta, GA',tz:'America/New_York',lat:33.63670,lon:-84.42810},
  MIA:{city:'Miami, FL',tz:'America/New_York',lat:25.79601,lon:-80.28975},
  FLL:{city:'Fort Lauderdale, FL',tz:'America/New_York',lat:26.07260,lon:-80.15270},
  MCO:{city:'Orlando, FL',tz:'America/New_York',lat:28.42940,lon:-81.30900},
  CLT:{city:'Charlotte, NC',tz:'America/New_York',lat:35.21400,lon:-80.94310},
  IAD:{city:'Washington, DC',tz:'America/New_York',lat:38.94450,lon:-77.45580},
  DCA:{city:'Washington, DC',tz:'America/New_York',lat:38.85210,lon:-77.03770},
  BWI:{city:'Baltimore, MD',tz:'America/New_York',lat:39.17540,lon:-76.66830},
  PHL:{city:'Philadelphia, PA',tz:'America/New_York',lat:39.87190,lon:-75.24110},
  EWR:{city:'Newark, NJ',tz:'America/New_York',lat:40.68940,lon:-74.17055},
  JFK:{city:'New York, NY',tz:'America/New_York',lat:40.63945,lon:-73.77932},
  LGA:{city:'New York, NY',tz:'America/New_York',lat:40.77720,lon:-73.87260},
  BOS:{city:'Boston, MA',tz:'America/New_York',lat:42.36197,lon:-71.00790},
  BNA:{city:'Nashville, TN',tz:'America/Chicago',lat:36.12450,lon:-86.67820},
  CLE:{city:'Cleveland, OH',tz:'America/New_York',lat:41.41170,lon:-81.84980},
  PIT:{city:'Pittsburgh, PA',tz:'America/New_York',lat:40.49150,lon:-80.23290},
  RDU:{city:'Raleigh, NC',tz:'America/New_York',lat:35.87866,lon:-78.78730},
  OAK:{city:'Oakland, CA',tz:'America/Los_Angeles',lat:37.72008,lon:-122.22118},
  SJC:{city:'San Jose, CA',tz:'America/Los_Angeles',lat:37.36245,lon:-121.92919},
  ANC:{city:'Anchorage, AK',tz:'America/Anchorage',lat:61.17900,lon:-149.99256},
  HNL:{city:'Honolulu, HI',tz:'Pacific/Honolulu',lat:21.31839,lon:-157.92567}
};
const AIRLINES = {
  "9E": "Endeavor Air Inc.",
  "AA": "American Airlines Inc.",
  "AS": "Alaska Airlines Inc.",
  "B6": "JetBlue Airways",
  "DL": "Delta Air Lines Inc.",
  "EV": "ExpressJet Airlines LLC d/b/a aha!",
  "F9": "Frontier Airlines Inc.",
  "G4": "Allegiant Air",
  "HA": "Hawaiian Airlines Inc.",
  "MQ": "Envoy Air",
  "NK": "Spirit Air Lines",
  "OH": "PSA Airlines Inc.",
  "OO": "SkyWest Airlines Inc.",
  "QX": "Horizon Air",
  "UA": "United Air Lines Inc.",
  "WN": "Southwest Airlines Co.",
  "YV": "Mesa Airlines Inc.",
  "YX": "Republic Airline"
};
const DEFAULTS = {origin:'JFK', destination:'LAX', airline:'DL'};
const HIGH_RISK_THRESHOLD = 25;
const form = document.querySelector('#flight-form');
const originSelect = document.querySelector('#origin');
const destinationSelect = document.querySelector('#destination');
const airlineSelect = document.querySelector('#airline');
const otherAirlineInput = document.querySelector('#other-airline');
const dateInput = document.querySelector('#date');
let historyData;
const STORAGE_KEY = 'airwise-flights-v1';
const monitoredFlights = [];
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) monitoredFlights.push(...saved.filter(f => f && AIRPORT_META[f.origin] && AIRPORT_META[f.destination] && typeof f.airline === 'string' && typeof f.airlineName === 'string' && typeof f.customAirline === 'string' && typeof f.flightNum === 'string' && typeof f.dateLabel === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^\d{2}:\d{2}$/.test(f.time) && ['low','medium','high','unavailable'].includes(f.level) && (f.pct === null || (Number.isFinite(f.pct) && f.pct>=0 && f.pct<=100))).slice(0,100).map((f,i)=>({...f,id:i+1})));
} catch { /* Browser storage may be unavailable. */ }
function saveMonitor(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(monitoredFlights.slice(0,100))); }
  catch { /* Continue to support this session when storage is disabled. */ }
}
let nextMonitorId = monitoredFlights.length + 1;
let editingId = null;
let selectedFlight = null;
let selectedMonitorId = null;
function cancelEditing(){
  editingId=null;
  document.querySelector('#editing-status').hidden=true;
  document.querySelector('#cancel-edit').hidden=true;
  document.querySelector('.submit-button').querySelector('span').textContent='Add to flight monitor';
}
function focusPlanner(){document.querySelector('#planner').scrollIntoView({behavior:'smooth',block:'start'});originSelect.focus({preventScroll:true});}
function loadFlight(flight){
  originSelect.value=flight.origin;destinationSelect.value=flight.destination;airlineSelect.value=flight.airline;
  otherAirlineInput.value=flight.customAirline;dateInput.value=flight.date;document.querySelector('#time').value=flight.time;document.querySelector('#flight-number').value=flight.flightNum;
  updateOtherAirline();updateAirportCaptions();
}

function airportList() {
  const available = new Set(Object.keys(AIRPORT_META));
  return Object.entries(AIRPORT_META).filter(([code])=>available.has(code));
}
function setAirportOptions(select, selected) {
  select.innerHTML = '<option value="">Select airport</option>' + airportList().map(([code, airport])=>`<option value="${code}">${code} · ${airport.city}</option>`).join('');
  select.value = selected;
}
function setDateDefault(){
  const d = new Date(); d.setDate(d.getDate()+7);
  dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  dateInput.min = new Date().toISOString().slice(0,10);
}
function fillAirlines(data) {
  const selected = airlineSelect.value || DEFAULTS.airline;
  const names = { ...AIRLINES, ...data?.airlines };
  const rows = Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1]));
  airlineSelect.innerHTML = '<option value="">Select airline</option>' + rows.map(([code,name])=>`<option value="${escapeAttr(code)}">${escapeHtml(name)} · ${escapeHtml(code)}</option>`).join('');
  airlineSelect.add(new Option('Other airline', 'other'));
  airlineSelect.value = selected;
}
function updateOtherAirline() {
  const isOther = airlineSelect.value === 'other';
  otherAirlineInput.closest('label').hidden = !isOther;
  otherAirlineInput.required = isOther;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return escapeHtml(s)}
function updateAirportCaptions(){
  const a=AIRPORT_META[originSelect.value], b=AIRPORT_META[destinationSelect.value];
  document.querySelector('#origin-city').textContent=a?.city || 'Choose a departure airport';
  document.querySelector('#destination-city').textContent=b?.city || 'Choose an arrival airport';
}
function bucket(kind,key){return historyData?.buckets?.[kind]?.[key] || null}
function average(store,key,fallback){const b=store?.[key];return b&&b[0]?b[1]/b[0]:fallback}
function formatDuration(minutes) {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, '0')}m`;
}
function timezoneParts(date,tz){const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
function localToUtc(dateString,timeString,tz){
  const [y,mo,d]=dateString.split('-').map(Number),[h,m]=timeString.split(':').map(Number);let utc=Date.UTC(y,mo-1,d,h,m);
  for(let i=0;i<3;i++){const p=timezoneParts(new Date(utc),tz);const observed=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);utc+=Date.UTC(y,mo-1,d,h,m)-observed;}
  return new Date(utc);
}
function formatLocal(date,tz,opts){return new Intl.DateTimeFormat('en-US',{timeZone:tz,...opts}).format(date)}
function estimate(origin,dest,airline,month,weekday,hour){
  const global=historyData.global, base=global[1]/global[0];
  const route=`${origin}-${dest}`;
  const parts=[
    [bucket('airline',airline),.18,130], [bucket('origin',origin),.10,220], [bucket('route',route),.32,100],
    [bucket('routeHour',`${route}|${hour}`),.14,35], [bucket('airlineRoute',`${airline}|${route}`),.12,55],
    [bucket('airlineHour',`${airline}|${hour}`),.07,180], [bucket('month',String(month)),.04,5000],
    [bucket('weekday',String(weekday)),.03,5000]
  ];
  let score=base*.12, total=.12, support=0;
  for(const [b,weight,prior] of parts){if(!b)continue;const [n,late]=b;const reliability=n/(n+prior);const smoothed=(late+prior*base)/(n+prior);const w=weight*reliability;score+=smoothed*w;total+=w;if(weight>=.1)support+=n;}
  const probability=Math.max(.03,Math.min(.85,score/total));
  return {probability,base,support,routeCount:bucket('route',route)?.[0]||0};
}
function updateDatasetStats(data){
  const [total,delayed]=data.global||[0,0];
  document.querySelector('#stat-total').textContent=Number(total).toLocaleString();
  document.querySelector('#stat-ontime').textContent=`${total?Math.round((total-delayed)/total*100):0}%`;
  document.querySelector('#stat-delayed').textContent=`${total?Math.round(delayed/total*100):0}%`;
  document.querySelector('#stat-airlines').textContent=Object.keys(data.airlines||{}).length.toLocaleString();
}
function renderMonitor(){
  const query=document.querySelector('#monitor-search').value.trim().toLowerCase();
  const filter=document.querySelector('#monitor-filter').value;
  const rows=monitoredFlights.filter(f=>{
    const matchesFilter=filter==='all'||f.level===filter;
    const matchesQuery=!query||`${f.origin} ${f.destination} ${f.airlineName} ${f.airline} ${f.flightNum}`.toLowerCase().includes(query);
    return matchesFilter&&matchesQuery;
  });
  const sort=document.querySelector('#monitor-sort').value;
  rows.sort(sort==='risk' ? (a,b)=>(b.pct ?? -1)-(a.pct ?? -1) : sort==='departure' ? (a,b)=>(a.date+a.time).localeCompare(b.date+b.time) : (a,b)=>b.id-a.id);
  document.querySelector('#monitor-count').textContent=`${rows.length} ${rows.length===1?'flight':'flights'}`;
  const body=document.querySelector('#monitor-rows');
  if(!rows.length){
    body.closest('.monitor-table').classList.add('is-empty');
    body.innerHTML=monitoredFlights.length?'<tr class="empty-row"><td colspan="6"><strong>No matching flights</strong><small>Try a different search or outlook filter.</small></td></tr>':'<tr class="empty-row"><td colspan="6"><span class="empty-icon">✈</span><strong>No flights checked yet</strong><small>Use the flight form below to add an outlook to your monitor.</small></td></tr>';
    return;
  }
  body.closest('.monitor-table').classList.remove('is-empty');
  body.innerHTML=rows.map(f=>`<tr><td><span class="table-flight-mark">${escapeHtml((f.customAirline || f.airline).slice(0,2))}</span><span class="table-flight-name"><strong>${escapeHtml(f.flightNum?`${f.customAirline || f.airline} ${f.flightNum}`:f.airlineName)}</strong><small>${escapeHtml(f.airlineName)}</small></span></td><td><span class="table-route">${escapeHtml(f.origin)} <i>→</i> ${escapeHtml(f.destination)}</span></td><td><strong>${escapeHtml(f.dateLabel)}</strong><small class="table-subline">${escapeHtml(f.time)} local</small></td><td><span class="outlook-badge ${f.level}"><i class="status-dot ${f.level}"></i>${f.level==='low'?'Lower risk':f.level==='high'?'Higher risk':f.level==='medium'?'Some chance':'Unavailable'}</span></td><td><strong class="table-probability ${f.level}">${f.pct === null ? "—" : `${f.pct}%`}</strong><small class="table-subline">${escapeHtml(f.source || "Source not recorded")} · ${Number.isFinite(f.routeCount) ? f.routeCount.toLocaleString()+" route records" : "coverage not recorded"}</small></td><td><button class="table-view-button" type="button" data-monitor-id="${f.id}">View</button> <button class="table-view-button" type="button" data-edit-id="${f.id}">Edit</button> <button class="table-view-button" type="button" data-delete-id="${f.id}" aria-label="Delete ${escapeAttr(f.origin)} to ${escapeAttr(f.destination)}">Delete</button></td></tr>`).join('');
}
function renderOperationalAlerts(){
  const alerts=monitoredFlights.filter(f=>f.level==='high');
  document.querySelector('#alert-count').textContent=`${alerts.length} ${alerts.length===1?'alert':'alerts'}`;
  const list=document.querySelector('#operational-alert-list');
  if(!alerts.length){
    list.innerHTML='<div class="alerts-empty"><span class="alerts-empty-icon">✓</span><span><strong>No high-risk alerts</strong><small>Add flight outlooks to surface departures with elevated historical delay risk.</small></span></div>';
    return;
  }
  list.innerHTML=alerts.map(f=>`<article class="alert-item"><span class="alert-indicator" aria-hidden="true">!</span><span class="alert-flight"><span class="table-flight-mark">${escapeHtml((f.customAirline || f.airline).slice(0,2))}</span><span><strong>${escapeHtml(f.flightNum?`${f.customAirline || f.airline} ${f.flightNum}`:f.airlineName)}</strong><small>${escapeHtml(f.airlineName)}</small></span></span><span class="alert-route"><strong>${escapeHtml(f.origin)} <i>→</i> ${escapeHtml(f.destination)}</strong><small>${escapeHtml(f.dateLabel)} · ${escapeHtml(f.time)} local</small></span><span class="alert-risk"><strong>${f.pct}%</strong><small>historical delay chance</small></span><button class="alert-review-button" type="button" data-alert-id="${f.id}">Review outlook</button></article>`).join('');
}
function addToMonitor(flight){
  const previous=monitoredFlights.find(f=>f.id===editingId);
  const duplicate=monitoredFlights.find(f=>f.origin===flight.origin && f.destination===flight.destination && f.airline===flight.airline && f.customAirline===flight.customAirline && f.date===flight.date && f.time===flight.time && f.flightNum===flight.flightNum);
  const id=previous?.id || duplicate?.id || nextMonitorId++;
  for(let i=monitoredFlights.length-1;i>=0;i--)if(monitoredFlights[i].id===previous?.id || monitoredFlights[i].id===duplicate?.id)monitoredFlights.splice(i,1);
  monitoredFlights.unshift({...flight,id});monitoredFlights.splice(100);cancelEditing();saveMonitor();renderMonitor();renderOperationalAlerts();return id;
}
function reviewMonitoredFlight(id){
  if(document.querySelector('.submit-button').disabled)return;
  const flight=monitoredFlights.find(f=>f.id===Number(id));if(!flight)return;
  cancelEditing();loadFlight(flight);showEstimate(null,false,flight.id);
}
const routeMap = document.querySelector('#route-map');
const zoomOutButton = document.querySelector('#map-zoom-out');
const zoomInButton = document.querySelector('#map-zoom-in');
const fitButton = document.querySelector('#map-fit');
const minZoom = -2;
const maxZoom = 3;
let displayedRoute;
let zoomLevel = 0;

function setMapZoom(level) {
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, level));
  zoomOutButton.disabled = zoomLevel === minZoom;
  zoomInButton.disabled = zoomLevel === maxZoom;
  fitButton.disabled = zoomLevel === 0;
  drawMap();
}

zoomOutButton.addEventListener('click', () => setMapZoom(zoomLevel - 1));
zoomInButton.addEventListener('click', () => setMapZoom(zoomLevel + 1));
fitButton.addEventListener('click', () => setMapZoom(0));

function airportVector({ lat, lon }) {
  const latitude = lat * Math.PI / 180;
  const longitude = lon * Math.PI / 180;
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.cos(latitude) * Math.sin(longitude),
    Math.sin(latitude)
  ];
}

function projectMapPoint(lon, lat) {
  return { x: (lon + 180) * 8, y: (90 - lat) * 10 };
}

function buildMapRoute(origin, destination) {
  const start = airportVector(AIRPORT_META[origin]);
  const end = airportVector(AIRPORT_META[destination]);
  const dot = start.reduce((sum, value, index) => sum + value * end[index], 0);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  // Interpolating between the two vectors traces their great-circle arc.
  const points = Array.from({ length: 49 }, (_, index) => {
    const fraction = index / 48;
    const [x, y, z] = start.map((value, axis) => value + (end[axis] - value) * fraction);
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    const lat = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
    return projectMapPoint(lon, lat);
  });
  return { points, distance: angle * 3958.8 };
}

function drawMap() {
  const { width, height } = routeMap.getBoundingClientRect();
  if (!displayedRoute || !width || !height) return;
  const { origin, destination, points } = displayedRoute;
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const padding = Math.min(40, width / 4, height / 4);
  const fittedScale = Math.min((width - 2 * padding) / Math.max(right - left, 20),
    (height - 2 * padding) / Math.max(bottom - top, 20));
  const scale = fittedScale * 1.25 ** zoomLevel;
  const mapX = width / 2 - (left + right) / 2 * scale;
  const mapY = height / 2 - (top + bottom) / 2 * scale;

  routeMap.setAttribute('viewBox', `0 0 ${width} ${height}`);
  document.querySelector('#route-land').setAttribute('transform', `translate(${mapX} ${mapY}) scale(${scale})`);

  const projected = points.map(({ x, y }) => ({
    x: x * scale + mapX,
    y: y * scale + mapY
  }));
  const path = projected.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  document.querySelector('#route-glow').setAttribute('d', path);
  document.querySelector('#route-path').setAttribute('d', path);

  const first = projected[0];
  const last = projected[projected.length - 1];
  const marker = ({ x, y }, code, type, labelOffset) => `
    <circle class="route-marker-ring ${type}" cx="${x}" cy="${y}" r="6"/>
    <circle class="route-marker-core ${type}" cx="${x}" cy="${y}" r="2.5"/>
    <text class="route-code" x="${x}" y="${y + labelOffset}">${code}</text>`;
  const originAbove = first.y <= last.y;
  document.querySelector('#route-nodes').innerHTML =
    marker(first, origin, 'origin', originAbove ? -12 : 22) +
    marker(last, destination, 'dest', originAbove ? 22 : -12);
}

function updateMap(origin, destination, route, duration) {
  displayedRoute = { origin, destination, points: route.points };
  routeMap.setAttribute('aria-label', `Great-circle route from ${AIRPORT_META[origin].city} (${origin}) to ${AIRPORT_META[destination].city} (${destination})`);
  document.querySelector('#map-distance').textContent = Math.round(route.distance * 0.868976).toLocaleString();
  document.querySelector('#map-flight-time').textContent = formatDuration(duration);
  document.querySelector('#map-origin-code').textContent = origin;
  document.querySelector('#map-origin-city').textContent = AIRPORT_META[origin].city;
  document.querySelector('#map-dest-code').textContent = destination;
  document.querySelector('#map-dest-city').textContent = AIRPORT_META[destination].city;
  setMapZoom(0);
}

new ResizeObserver(drawMap).observe(routeMap);

async function predictDelay(payload) {
  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    const { delay_probability: probability } = await response.json();
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) return null;
    return { probability, routeCount: bucket('route', `${payload.origin}-${payload.destination}`)?.[0] || 0 };
  } catch {
    return null;
  }
}

async function showEstimate(event,track=true,reviewId=null){
  event?.preventDefault();
  const submitButton = document.querySelector('.submit-button');
  if (submitButton.disabled) return;
  const error=document.querySelector('#form-error');error.hidden=true;
  const origin=originSelect.value,dest=destinationSelect.value,airline=airlineSelect.value,dateString=dateInput.value,timeString=document.querySelector('#time').value;
  if(!origin||!dest||!airline||!dateString||!timeString){error.textContent='Please fill in the required flight details.';error.hidden=false;return;}
  if(origin===dest){error.textContent='Choose two different airports for your route.';error.hidden=false;return;}
  const customAirline = airline === 'other' ? otherAirlineInput.value.trim() : '';
  if (airline === 'other' && !customAirline) {
    error.textContent = 'Enter the airline name or code.';
    error.hidden = false;
    return;
  }
  const carrier = airline === 'other' ? customAirline.toUpperCase() : airline;
  const route = `${origin}-${dest}`;
  const mapRoute = buildMapRoute(origin, dest);
  const distance = mapRoute.distance;
  const duration = average(historyData?.duration, route, Math.max(75, distance / 500 * 60 + 55));
  const departure = localToUtc(dateString, timeString, AIRPORT_META[origin].tz);
  const arrival = new Date(departure.getTime() + duration * 60000);
  const flightNum = document.querySelector('#flight-number').value.trim();
  const scheduledTime = Number(timeString.replace(':', ''));
  submitButton.disabled = true;
  const submitLabel = submitButton.querySelector('span');
  const originalLabel = submitLabel.textContent;
  submitLabel.textContent = 'Checking trained model…';
  let modelPrediction;
  try {
    modelPrediction = await predictDelay({
      airline: carrier, origin, destination: dest, date: dateString,
      scheduled_departure_time: scheduledTime,
      distance: average(historyData?.distance, route, distance)
    });
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = originalLabel;
  }

  const date = new Date(`${dateString}T12:00:00`);
  const prediction = modelPrediction || (historyData ? estimate(
    origin, dest, carrier, date.getMonth() + 1, (date.getDay() + 6) % 7, Math.floor(scheduledTime / 100)
  ) : null);
  const pct = prediction ? Math.round(prediction.probability * 100) : null;
  const source=modelPrediction ? 'Trained model' : prediction ? 'Historical baseline' : 'Unavailable';
  const routeCount=prediction?.routeCount || 0;
  const coverage=historyData ? (bucket('airlineRoute',`${carrier}|${route}`) ? 'Historical records exist for this airline on this route.' : 'Limited coverage: no records for this airline on this route. Broader patterns are used; this may not be a scheduled airline route.') : 'Historical coverage could not be checked.';
  const base=historyData ? historyData.global[1]/historyData.global[0]*100 : null;
  const baselineComparison = prediction && base !== null
    ? `This estimate is ${Math.abs(prediction.probability*100-base).toFixed(1)} percentage points ${prediction.probability*100>=base?'above':'below'} the overall sample rate. This is broad context, not a like-for-like comparison. ` : '';
  document.querySelector('#prediction-context').textContent=`${source}. ${base===null?'':`Overall historical delay rate: ${base.toFixed(1)}%. `}${baselineComparison}${coverage} Route counts show data coverage, not prediction confidence. ${!modelPrediction&&prediction?'Model unavailable; using the historical fallback.':''}`;
  selectedFlight={airline:carrier,origin,destination:dest,date:dateString,distance:average(historyData?.distance,route,distance)};
  document.querySelector('#comparison').hidden=false;document.querySelector('#comparison-results').replaceChildren();document.querySelector('#comparison-status').textContent='';
  const riskPercent = prediction ? prediction.probability * 100 : null;
  const level = riskPercent === null ? 'unavailable' : riskPercent < 20 ? 'low' : riskPercent >= HIGH_RISK_THRESHOLD ? 'high' : 'medium';
  if (prediction) {
    const ontime = level === 'low', elevated = level === 'high';
    document.querySelector('#risk-value').textContent=`${pct}%`;
    document.querySelector('#risk-ring').style.background=`conic-gradient(${elevated?'#d97706':'#16845f'} 0 ${pct}%,#edf2f7 ${pct}% 100%)`;
    document.querySelector('#risk-meter').style.width=`${Math.min(100,pct)}%`;
    document.querySelector('#risk-overline').textContent=`${modelPrediction ? "TRAINED MODEL" : "HISTORICAL BASELINE"} · ${prediction.routeCount.toLocaleString()} ROUTE RECORDS`;
    document.querySelector('#risk-title').textContent=ontime?'Lower estimated delay risk':elevated?'Higher estimated delay risk':'Some chance of a delay';
    const hasCarrierRouteHistory = bucket('airlineRoute', `${carrier}|${route}`);
    document.querySelector('#risk-description').textContent = modelPrediction
      ? `The trained model estimates a ${pct}% chance of departure 15+ minutes late.`
      : hasCarrierRouteHistory
      ? `The historical baseline estimates a ${pct}% delay chance by combining route, airline and time patterns. This is not an observed rate for identical flights.`
      : `Estimated delay risk is ${pct}% using broader historical patterns. There are no records for this airline on the selected route.`;
  } else {
    document.querySelector('#risk-value').textContent = '—';
    document.querySelector('#risk-ring').style.background = '#edf2f7';
    document.querySelector('#risk-meter').style.width = '0';
    document.querySelector('#risk-overline').textContent = 'HISTORICAL OUTLOOK';
    document.querySelector('#risk-title').textContent = 'Historical delay estimate unavailable';
    document.querySelector('#risk-description').textContent = 'The route map and estimated travel time are based on airport coordinates.';
  }
  document.querySelector('#arrival-time').textContent=formatLocal(arrival,AIRPORT_META[dest].tz,{hour:'numeric',minute:'2-digit'});
  document.querySelector('#arrival-day').textContent=`${formatLocal(arrival,AIRPORT_META[dest].tz,{weekday:'short',month:'short',day:'numeric'})} · ${dest} local`;
  document.querySelector('#duration-time').textContent=formatDuration(duration);
  document.querySelector('#distance-value').textContent=`${Math.round(distance).toLocaleString()} mi`;
  document.querySelector('#result-route-heading').textContent=`${origin} to ${dest}, at a glance`;
  const airlineName = historyData?.airlines?.[carrier] || AIRLINES[carrier] || customAirline || carrier;
  document.querySelector('#result-airline-mark').textContent=carrier.slice(0,2);
  document.querySelector('#result-flight-meta').textContent=`${airlineName}${flightNum?` · ${customAirline ? "" : carrier + " "}${flightNum}`:''}`;
  document.querySelector('#result-flight-date').textContent=formatLocal(departure,AIRPORT_META[origin].tz,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+` · ${timeString} local`;
  if (track) {
    selectedMonitorId=addToMonitor({
      origin, destination: dest, airline, customAirline, airlineName, flightNum, date: dateString,
      dateLabel: formatLocal(departure, AIRPORT_META[origin].tz, { month: 'short', day: 'numeric' }),
      time: timeString, pct, level, source, routeCount
    });
  }
  if(!track)selectedMonitorId=reviewId;
  const results=document.querySelector('#results');
  results.hidden=false;
  updateMap(origin, dest, mapRoute, duration);
  results.scrollIntoView({behavior:'smooth',block:'start'});
}
originSelect.addEventListener('change',updateAirportCaptions);destinationSelect.addEventListener('change',updateAirportCaptions);
document.querySelector('#swap-route').addEventListener('click',()=>{const old=originSelect.value;originSelect.value=destinationSelect.value;destinationSelect.value=old;updateAirportCaptions();});
form.addEventListener('submit',showEstimate);
document.querySelector('#monitor-sort').addEventListener('change',renderMonitor);
document.querySelector('#cancel-edit').addEventListener('click',cancelEditing);
document.querySelector('#monitor-search').addEventListener('input',renderMonitor);
document.querySelector('#monitor-filter').addEventListener('change',renderMonitor);
document.querySelector('#monitor-rows').addEventListener('click',event=>{
  if(document.querySelector('.submit-button').disabled)return;
  const remove=event.target.closest('[data-delete-id]');
  if(remove){const id=Number(remove.dataset.deleteId),index=monitoredFlights.findIndex(f=>f.id===id);if(index>=0)monitoredFlights.splice(index,1);if(editingId===id)cancelEditing();saveMonitor();renderMonitor();renderOperationalAlerts();return;}
  const edit=event.target.closest('[data-edit-id]');if(edit){editMonitoredFlight(Number(edit.dataset.editId));return;}
  const button=event.target.closest('[data-monitor-id]');if(button)reviewMonitoredFlight(button.dataset.monitorId);
});
document.querySelector('#operational-alert-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-alert-id]');if(button)reviewMonitoredFlight(button.dataset.alertId);
});
document.querySelector('#edit-flight').addEventListener('click',()=>{if(selectedMonitorId)editMonitoredFlight(selectedMonitorId);else focusPlanner();});
setAirportOptions(originSelect,DEFAULTS.origin);setAirportOptions(destinationSelect,DEFAULTS.destination);setDateDefault();updateAirportCaptions();
fillAirlines();
airlineSelect.addEventListener('change', updateOtherAirline);

fetch('history.json')
  .then(response => {
    if (!response.ok) throw new Error('Historical data unavailable');
    return response.json();
  })
  .then(data => {
    if (!(data.global?.[0] > 0)) throw new Error('Historical data unavailable');
    historyData = data;
    fillAirlines(data);
    updateDatasetStats(data);
    document.querySelector('#data-status').textContent='Historical data ready · 2019–2023 US flights.';
  })
  .catch(() => {
    document.querySelector('#data-status').textContent='Historical data could not load. Dataset statistics and fallback estimates are unavailable. The model and map can still work.';
  });

renderMonitor();
renderOperationalAlerts();

function editMonitoredFlight(id){
  if(document.querySelector('.submit-button').disabled)return;
  const flight=monitoredFlights.find(f=>f.id===id);if(!flight){focusPlanner();return;}
  loadFlight(flight);editingId=id;
  document.querySelector('#editing-status').textContent=`Editing ${flight.origin} → ${flight.destination}. Submit to update this saved flight.`;
  document.querySelector('#editing-status').hidden=false;document.querySelector('#cancel-edit').hidden=false;
  document.querySelector('.submit-button').querySelector('span').textContent='Update saved flight';focusPlanner();
}
document.querySelector('#compare-times').addEventListener('click',async()=>{
  if(!selectedFlight)return;
  const flight={...selectedFlight},button=document.querySelector('#compare-times');button.disabled=true;
  document.querySelector('#comparison-status').textContent='Comparing six departure times…';
  try{
    const date=new Date(flight.date+'T12:00:00');
    const predictions=await Promise.all([6,9,12,15,18,21].map(hour=>predictDelay({...flight,scheduled_departure_time:hour*100})));
    // Use one source for the entire comparison so fallback and model scores are not mixed.
    const useModel=predictions.every(Boolean);
    const rows=[6,9,12,15,18,21].map((hour,i)=>{
      const prediction=useModel?predictions[i]:historyData?estimate(flight.origin,flight.destination,flight.airline,date.getMonth()+1,(date.getDay()+6)%7,hour):null;
      return {hour,pct:prediction?Math.round(prediction.probability*100):null};
    });
    if(JSON.stringify(flight)!==JSON.stringify(selectedFlight))return;
    const available=rows.filter(r=>r.pct!==null),best=available.length?Math.min(...available.map(r=>r.pct)):null;
    document.querySelector('#comparison-results').innerHTML=rows.map(r=>`<div class="comparison-row"><strong>${String(r.hour).padStart(2,'0')}:00 local</strong><meter min="0" max="100" value="${r.pct??0}" aria-label="Delay chance at ${r.hour}:00">${r.pct??0}%</meter><span>${r.pct===null?'Unavailable':r.pct+'%'}${r.pct!==null&&r.pct===best?' · Lowest estimate':''}</span></div>`).join('');
    document.querySelector('#comparison-status').textContent=`${flight.origin} → ${flight.destination} · ${flight.airline} · ${flight.date}. Source: ${useModel?'trained model':historyData?'historical baseline (model unavailable for one or more times)':'unavailable'}. Small differences may not be meaningful. Coverage limitations above also apply.`;
  }catch{document.querySelector('#comparison-status').textContent='Comparison unavailable. Please try again.';}
  finally{button.disabled=false;}
});
fetch('model_metrics.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(m=>{
  const el=document.querySelector('#model-performance');
  el.textContent=`Evaluated on ${m.test_rows.toLocaleString()} later flights. Accuracy: ${(m.accuracy_at_0_5*100).toFixed(2)}%. Predicting no delay every time: ${((1-m.positive_rate_test)*100).toFixed(2)}%. At a 50% cutoff, precision is ${(m.precision_at_0_5*100).toFixed(1)}% (warnings that are correct), and recall is ${(m.recall_at_0_5*100).toFixed(1)}% (delays caught). ROC AUC: ${m.roc_auc.toFixed(3)} (risk ranking; 0.5 means chance). Brier score: ${m.brier_score.toFixed(3)} (probability error; lower is better).`;
  if(Number.isFinite(m.precision_at_0_25))el.append(document.createTextNode(` At the 25% alert cutoff, precision is ${(m.precision_at_0_25*100).toFixed(1)}% and recall is ${(m.recall_at_0_25*100).toFixed(1)}%.`));
  else el.append(document.createTextNode(' Performance at the 25% alert cutoff has not yet been measured.'));
  if(m.confusion_matrix_at_0_5){
    const matrix=m.confusion_matrix_at_0_5,table=document.createElement('table');table.className='evaluation-table';
    table.innerHTML=`<caption>Test outcomes at the 50% cutoff</caption><thead><tr><th scope="col">Actual outcome</th><th scope="col">Predicted on time</th><th scope="col">Predicted delayed</th></tr></thead><tbody><tr><th scope="row">On time</th><td>${Number(matrix[0][0]).toLocaleString()}</td><td>${Number(matrix[0][1]).toLocaleString()}</td></tr><tr><th scope="row">Delayed</th><td>${Number(matrix[1][0]).toLocaleString()}</td><td>${Number(matrix[1][1]).toLocaleString()}</td></tr></tbody>`;el.append(table);
  }
  if(m.calibration_bins){const p=document.createElement('p');p.textContent='Probability check (estimated chance → observed delay rate): '+m.calibration_bins.map(b=>`${(b.mean_prediction*100).toFixed(1)}% → ${(b.observed_delay_rate*100).toFixed(1)}% (${b.count.toLocaleString()} flights)`).join('; ');el.append(p);}
  const note=document.createElement('p');note.textContent='Historical evaluation is not a guarantee of current performance. Live weather and traffic are not included. New confusion-matrix and calibration details require retraining with the original dataset.';el.append(note);
}).catch(()=>{document.querySelector('#model-performance').textContent='Evaluation could not be loaded. Please reload the page.';});
