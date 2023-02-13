window.onload = async function () {
    let data = await fetch('https://api.prometko.cyou/prometSplit/buses/locations').then(res => res.json()).then(res => res.data);
    let busData = await fetch('./buses.json').then(res => res.json());
    let table = document.getElementById('table');
    // sort the data by data[i].vehicle.name
    await data.sort((a, b) => {
        if (a.name.replace(/[^\d-]/g, "") < b.name.replace(/[^\d-]/g, "")) return -1;
        if (a.name.replace(/[^\d-]/g, "") > b.name.replace(/[^\d-]/g, "")) return 1;
        return 0;
    });
    // iterate through the data and create a element
    for (let i = 0; i < data.length; i++) {
        // find bus with same name
        let bus = await busData.find(bus => parseInt(bus.id) == parseInt(data[i].name.replace(/[^\d-]/g, "")));
        if (bus == undefined) {
            bus = {
                id: data[i].name.replace(/[^\d-]/g, ""),
                name: data[i].name,
                type: "Nepoznato",
                model: "Nepoznato",
                plates: "Nepoznato",
                imageUrl: "https://www.autobusi.org/logo_jpg/Autobusi_185x130px.png"
            };
        }
        // console.log(bus);
        // create a card for the bus
        let card = document.createElement('div');
        card.className = 'card margin-bottom';
        // create a card body for the bus
        let cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        // create a card title for the bus
        let cardTitle = document.createElement('h5');
        cardTitle.className = 'card-header';
        cardTitle.innerHTML = `<b>${data[i].name.replace(/[^\d-]/g, "")}</b>` + ` <small>${bus.plates}</small>`;
        // add a text that will float to the right of the card title
        // create a card text for the bus
        let diver = document.createElement('div');
        diver.className = 'row justify-content-between';
        let cardText = document.createElement('p');
        cardText.className = 'card-text col-md-9';
        cardText.innerHTML = `<b>Model: </b>${bus.model}<br>`;
        cardText.innerHTML += `<b>Status: </b>${data[i].departureTime ? "Aktivan" : "<em>Neaktivan</em>"}<br>`;
        cardText.innerHTML += `<hr class="vehicleinfo">`;
        if (data[i].departureTime) {
            cardText.innerHTML += `<p class="vehicleinfo"><b>Linija: </b><b class="route_name_number">${data[i].routeCode}</b> ${data[i].tripName}</p>`;
            cardText.innerHTML += `<hr class="vehicleinfo">`;
        } else {
            cardText.innerHTML += `<p class="vehicleinfo"><b>Zadnja linija: </b><b class="route_name_number">${data[i].routecode}</b> ${data[i].tripname}</p>`;
            cardText.innerHTML += `<hr class="vehicleinfo">`;
        }
        cardText.innerHTML += `<p class="vehicleinfo"><b>Zabilježen: </b>${new Date(data[i].timestamp).toLocaleString('sr-RS').split(" ").join(", u ")}.</p>`;
        diver.appendChild(cardText);
        let imgdiv = document.createElement('div');
        imgdiv.className = 'col-md-3';
        let img = document.createElement('img');
        img.className = 'img-fluid';
        img.src = bus.imageUrl;
        imgdiv.appendChild(img);
        diver.appendChild(imgdiv);

        // append everything to the card body
        card.appendChild(cardTitle);
        cardBody.appendChild(diver);
        // append everything to the card
        card.appendChild(cardBody);
        // append the card to the table
        table.appendChild(card);

    }
}
