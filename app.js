const AIRPORT_META = {
  SEA:{city:'Seattle, WA',tz:'America/Los_Angeles',x:218,y:92}, PDX:{city:'Portland, OR',tz:'America/Los_Angeles',x:208,y:120}, SFO:{city:'San Francisco, CA',tz:'America/Los_Angeles',x:196,y:193}, LAX:{city:'Los Angeles, CA',tz:'America/Los_Angeles',x:218,y:245}, SAN:{city:'San Diego, CA',tz:'America/Los_Angeles',x:220,y:260}, LAS:{city:'Las Vegas, NV',tz:'America/Los_Angeles',x:260,y:220}, PHX:{city:'Phoenix, AZ',tz:'America/Phoenix',x:294,y:252}, SLC:{city:'Salt Lake City, UT',tz:'America/Denver',x:292,y:172}, DEN:{city:'Denver, CO',tz:'America/Denver',x:360,y:181}, DFW:{city:'Dallas/Fort Worth, TX',tz:'America/Chicago',x:436,y:237}, IAH:{city:'Houston, TX',tz:'America/Chicago',x:452,y:267}, AUS:{city:'Austin, TX',tz:'America/Chicago',x:425,y:255}, ORD:{city:'Chicago, IL',tz:'America/Chicago',x:481,y:144}, MDW:{city:'Chicago, IL',tz:'America/Chicago',x:484,y:148}, MSP:{city:'Minneapolis, MN',tz:'America/Chicago',x:453,y:116}, DTW:{city:'Detroit, MI',tz:'America/Detroit',x:516,y:145}, STL:{city:'St. Louis, MO',tz:'America/Chicago',x:477,y:177}, ATL:{city:'Atlanta, GA',tz:'America/New_York',x:520,y:218}, MIA:{city:'Miami, FL',tz:'America/New_York',x:548,y:273}, FLL:{city:'Fort Lauderdale, FL',tz:'America/New_York',x:551,y:267}, MCO:{city:'Orlando, FL',tz:'America/New_York',x:546,y:250}, CLT:{city:'Charlotte, NC',tz:'America/New_York',x:542,y:205}, IAD:{city:'Washington, DC',tz:'America/New_York',x:570,y:180}, DCA:{city:'Washington, DC',tz:'America/New_York',x:569,y:185}, BWI:{city:'Baltimore, MD',tz:'America/New_York',x:575,y:175}, PHL:{city:'Philadelphia, PA',tz:'America/New_York',x:583,y:163}, EWR:{city:'Newark, NJ',tz:'America/New_York',x:586,y:158}, JFK:{city:'New York, NY',tz:'America/New_York',x:591,y:154}, LGA:{city:'New York, NY',tz:'America/New_York',x:589,y:150}, BOS:{city:'Boston, MA',tz:'America/New_York',x:602,y:132}, BNA:{city:'Nashville, TN',tz:'America/Chicago',x:498,y:201}, CLE:{city:'Cleveland, OH',tz:'America/New_York',x:532,y:158}, PIT:{city:'Pittsburgh, PA',tz:'America/New_York',x:551,y:169}, RDU:{city:'Raleigh, NC',tz:'America/New_York',x:553,y:196}, OAK:{city:'Oakland, CA',tz:'America/Los_Angeles',x:199,y:190}, SJC:{city:'San Jose, CA',tz:'America/Los_Angeles',x:202,y:197}, ANC:{city:'Anchorage, AK',tz:'America/Anchorage',x:95,y:105}, HNL:{city:'Honolulu, HI',tz:'Pacific/Honolulu',x:126,y:284}
};
const DEFAULTS = {origin:'JFK', destination:'LAX', airline:'DL'};
const HIGH_RISK_THRESHOLD = 25;
const form = document.querySelector('#flight-form');
const originSelect = document.querySelector('#origin');
const destinationSelect = document.querySelector('#destination');
const airlineSelect = document.querySelector('#airline');
const dateInput = document.querySelector('#date');
let historyData;
const monitoredFlights = [];
let nextMonitorId = 1;

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
function average(store,key,fallback){const b=store?.[key];return b&&b[0]?b[1]/b[0]:fallback}
function greatCircle(a,b){const rad=v=>v*Math.PI/180;const lat1=rad(a.lat),lat2=rad(b.lat),dLat=lat2-lat1,dLon=rad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function coordsFromXY(p){
  // Airport locations are positioned directly on the illustrative contiguous-US map.
  return p;
}
function formatDuration(minutes){const h=Math.floor(minutes/60),m=Math.round(minutes%60);return `${h}h ${String(m).padStart(2,'0')}m`;}
function timezoneParts(date,tz){const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
function localToUtc(dateString,timeString,tz){
  const [y,mo,d]=dateString.split('-').map(Number),[h,m]=timeString.split(':').map(Number);let utc=Date.UTC(y,mo-1,d,h,m);
  for(let i=0;i<3;i++){const p=timezoneParts(new Date(utc),tz);const observed=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);utc+=Date.UTC(y,mo-1,d,h,m)-observed;}
  return new Date(utc);
}
function formatLocal(date,tz,opts){return new Intl.DateTimeFormat('en-US',{timeZone:tz,...opts}).format(date)}
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
  document.querySelector('#monitor-count').textContent=`${rows.length} ${rows.length===1?'flight':'flights'}`;
  const body=document.querySelector('#monitor-rows');
  if(!rows.length){
    body.closest('.monitor-table').classList.add('is-empty');
    body.innerHTML=monitoredFlights.length?'<tr class="empty-row"><td colspan="6"><strong>No matching flights</strong><small>Try a different search or outlook filter.</small></td></tr>':'<tr class="empty-row"><td colspan="6"><span class="empty-icon">✈</span><strong>No flights checked yet</strong><small>Use the flight form above to add an outlook to your monitor.</small></td></tr>';
    return;
  }
  body.closest('.monitor-table').classList.remove('is-empty');
  body.innerHTML=rows.map(f=>`<tr><td><span class="table-flight-mark">${escapeHtml(f.airline.slice(0,2))}</span><span class="table-flight-name"><strong>${escapeHtml(f.flightNum?`${f.airline} ${f.flightNum}`:f.airlineName)}</strong><small>${escapeHtml(f.airlineName)}</small></span></td><td><span class="table-route">${escapeHtml(f.origin)} <i>→</i> ${escapeHtml(f.destination)}</span></td><td><strong>${escapeHtml(f.dateLabel)}</strong><small class="table-subline">${escapeHtml(f.time)} local</small></td><td><span class="outlook-badge ${f.level}"><i class="status-dot ${f.level}"></i>${f.level==='low'?'Lower risk':f.level==='high'?'Higher risk':'Some chance'}</span></td><td><strong class="table-probability ${f.level}">${f.pct}%</strong><small class="table-subline">historical delay chance</small></td><td><button class="table-view-button" type="button" data-monitor-id="${f.id}">View</button></td></tr>`).join('');
}
function renderOperationalAlerts(){
  const alerts=monitoredFlights.filter(f=>f.level==='high');
  document.querySelector('#alert-count').textContent=`${alerts.length} ${alerts.length===1?'alert':'alerts'}`;
  const list=document.querySelector('#operational-alert-list');
  if(!alerts.length){
    list.innerHTML='<div class="alerts-empty"><span class="alerts-empty-icon">✓</span><span><strong>No high-risk alerts</strong><small>Add flight outlooks to surface departures with elevated historical delay risk.</small></span></div>';
    return;
  }
  list.innerHTML=alerts.map(f=>`<article class="alert-item"><span class="alert-indicator" aria-hidden="true">!</span><span class="alert-flight"><span class="table-flight-mark">${escapeHtml(f.airline.slice(0,2))}</span><span><strong>${escapeHtml(f.flightNum?`${f.airline} ${f.flightNum}`:f.airlineName)}</strong><small>${escapeHtml(f.airlineName)}</small></span></span><span class="alert-route"><strong>${escapeHtml(f.origin)} <i>→</i> ${escapeHtml(f.destination)}</strong><small>${escapeHtml(f.dateLabel)} · ${escapeHtml(f.time)} local</small></span><span class="alert-risk"><strong>${f.pct}%</strong><small>historical delay chance</small></span><button class="alert-review-button" type="button" data-alert-id="${f.id}">Review outlook</button></article>`).join('');
}
function addToMonitor(flight){monitoredFlights.unshift({...flight,id:nextMonitorId++});renderMonitor();renderOperationalAlerts();}
function reviewMonitoredFlight(id){
  const flight=monitoredFlights.find(item=>item.id===Number(id));if(!flight)return;
  originSelect.value=flight.origin;destinationSelect.value=flight.destination;airlineSelect.value=flight.airline;dateInput.value=flight.date;document.querySelector('#time').value=flight.time;document.querySelector('#flight-number').value=flight.flightNum;
  updateAirportCaptions();showEstimate(null,false);
}
function routeDistance(origin,dest){
  const known={LAX:{lat:33.94,lon:-118.41},JFK:{lat:40.64,lon:-73.78},SFO:{lat:37.62,lon:-122.38},ORD:{lat:41.98,lon:-87.90},ATL:{lat:33.64,lon:-84.43},SEA:{lat:47.45,lon:-122.31},DEN:{lat:39.86,lon:-104.67},DFW:{lat:32.90,lon:-97.04},MIA:{lat:25.79,lon:-80.29},BOS:{lat:42.36,lon:-71.01},EWR:{lat:40.69,lon:-74.17},MSP:{lat:44.88,lon:-93.22},LAS:{lat:36.08,lon:-115.15},PHX:{lat:33.43,lon:-112.01},CLT:{lat:35.21,lon:-80.94},MCO:{lat:28.43,lon:-81.31},IAH:{lat:29.98,lon:-95.34},SLC:{lat:40.79,lon:-111.98},SAN:{lat:32.73,lon:-117.19},DTW:{lat:42.21,lon:-83.35},PHL:{lat:39.87,lon:-75.24},DCA:{lat:38.85,lon:-77.04},IAD:{lat:38.95,lon:-77.46},BWI:{lat:39.18,lon:-76.67},PDX:{lat:45.59,lon:-122.60},AUS:{lat:30.20,lon:-97.67},FLL:{lat:26.07,lon:-80.15},BNA:{lat:36.13,lon:-86.67},RDU:{lat:35.88,lon:-78.79}};
  const route=`${origin}-${dest}`;const historical=average(historyData.distance,route,null);if(historical)return historical;
  const a=known[origin],b=known[dest];return a&&b?greatCircle(a,b):0;
}
function paintMap(origin,dest,distance,duration){
  const a=coordsFromXY(AIRPORT_META[origin]),b=coordsFromXY(AIRPORT_META[dest]);
  const dx=b.x-a.x,dy=b.y-a.y,curve=Math.min(68,Math.max(28,Math.abs(dx)*.15));
  const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2-curve;const path=`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
  document.querySelector('#route-glow').setAttribute('d',path);document.querySelector('#route-path').setAttribute('d',path);
  const planeX=.25*a.x+.5*cx+.25*b.x,planeY=.25*a.y+.5*cy+.25*b.y;
  const rotate=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
  document.querySelector('#route-nodes').innerHTML=`<circle class="route-marker-ring" cx="${a.x}" cy="${a.y}" r="7"/><circle class="route-marker-core" cx="${a.x}" cy="${a.y}" r="3"/><text class="route-code" x="${a.x-3}" y="${a.y+22}">${origin}</text><circle class="route-marker-ring dest" cx="${b.x}" cy="${b.y}" r="7"/><circle class="route-marker-core dest" cx="${b.x}" cy="${b.y}" r="3"/><text class="route-code" x="${b.x-3}" y="${b.y+22}">${dest}</text><text class="route-plane" x="${planeX}" y="${planeY}" transform="rotate(${rotate} ${planeX} ${planeY})">✦</text>`;
  document.querySelector('#map-distance').textContent=Math.round(distance).toLocaleString();document.querySelector('#map-flight-time').textContent=formatDuration(duration);
  document.querySelector('#map-origin-code').textContent=origin;document.querySelector('#map-origin-city').textContent=AIRPORT_META[origin].city;
  document.querySelector('#map-dest-code').textContent=dest;document.querySelector('#map-dest-city').textContent=AIRPORT_META[dest].city;
}
async function showEstimate(event,track=true){
  event?.preventDefault();const error=document.querySelector('#form-error');error.hidden=true;
  const origin=originSelect.value,dest=destinationSelect.value,airline=airlineSelect.value,dateString=dateInput.value,timeString=document.querySelector('#time').value;
  if(!origin||!dest||!airline||!dateString||!timeString){error.textContent='Please fill in the required flight details.';error.hidden=false;return;}
  if(origin===dest){error.textContent='Choose two different airports for your route.';error.hidden=false;return;}
  const route=`${origin}-${dest}`;
  const duration=average(historyData.duration,route,Math.max(75,routeDistance(origin,dest)/500*60+55));
  const distance=routeDistance(origin,dest);
  const submitButton=document.querySelector('.submit-button');
  const submitLabel=submitButton.querySelector('span');
  const originalLabel=submitLabel.textContent;
  submitButton.disabled=true;
  submitLabel.textContent='Checking trained model…';
  let prediction;
  try{
    const response=await fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({airline,origin,destination:dest,date:dateString,scheduled_departure_time:Number(timeString.replace(':','')),distance})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Model prediction failed');
    if(!Number.isFinite(result.delay_probability))throw new Error('Model returned an invalid probability');
    prediction={probability:result.delay_probability,routeCount:bucket('route',route)?.[0]||0};
  }catch(err){error.textContent='The trained prediction model is unavailable. Start the Airwise server with python3 predict_api.py and try again.';error.hidden=false;}
  finally{submitButton.disabled=false;submitLabel.textContent=originalLabel;}
  if(!prediction)return;
  const departure=localToUtc(dateString,timeString,AIRPORT_META[origin].tz);const arrival=new Date(departure.getTime()+duration*60000);
  const pct=Math.round(prediction.probability*100), ontime=pct<20, elevated=pct>=HIGH_RISK_THRESHOLD;
  document.querySelector('#risk-value').textContent=`${pct}%`;
  document.querySelector('#risk-ring').style.background=`conic-gradient(${elevated?'#d97706':'#16845f'} 0 ${pct}%,#edf2f7 ${pct}% 100%)`;
  document.querySelector('#risk-meter').style.width=`${Math.min(100,pct)}%`;
  document.querySelector('#risk-overline').textContent=`TRAINED MODEL · ${prediction.routeCount.toLocaleString()} ROUTE RECORDS`;
  document.querySelector('#risk-title').textContent=ontime?'Lower estimated delay risk':elevated?'Higher estimated delay risk':'Some chance of a delay';
  document.querySelector('#risk-description').textContent=`The trained model estimates a ${pct}% chance of departure 15+ minutes late from pre-departure flight details. Actual conditions can change.`;
  document.querySelector('#arrival-time').textContent=formatLocal(arrival,AIRPORT_META[dest].tz,{hour:'numeric',minute:'2-digit'});
  document.querySelector('#arrival-day').textContent=`${formatLocal(arrival,AIRPORT_META[dest].tz,{weekday:'short',month:'short',day:'numeric'})} · ${dest} local`;
  document.querySelector('#duration-time').textContent=formatDuration(duration);
  document.querySelector('#distance-value').textContent=`${Math.round(distance).toLocaleString()} mi`;
  document.querySelector('#result-route-heading').textContent=`${origin} → ${dest} · trained-model outlook`;
  const airlineName=historyData.airlines[airline]||airline;const flightNum=document.querySelector('#flight-number').value.trim();
  document.querySelector('#result-airline-mark').textContent=airline.slice(0,2);
  document.querySelector('#result-flight-meta').textContent=`${airlineName}${flightNum?` · ${airline} ${flightNum}`:''}`;
  document.querySelector('#result-flight-date').textContent=formatLocal(departure,AIRPORT_META[origin].tz,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+` · ${timeString} local`;
  if(track)addToMonitor({origin,destination:dest,airline,airlineName,flightNum,date:dateString,dateLabel:formatLocal(departure,AIRPORT_META[origin].tz,{month:'short',day:'numeric'}),time:timeString,pct,level:pct<20?'low':pct>=HIGH_RISK_THRESHOLD?'high':'medium'});
  paintMap(origin,dest,distance,duration);
  const results=document.querySelector('#results');results.hidden=false;results.scrollIntoView({behavior:'smooth',block:'start'});
}
originSelect.addEventListener('change',updateAirportCaptions);destinationSelect.addEventListener('change',updateAirportCaptions);
document.querySelector('#swap-route').addEventListener('click',()=>{const old=originSelect.value;originSelect.value=destinationSelect.value;destinationSelect.value=old;updateAirportCaptions();});
form.addEventListener('submit',showEstimate);
document.querySelector('#monitor-search').addEventListener('input',renderMonitor);
document.querySelector('#monitor-filter').addEventListener('change',renderMonitor);
document.querySelector('#monitor-rows').addEventListener('click',event=>{
  const button=event.target.closest('[data-monitor-id]');if(button)reviewMonitoredFlight(button.dataset.monitorId);
});
document.querySelector('#operational-alert-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-alert-id]');if(button)reviewMonitoredFlight(button.dataset.alertId);
});
document.querySelector('#edit-flight').addEventListener('click',()=>document.querySelector('#planner').scrollIntoView({behavior:'smooth',block:'start'}));
setAirportOptions(originSelect,DEFAULTS.origin);setAirportOptions(destinationSelect,DEFAULTS.destination);setDateDefault();updateAirportCaptions();
fetch('history.json').then(r=>{if(!r.ok)throw new Error('Historical data unavailable');return r.json()}).then(data=>{historyData=data;fillAirlines(data);updateDatasetStats(data)}).catch(()=>{airlineSelect.innerHTML='<option value="">Historical data unavailable</option>';document.querySelector('.submit-button').disabled=true;document.querySelector('#form-error').textContent='Historical data could not be loaded. Please open the project through a local web server.';});
