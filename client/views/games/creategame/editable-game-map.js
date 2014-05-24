Template.editableGameMap.helpers({
  hidden: function () {
    return (this.location && this.location.geoJSON ||
            Session.get("selectedLocationPoint")) ?
      "": "hidden";
  }
});

Template.editableGameMap.created = function () {
  var self = this;
  if (self.data.location && self.data.location.geoJSON) {
    Session.set("selectedLocationPoint", self.data.location.geoJSON);
  }
};

Template.editableGameMap.rendered = function () {
  var self = this;
  var map, marker, infowindow;

  geoUtils.toLatLng = function (geoJSONPoint) {
    var lat = geoJSONPoint.coordinates[1];
    var lng = geoJSONPoint.coordinates[0];
    return new google.maps.LatLng(lat, lng);
  };

  self._initMap = Deps.autorun(function (c) {
    if (! Session.get("selectedLocationPoint"))
      return;
    c.stop();

    var latLng = geoUtils.toLatLng(Session.get("selectedLocationPoint"));

    map = new google.maps.Map(
      self.find('.editable-game-map-canvas'), {
        zoom: 15, // 18 also good
        center: latLng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        panControl: false,
        streetViewControl: false,
        minZoom: 3
      });
  });

  self._setMarker = Deps.autorun(function () {
    if (! Session.get("selectedLocationPoint") || !map)
      return;

    var latLng = geoUtils.toLatLng(Session.get("selectedLocationPoint"));

    marker && marker.setMap(null);
    marker = new google.maps.Marker({
      position: latLng, map: map
    });
    map.panTo(latLng);

    infowindow = new google.maps.InfoWindow({
      content: "<a href=\"https://maps.google.com/maps?saddr=My+Location&daddr="+latLng.lat()+","+latLng.lng()+"\" target=\"_blank\">Get directions</a>"
    });

    google.maps.event.addListener(marker, 'click', function() {
      infowindow.open(map,marker);
    });
  });
};

Template.editableGameMap.destroyed = function () {
  this._setMarker && this._setMarker.stop();
  this._initMap && this._initMap.stop(); // b/c might not be already stopped
};