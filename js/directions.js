var directionDisplay;
var directionsService = new google.maps.DirectionsService();
var map;

function initializeMap() {
	directionsDisplay = new google.maps.DirectionsRenderer();
	var denver = new google.maps.LatLng(39.737818, -104.984665);
	var mapOptions = {
	  zoom: 10,
	  mapTypeId: google.maps.MapTypeId.ROADMAP,
	  center: denver
	}
	map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);
	directionsDisplay.setMap(map);

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
				location:"200 E Colfax Ave, Denver, CO 80203", //capitol building
				stopover:true
			}
		]
	}
	directionsService.route(directionsRequest, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);
		} else {
			alert("status was not OK!");
		}
	});
}