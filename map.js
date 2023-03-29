let map = L.map('map', { zoomControl: false }).setView([43.508133, 16.440193], 13);
let busLayer = L.layerGroup().addTo(map);
let stopLayer = L.layerGroup().addTo(map);
let polyLineLayer = L.layerGroup().addTo(map);
let markers = [];
let stopMarkers = [];
let     stopObject = [];
let routeObject = [];
let lineObject = [];
let busObject = [];

let BASE_API_URL = "https://api.split.prometko.si/" // https://api.prometko.cyou

const delay = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }


async function mapf() {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    var LAYER_CONTROL = L.control.layers().addTo(map);
    L.control.locate({ position: `topright` }).addTo(map);
    LAYER_CONTROL.addOverlay(busLayer, "Buses");
    LAYER_CONTROL.addOverlay(stopLayer, "Stops");
}

async function main() {
    mapf();
    stopObject = await fetch(BASE_API_URL + 'stops').then(response => response.json()).then(data => data.data);
    busObject = await fetch('./buses.json').then(response => response.json());
    //lineObject = await fetch(BASE_API_URL + '/arrivaPiran/lines').then(response => response.json()).then(data => data.data);
    //showStops();
    while (true) {
        let buses = await fetch(BASE_API_URL + 'vehicles').then(response => response.json()).then(data => data.data);
        // show on map
        for (let bus of buses) {
            if (bus.garageNumber.replace(/[^\d.-]/g, "") == "") continue;
            if (markers[bus.id]) {
                markers[bus.id].setLatLng([bus.latitude, bus.longitude]);
                markers[bus.id].data = bus;
                markers[bus.id].id = bus.id;
                if (new Date() - new Date(bus.timestamp) < 300 * 1000) {
                    markers[bus.id].setIcon(
                        L.divIcon({
                            className: 'icon-vehicle',
                            iconSize: [25, 25],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, 0],
                            html: `<p class="icon">${bus.routeShortName}</p><img class="icon-pointer" style="transform: rotate(${bus.bearing + 225}deg)" src="img/ico/rotIcoActive.svg"/><div class="tooltip-vehicle">${bus.garageNumber}</div>`
                        }));
                    markers[bus.id].setOpacity(1);
                } else {
                    markers[bus.id].setIcon(
                        L.divIcon({
                            className: 'icon-inactive',
                            iconSize: [25, 25],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, 0],
                            html: `<p class="icon">${bus.routeShortName}</p><img class="icon-pointer" style="transform: rotate(${bus.bearing + 225}deg)" src="img/ico/rotIcoActive.svg"/><div class="tooltip-inactive">${bus.garageNumber}</div>`
                        }));
                    markers[bus.id].setOpacity(0.5);
                    // if its more than 15min, fade it out until 1h to 0.1
                    if (new Date() - new Date(bus.timestamp) > 900000) {
                        let opacity = (new Date(bus.timestamp) - new Date()) / 900000;
                        opacity = opacity < 0.15 ? 0.15 : opacity;
                        markers[bus.id].setOpacity(opacity);
                    }
                }
            } else {
                markers[bus.id] = L.marker([bus.latitude, bus.longitude]).addTo(busLayer);
                // check last letter of stop name - if it's B, then use a different colour
                markers[bus.id].data = bus;
                markers[bus.id].id = bus.id;
                if (new Date() - new Date(bus.timestamp) < 300 * 1000) {
                    markers[bus.id].setIcon(
                        L.divIcon({
                            className: 'icon-vehicle',
                            iconSize: [25, 25],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, 0],
                            html: `<p class="icon">${bus.routeShortName}</p><img class="icon-pointer" style="transform: rotate(${bus.bearing + 225}deg)" src="img/ico/rotIcoActive.svg"/><div class="tooltip-vehicle">${bus.garageNumber}</div>`
                        }));
                    markers[bus.id].setOpacity(1);
                } else {
                    markers[bus.id].setIcon(
                        L.divIcon({
                            className: 'icon-inactive',
                            iconSize: [25, 25],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, 0],
                            html: `<p class="icon">${bus.routeShortName}</p><img class="icon-pointer" style="transform: rotate(${bus.bearing + 225}deg)" src="img/ico/rotIcoInactive.svg"/><div class="tooltip-inactive">${bus.garageNumber}</div>`
                        }));
                    markers[bus.id].setOpacity(0.5);
                    // if its more than 15min, fade it out until 1h to 0.1
                    if (new Date() - new Date(bus.timestamp) > 900000) {
                        let opacity = (new Date(bus.timestamp) - new Date()) / 900000;
                        opacity = opacity < 0.15 ? 0.15 : opacity;
                        markers[bus.id].setOpacity(opacity);
                    }
                }
                markers[bus.id].on('click', async (e) => {
                    // generate popup content
                    showBusInfo(e.target.data);
                });
            }
        }
        await delay(10000);
    }
}

