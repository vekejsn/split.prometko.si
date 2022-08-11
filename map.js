let map = L.map('map', { zoomControl: false }).setView([43.508133, 16.440193], 13);
let busLayer = L.layerGroup().addTo(map);
let stopLayer = L.layerGroup().addTo(map);
let polyLineLayer = L.layerGroup().addTo(map);
let markers = [];
let stopMarkers = [];
let stopObject = [];
let routeObject = [];
let lineObject = [];
let busObject = [];

let BASE_API_URL = "https://api.prometko.cyou"

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
    stopObject = await fetch(BASE_API_URL + '/prometSplit/stops').then(response => response.json()).then(data => data.data);
    busObject = await fetch('./st-tracker/buses.json').then(response => response.json());
    //lineObject = await fetch(BASE_API_URL + '/arrivaPiran/lines').then(response => response.json()).then(data => data.data);
    //showStops();
    while (true) {
        let buses = await fetch(BASE_API_URL + '/prometSplit/buses/locations').then(response => response.json()).then(data => data.data);
        // show on map
        for (let bus of buses) {
            if (bus.name.replace(/[^\d.-]/g, "") == "") continue;
            if (markers[bus.id]) {
                markers[bus.id].setLatLng([bus.latitude,bus.longitude]);
                markers[bus.id].data = bus;
                markers[bus.id].id = bus.id;
                markers[bus.id].setIcon(
                    L.divIcon({
                        className: 'icon-vehicle',
                        iconSize: [25, 25],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, 0],
                        html: `<p class="icon">${bus.routeCode}</p> <div class="tooltip-vehicle">${bus.name.replace(/[^\d-]/g, "")}</div>`
                    })
                );
            } else {
                markers[bus.id] = L.marker([bus.latitude,bus.longitude]).addTo(busLayer);
                // check last letter of stop name - if it's B, then use a different colour
                markers[bus.id].data = bus;
                markers[bus.id].id = bus.id;
                markers[bus.id].setIcon(
                    L.divIcon({
                        className: 'icon-vehicle',
                        iconSize: [25, 25],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, 0],
                        html: `<p class="icon">${bus.routeCode}</p> <div class="tooltip-vehicle">${bus.name.replace(/[^\d-]/g, "")}</div>`
                    })
                );
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
    console.log(bus);
    let bottomData = document.getElementById('bottom-data');
    let routeInfo = document.createElement('div');
    routeInfo.className = 'route-info';
    routeInfo.innerHTML = `<div class="exit-button" onclick="document.getElementById('bottom-data').hidden = true; document.getElementById('bottom-data').innerHTML=''; polyLineLayer.clearLayers();"><i class="bi bi-x-lg"></i></div>`;
    // find the bus with the same parseInt(busObject.id) == parseInt(bus.id)
    let busData = await busObject.find(b => parseInt(b.id) == parseInt(bus.name.replace(/[^\d-]/g, "")));
    if (busData == undefined) {
        busData = {
            model: "Nepoznat autobus",
            imageUrl: "https://i.imgur.com/Sq32zSp.png",
            unknown: true
        }
    }
    console.log(busData);
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
    rightdiv.innerHTML += `<br class="desktop-hidden" style="height:0.5rem"><h2 class="vehicleinfo">${bus.name.replace(/[^\d-]/g, "")} ${busData.unknown ? "" : `(${busData.plates})`}</h2>`;
    rightdiv.innerHTML += `<small class="vehicleinfo">${busData.unknown ? busData.model : `${busData.model} (${busData.type})`}</small><hr>`
    rightdiv.innerHTML += `<p class="vehicleinfo"><b>Linija:</b> <span class="route_name_number">${bus.routeCode}</span> ${bus.tripName}</p>`;
    if (bus.nextStopId) {
        // resolve the stop
        let nextStop = stopObject.find(stop => stop.id == bus.nextStopId);
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Sljedeća stanica:</b> ${nextStop.name} <small>(${nextStop.id})</small></p>`;
    }
    if (bus.currentStopId && !bus.nextStopId) {
        // resolve the stop
        let nextStop = stopObject.find(stop => stop.id == bus.currentStopId);
        rightdiv.innerHTML += `<p class="vehicleinfo"><b>Trenutna stanica:</b> ${nextStop.name} <small>(${nextStop.id})</small></p>`;
    }
    rightdiv.innerHTML += `<p class="vehicleinfo"><b>Zabilježen: </b>${new Date(bus.timestamp).toLocaleString('sr-RS').split(" ").reverse().join(", ")}</p>`;
    row.appendChild(leftdiv);
    row.appendChild(rightdiv);
    container.appendChild(row);
    container.innerHTML += `<hr>`;
    // iterate through stations and generate view
    let table = document.createElement('table');
    table.style.width = '100%';
    table.class = 'table table-dark';
    // from our currentStopId or nextStopId, get the current stop, and from that the index of the stop in bus.stations
    let currentStop = await bus.stations.find(stop => stop.id == bus.currentStopId);
    let currentStopIndex = bus.stations.findIndex(stop => stop.id == bus.currentStopId);
    let nextStop = await bus.stations.find(stop => stop.id == bus.nextStopId);
    let nextStopIndex = bus.stations.findIndex(stop => stop.id == bus.nextStopId);
    let index = currentStopIndex != -1 ? currentStopIndex : nextStopIndex;
    for (let i = 0; i < bus.stations.length; i++) {
        let stop = await stopObject.find(x => x.id == bus.stations[i].id);
        if (i == 0 && bus.currentStopIndex == 0) {
            table.innerHTML += `<tr class="stop-table-row" style='background-color: #102A83 !important; color:white'><td class="station-name" ><b>${stop.name}</b></td><td class="station-time">${bus.stations[i].plannedDepartureTime}</td></tr>`;
        } else {
            // compare the planned and expected departure time, and show the difference
            let planned = bus.stations[i].plannedArrivalTime.split(":");
            let expected = bus.stations[i].expectedArrivalTime.split(":");
            planned = parseInt(planned[0]) * 60 * 60 + parseInt(planned[1]) * 60 + parseInt(planned[2]);
            expected = parseInt(expected[0]) * 60 * 60 + parseInt(expected[1]) * 60 + parseInt(expected[2]);
            let difference = expected - planned;
            let differenceHours = Math.floor(difference / (60 * 60));
            let differenceMinutes = Math.floor((difference - differenceHours * 60 * 60) / 60);
            let differenceSeconds = Math.floor(difference - differenceHours * 60 * 60 - differenceMinutes * 60);
            //console.log(differenceHours, differenceMinutes, differenceSeconds);
            // check if bus.currentStopId || bus.nextStopId is equal to stop.id
            if (bus.currentStopId == stop.id || bus.nextStopId == stop.id) {
                // if it is, then highlight the row
                table.innerHTML += `<tr class="stop-table-row" style='background-color: #102A83 !important; color:white'><td class="station-name"><b>${stop.name}</b><br>
                ${difference > 60 ? `<small>Kasni ${differenceHours > 0 ? differenceHours + "h" : ""} ${differenceMinutes > 0 ? differenceMinutes + " min" : ""}</small>`: ""}
                </td><td class="station-time">
                ${bus.stations[i].expectedArrivalTime.split('.')[0]}</td></tr>`;
            } else if (i > index) {
                table.innerHTML += `<tr class="stop-table-row" style="font-size:0.75rem"><td class="station-name"><b>${stop.name}</b><br>
                ${difference > 60 ? `<small>Kasni ${differenceHours > 0 ? differenceHours + "h" : ""} ${differenceMinutes > 0 ? differenceMinutes + " min" : ""}</small>`: ""}
                </td><td class="station-time">
                ${bus.stations[i].expectedArrivalTime.split('.')[0]}</td></tr>`;
            } else if ( i < index) {
                table.innerHTML += `<tr class="stop-table-row" style="color:grey; font-size:0.75rem"><td class="station-name"><b>${stop.name}</b><br>
                ${difference > 60 ? `<small>Kasnio ${differenceHours > 0 ? differenceHours + "h" : ""} ${differenceMinutes > 0 ? differenceMinutes + " min" : ""}</small>`: ""}
                </td><td class="station-time">
                ${bus.stations[i].expectedArrivalTime.split('.')[0]}</td></tr>`;
            }
        }     
    }
    container.appendChild(table);
    routeInfo.appendChild(container);
    bottomData.innerHTML = '';
    bottomData.appendChild(routeInfo);
    bottomData.hidden = false;
    // fetch https://api.prometko.cyou/prometSplit/route/trips/${bus.tripId}
    let trip = await fetch(BASE_API_URL + `/prometSplit/route/trips/${bus.tripId}`).then(response => response.json()).then(data => data.data);
    let coordinates = [];
    let tempLayer = L.layerGroup();
    for (let pathway of trip.pathwaySegments) {
        //console.log(pathway);
        // find stop with id == pathway.startPoint.id
        let stop = await stopObject.find(x => x.id == pathway.startPoint.id);
        // if we are on the last stop, then we need to find the end point
        //console.log(stop);
        await L.marker([stop.geography.coordinates[1],stop.geography.coordinates[0]]).addTo(tempLayer).setIcon(
            L.divIcon({
                className: 'icon-station',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                popupAnchor: [0, 0],
            })
        ).bindTooltip(`${stop.name} <small>(${stop.id})</small>`);
        if (pathway.endPoint.id == bus.stations[bus.stations.length - 1].id) {
            stop = await stopObject.find(x => x.id == bus.stations[bus.stations.length - 1].id);
            await L.marker([stop.geography.coordinates[1],stop.geography.coordinates[0]]).addTo(tempLayer).setIcon(
                L.divIcon({
                    className: 'icon-station',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                    popupAnchor: [0, 0],
                })
            ).bindTooltip(`${stop.name} <small>(${stop.id})</small>`);
        }
        coordinates = await coordinates.concat(await pathway.geography.coordinates.map(x => {return x.reverse()}));
    }
    //console.log(coordinates);
    await L.polyline.antPath(coordinates, {"delay": 4000, color: '#102A83', weight: 6, opacity: 0.7, smoothFactor: 1}).addTo(tempLayer);
    polyLineLayer.clearLayers();
    polyLineLayer = await tempLayer;
    polyLineLayer.addTo(map);

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

/*
autobusi.org scraper
document.querySelectorAll('table').forEach(async table => {
    await table.querySelectorAll('a').forEach(async a => {
        await console.log(`${parseInt(a.innerHTML)},${a.href}`);
    });
});
*/

main();
