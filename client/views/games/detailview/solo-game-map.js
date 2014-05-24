Template.soloGameMap.rendered = function () {
  var self = this;

  geoUtils.toLatLng = function (geoJSONPoint) {
    var lat = geoJSONPoint.coordinates[1];
    var lng = geoJSONPoint.coordinates[0];
    return new google.maps.LatLng(lat, lng);
  };

  var latLng = geoUtils.toLatLng(self.data.location.geoJSON);

  var map = new google.maps.Map(
    self.find('.solo-game-map-canvas'), {
      zoom: 15, // 18 also good
      center: latLng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      panControl: false,
      streetViewControl: false,
      zoomControl: false,
      minZoom: 3
    });

  var marker = new google.maps.Marker({
    position: latLng, map: map
  });

//  var infowindow = new google.maps.InfoWindow({
//    content: "<a href=\"https://maps.google.com/maps?saddr=My+Location&daddr="+latLng.lat()+","+latLng.lng()+"\" target=\"_blank\">Get directions</a>"
//  });

  google.maps.event.addListener(marker, 'click', function() {
    infowindow.open(map,marker);
  });

  // A weird hack -- I don't know why an immediate `infowindow.open`
  // escapes notice of the default AutoPan. By waiting one second,
  // the map will autopan to accomodate the infowindow.
//  Meteor.setTimeout(function () {
//    infowindow.open(map,marker);
//  }, 1000);


  // Set geoWithin for subscription and determine if subscription exists.
  // Do once only.

  geoUtils.toLatLngBounds = function (geoJSONBounds) {
    // Assumes geoJSONPolygon input with no interior (holes)
    // and with coordinates[0]: 0->SW, 1->NW, 2->NE, 3->SE, 4->SW
    var points = geoJSONBounds.coordinates[0];
    var SW = points[0];
    SW = new google.maps.LatLng(SW[1], SW[0]);
    var NE = points[2];
    NE = new google.maps.LatLng(NE[1], NE[0]);
    return new google.maps.LatLngBounds(SW, NE);
  };

  var idleListener = google.maps.event.addListener(map, 'idle', function () {
    var mapBounds = map.getBounds();
    if (mapBounds) {
      Session.set("geoWithin", geoUtils.toGeoJSONPolygon(mapBounds));
      Session.set("user-sub-intersects-map", (function () {
        return _.some(UserSubs.find().fetch(), function (sub) {
          return mapBounds.intersects(geoUtils.toLatLngBounds(sub.region));
        });
      })());
      google.maps.event.removeListener(idleListener);
    }
  });
};