async function showBusInfo(bus) {
    let bottomData = document.getElementById('bottom-data');
    let routeInfo = document.createElement('div');
    routeInfo.className = 'route-info';
    routeInfo.innerHTML = `<div class="exit-button" onclick="document.getElementById('bottom-data').hidden = true; document.getElementById('bottom-data').innerHTML=''; polyLineLayer.clearLayers();"><i class="bi bi-x-lg"></i></div>`;
    // find the bus with the same parseInt(busObject.id) == parseInt(bus.id)
    let busData = await busObject.find(b => parseInt(b.id) == parseInt(bus.garageNumber.replace(/[^\d-]/g, "")));
    if (busData == undefined) {
        busData = {
            model: "Nepoznat autobus",
            imageUrl: "./img/neznam.png",
            unknown: true
        }
    }
    let tempLayer = L.layerGroup();
    let container = document.createElement('div');
    container.id = bus.id;
    container.className = 'container';
    let row = document.createElement('div');
    row.className = 'row';
    let leftdiv = document.createElement('div');
    leftdiv.className = 'col-sm-3 bus-image px-0 mx-0';
    leftdiv.innerHTML = ` <img src="${busData.imageUrl}" class="bus">`
    let rightdiv = document.createElement('div');
    rightdiv.className = 'col-sm-9';
    rightdiv.innerHTML += `<br class="desktop-hidden" style="height:0.5rem"><h2 class="vehicleinfo">${bus.garageNumber.replace(/[^\d-]/g, "")} ${busData.unknown ? "" : `(${busData.plates})`}</h2>`;
    rightdiv.innerHTML += `<small class="vehicleinfo">${busData.unknown ? busData.model : `${busData.model} (${busData.type})`}</small><hr>`
    let route_data = await fetch(BASE_API_URL + 'vehicle/' + bus.id).then(res => res.json());
    if (new Date() - new Date(bus.timestamp) < 300 * 1000 && route_data.success) {
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Linija:</b> <span class="route_name_number">${bus.routeShortName}</span> <span id="route_name">${route_data.data.fulfilmentRecord.pathwayName}</span></p>`;
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Zabilježen: </b>${new Date(bus.timestamp).toLocaleString('sl-SI').split(",  ").join(", u ")}</p>`;
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Brzina: </b>${parseInt(route_data.data.currentSpeed)} km/h</p><hr>`;
        row.appendChild(leftdiv);
        row.appendChild(rightdiv);
        container.appendChild(row);
        let table = document.createElement('table');
        table.style.width = '100%';
        table.class = 'table table-dark'; 
        for (let stop of route_data.data.fulfilmentRecord.stops) {
            let tr = document.createElement('tr');
            let td = document.createElement('td');
            td.innerHTML = `<b>${stop.name}</b>`;
            tr.appendChild(td);
            td = document.createElement('td');
            td.style.textAlign = 'right';
            let planned = stop.plannedDepartureTime.substring(11,16);
            let actual = stop.expectedDepartureTime.substring(11,16);
            if (route_data.data.nextStopIndex == 0) {
                actual = planned;
            }
            td.innerHTML = `<span style="${planned != actual ? "text-decoration: line-through;" : ""}">${planned}</span> ${planned == actual ? "" : `<span>${actual}</span>`}`;
            tr.appendChild(td);
            if (route_data.data.nextStopIndex == route_data.data.fulfilmentRecord.stops.indexOf(stop) && stop.stopExitedTime == null) {
                tr.style.backgroundColor = '#102A83';
                tr.style.color = 'white';
            }
            if (stop.stopExitedTime != null || route_data.data.nextStopIndex - 1 > route_data.data.fulfilmentRecord.stops.indexOf(stop)) {
                tr.style.color = 'grey';
                tr.style.fontSize = '0.8rem';
            }
            table.appendChild(tr);
        }
        container.appendChild(table);
    } else {
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Linija:</b> <span class="route_name_number">${bus.routeShortName}</span></p>`;
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Zabilježen: </b>${new Date(bus.timestamp).toLocaleString('sl-SI').split(",  ").join(", u ")}</p><hr>`;
        rightdiv.innerHTML += `<p class="vehicleinfo">Vozilo nije aktivno te je označena njegova zadnja poznata lokacija.</p>`;
        row.appendChild(leftdiv);
        row.appendChild(rightdiv);
        container.appendChild(row);
        container.innerHTML += `<hr>`;
    }
    routeInfo.appendChild(container);
    bottomData.innerHTML = '';
    bottomData.appendChild(routeInfo);
    bottomData.hidden = false;
    polyLineLayer.clearLayers();
    polyLineLayer = await tempLayer;
    polyLineLayer.addTo(map);
    if (new Date() - new Date(bus.timestamp) < 300 * 1000 && route_data.success) {
        let polylines = await fetch(BASE_API_URL + 'service/' + route_data.data.fulfilmentRecord.serviceCalendarId + '/geometry').then(res => res.json());
        let points = []
        for (let pointset of polylines.data.pathwaySegments) {
            points = points.concat(await pointset.geography.coordinates.map(x => { return x.reverse() }));
        }
        // deduplicate points
        await L.polyline.antPath(points, { "delay": 4000, color: '#102A83', weight: 6, opacity: 0.7, smoothFactor: 1 }).addTo(tempLayer);
        for (let stop of polylines.data.stations) {
            // find id in stopObject
            let stopId = stopObject.find(x => x.id == stop.id);
            await L.marker([stopId.geography.coordinates[1], stopId.geography.coordinates[0]]).addTo(tempLayer).setIcon(
                L.divIcon({
                    className: 'icon-station',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                    popupAnchor: [0, 0],
                })
            ).bindTooltip(`${stopId.name} <small>(${stopId.id})</small>`);
        }
    }
    await delay(10000);
    if (document.getElementById(bus.id)) {
        // refresh
        showBusInfo(markers[bus.id].data);
    }
}

async function showStops() {
    stopObject.forEach(async stop => {
        stopMarkers[stop.stopId] = await L.marker([stop.lat, stop.lon], {
            icon: L.divIcon({
                className: 'icon-station',
                iconSize: [15, 15],
                iconAnchor: [7, 7],
                popupAnchor: [0, 0],
                html: ``
            }),
            title: `${stop.stopId} ${stop.name}`
        })
            .bindTooltip(`<b>${stop.stopId}</b> ${stop.name}`, {
            })
            .addTo(stopLayer);
        stopMarkers[stop.stopId].data = stop;
        stopMarkers[stop.stopId].on('click', async (e) => {
            // generate popup content
            showStopInfo(stopMarkers[e.target.data.stopId].data);
        });
    });

}

document.getElementById('search-input').addEventListener('keyup', async (e) => {
    document.getElementById('sidebar').hidden = true;
    let search = document.getElementById('search-input').value.toUpperCase().replace(/Š/g, 'S').replace(/Đ/g, 'D').replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Ž/g, 'Z');
    // remove spaces and make uppercase
    search = search.replace(/\s/g, '').toUpperCase();
    if (search === '' || search.length < 2) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }
    let results = [];
    //console.log(busObject);
    for (let i in markers) {
        let busData = await busObject.find(b => parseInt(b.id) == parseInt(markers[i].data.name.replace(/[^\d-]/g, "")));
        if (markers[i].data.stations && (markers[i].data.routeShortName.toString().toUpperCase().includes(search)
            || markers[i].data.tripName.toUpperCase().replace(/Š/g, 'S').replace(/Đ/g, 'D').replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Ž/g, 'Z').includes(search)
            || markers[i].data.name.toUpperCase().includes(search))) {
            results.push(markers[i].data);
        } else if (busData && busData.model.toUpperCase().includes(search)) {
            results.push(markers[i].data);
        } else if (busData && busData.plates.toUpperCase().includes(search)) {
            results.push(markers[i].data);
        } else if (markers[i].data.name.toUpperCase().includes(search)) {
            results.push(markers[i].data);
        }
    }
    if (results.length === 0) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }
    // if there is results, show them - make UL
    let ul = document.createElement('ul');
    // list-group
    ul.className = 'list-group';
    results.forEach(async result => {
        let li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = result.stations ? `<span class="route_name_number">${result.routeShortName}</span> g.br. <b>${result.name.replace(/[^\d-]/g, "")}</b>` : `g.br. <b>${result.name.replace(/[^\d-]/g, "")}</b>`;
        li.addEventListener('click', async (e) => {
            // find marker with same id, and center on it on zoom level 16
            document.getElementById('search-results').innerHTML = '';
            let marker = markers[result.id];
            map.setView(marker.getLatLng(), 16);
            showBusInfo(result);
        });
        ul.appendChild(li);
    });
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results').appendChild(ul);
});

/*
autobusi.org scraper
document.querySelectorAll('table').forEach(async table => {
    await table.querySelectorAll('a').forEach(async a => {
        await console.log(`${parseInt(a.innerHTML)},${a.href}`);
    });
});
*/

main();
