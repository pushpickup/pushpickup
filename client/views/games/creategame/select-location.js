Template.devSelectLocation.rendered = function () {
  var template = this;
  var input = template.find('.select-location input');

  // Create autocomplete
  autocomplete = null;
  autocomplete && google.maps.event.clearListeners(autocomplete);
  autocomplete = new google.maps.places.Autocomplete(input);

  google.maps.event.addListener(
    autocomplete, 'place_changed', function () {

      var place = autocomplete.getPlace();
      if (place.utc_offset) {
        Session.set("selectedLocationUTCOffset", place.utc_offset / 60);
      }
      if (place.geometry) {
        Session.set("selectedLocationPoint",
                    geoUtils.toGeoJSONPoint(place.geometry.location));
        Session.set("selectedLocationName", place.name + ", " + place.vicinity);
      }
    }
  );

};