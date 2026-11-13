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
const DEFAULTS = {origin:'JFK', destination:'LAX', airline:'DL'};
const form = document.querySelector('#flight-form');
const originSelect = document.querySelector('#origin');
const destinationSelect = document.querySelector('#destination');
const airlineSelect = document.querySelector('#airline');
const dateInput = document.querySelector('#date');
let historyData;

function airportList() {
  const available = new Set(Object.keys(AIRPORT_META));
  return Object.entries(AIRPORT_META).filter(([code])=>available.has(code));
}
function setAirportOptions(select, selected) {
  select.innerHTML = '<option value="">Select airport</option>' + airportList().map(([code, airport])=>`<option value="${code}">${airport.city} · ${code}</option>`).join('');
  select.value = selected;
}
function setDateDefault(){
  const d = new Date(); d.setDate(d.getDate()+7);
  dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  dateInput.min = new Date().toISOString().slice(0,10);
}
function fillAirlines(data) {
  const names = data?.airlines || {};
  const rows = Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1]));
  airlineSelect.innerHTML = '<option value="">Select airline</option>' + rows.map(([code,name])=>`<option value="${escapeAttr(code)}">${escapeHtml(name)} · ${escapeHtml(code)}</option>`).join('');
  airlineSelect.value = rows.some(([code])=>code===DEFAULTS.airline)?DEFAULTS.airline:(rows[0]?.[0]||'');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return escapeHtml(s)}
function updateAirportCaptions(){
  const a=AIRPORT_META[originSelect.value], b=AIRPORT_META[destinationSelect.value];
  document.querySelector('#origin-city').textContent=a?.city || 'Choose a departure airport';
  document.querySelector('#destination-city').textContent=b?.city || 'Choose an arrival airport';
}
function bucket(kind,key){return historyData?.buckets?.[kind]?.[key] || null}
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
const routeMap = document.querySelector('#route-map');
let displayedRoute;

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
  const scale = Math.min((width - 80) / Math.max(right - left, 20),
    (height - 80) / Math.max(bottom - top, 20));
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
  drawMap();
}

new ResizeObserver(drawMap).observe(routeMap);

function showEstimate(event){
  event?.preventDefault();const error=document.querySelector('#form-error');error.hidden=true;
  const origin=originSelect.value,dest=destinationSelect.value,airline=airlineSelect.value,dateString=dateInput.value,timeString=document.querySelector('#time').value;
  if(!origin||!dest||!airline||!dateString||!timeString){error.textContent='Please fill in the required flight details.';error.hidden=false;return;}
  if(origin===dest){error.textContent='Choose two different airports for your route.';error.hidden=false;return;}
  const dateObj=new Date(`${dateString}T12:00:00`), hour=Number(timeString.slice(0,2));
  const prediction=estimate(origin,dest,airline,dateObj.getMonth()+1,(dateObj.getDay()+6)%7,hour);
  const route=`${origin}-${dest}`;
  const mapRoute = buildMapRoute(origin, dest);
  const distance = mapRoute.distance;
  const duration=average(historyData.duration,route,Math.max(75,distance/500*60+55));
  const departure=localToUtc(dateString,timeString,AIRPORT_META[origin].tz);const arrival=new Date(departure.getTime()+duration*60000);
  const pct=Math.round(prediction.probability*100), ontime=pct<20, elevated=pct>=34;
  document.querySelector('#risk-value').textContent=`${pct}%`;
  document.querySelector('#risk-ring').style.background=`conic-gradient(${elevated?'#d5a06c':'#90a57c'} 0 ${pct}%,#ecf0e9 ${pct}% 100%)`;
  document.querySelector('#risk-meter').style.width=`${Math.min(100,pct)}%`;
  document.querySelector('#risk-overline').textContent=`${prediction.routeCount.toLocaleString()} ROUTE RECORDS`;
  document.querySelector('#risk-title').textContent=ontime?'Lower historical delay risk':elevated?'Higher historical delay risk':'Some chance of a delay';
  document.querySelector('#risk-description').textContent=`About ${pct} in 100 similar departures were 15+ minutes late in the historical data. Past patterns can’t predict today’s conditions.`;
  document.querySelector('#arrival-time').textContent=formatLocal(arrival,AIRPORT_META[dest].tz,{hour:'numeric',minute:'2-digit'});
  document.querySelector('#arrival-day').textContent=`${formatLocal(arrival,AIRPORT_META[dest].tz,{weekday:'short',month:'short',day:'numeric'})} · ${dest} local`;
  document.querySelector('#duration-time').textContent=formatDuration(duration);
  document.querySelector('#distance-value').textContent=`${Math.round(distance).toLocaleString()} mi`;
  document.querySelector('#result-route-heading').textContent=`${origin} to ${dest}, at a glance`;
  const airlineName=historyData.airlines[airline]||airline;const flightNum=document.querySelector('#flight-number').value.trim();
  document.querySelector('#result-airline-mark').textContent=airline.slice(0,2);
  document.querySelector('#result-flight-meta').textContent=`${airlineName}${flightNum?` · ${airline} ${flightNum}`:''}`;
  document.querySelector('#result-flight-date').textContent=formatLocal(departure,AIRPORT_META[origin].tz,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+` · ${timeString} local`;
  const results=document.querySelector('#results');
  results.hidden=false;
  updateMap(origin, dest, mapRoute, duration);
  results.scrollIntoView({behavior:'smooth',block:'start'});
}
originSelect.addEventListener('change',updateAirportCaptions);destinationSelect.addEventListener('change',updateAirportCaptions);
document.querySelector('#swap-route').addEventListener('click',()=>{const old=originSelect.value;originSelect.value=destinationSelect.value;destinationSelect.value=old;updateAirportCaptions();});
form.addEventListener('submit',showEstimate);
document.querySelector('#edit-flight').addEventListener('click',()=>document.querySelector('#planner').scrollIntoView({behavior:'smooth',block:'start'}));
setAirportOptions(originSelect,DEFAULTS.origin);setAirportOptions(destinationSelect,DEFAULTS.destination);setDateDefault();updateAirportCaptions();
fetch('history.json').then(r=>{if(!r.ok)throw new Error('Historical data unavailable');return r.json()}).then(data=>{historyData=data;fillAirlines(data)}).catch(()=>{airlineSelect.innerHTML='<option value="">Historical data unavailable</option>';document.querySelector('.submit-button').disabled=true;document.querySelector('#form-error').textContent='Historical data could not be loaded. Please open the project through a local web server.';});
