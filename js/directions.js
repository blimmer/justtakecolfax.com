var app = app || {};

app.directions = {
	directionsService:new google.maps.DirectionsService(),
	directionsDisplay:new google.maps.DirectionsRenderer({
		suppressMarkers: true
	}),
	places: {
		denver: new google.maps.LatLng(39.737818, -104.984665),
		capitol: new google.maps.LatLng(39.7400447, -104.9844157)
	}
}

function initializeMap() {
	var map = app.directions.map;
	var mapOptions = {
	  zoom: 10,
	  mapTypeId: google.maps.MapTypeId.ROADMAP,
	  center: app.directions.places.denver
	}
	map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);
	app.directions.directionsDisplay.setMap(map);

	getDirections();
}

function getDirections() {
	var directionsRequest = {
		origin: "1900 16th street denver, co 80202",
		destination: "3 S Broadway Denver, CO 80209",
		travelMode: google.maps.TravelMode.DRIVING,
		unitSystem: google.maps.UnitSystem.IMPERIAL,
		waypoints: [
			{
				location:app.directions.places.capitol,
				stopover:true
			}
		]
	}
	app.directions.directionsService.route(directionsRequest, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			app.directions.directionsDisplay.setDirections(response);
		} else {
			alert("status was not OK!");
		}
	});
}