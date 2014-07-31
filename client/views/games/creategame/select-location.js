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
      var timeStamp, timeZoneApiRequestUrl;
      var timeZoneApiErrorCallback;

      if (place.utc_offset !== void 0) {
        Session.set("selectedLocationUTCOffset", place.utc_offset / 60);
      }
      else {
        // An address not a generic term like "pizza" was specified so the utc_offset was not provided.
        // Google Time Zone API to the rescue.
        timeZoneApiErrorCallback = function() {
          Alerts.throw({
            message: "Hmm, something went wrong trying to figure out the time zone for your game location. Retype the location in the 'Add Venue' field to try again.",
            type: "danger", where: "editGame", autoremove: 3000
          });
        };

        timeStamp = (Date.now() || new Date().getTime())/1000;
        timeZoneApiRequestUrl = "https://maps.googleapis.com/maps/api/timezone/json?location=" +
          place.geometry.location.lat() + "," + place.geometry.location.lng() +
          "&timestamp=" + timeStamp + "&key=AIzaSyD-RvRraZIUUrcrdWtYZx-Ec0vzUGyMFXg";

        $.ajax({
          url: timeZoneApiRequestUrl
        }).done(function(data) {
          try {
            var utcOffset = (data.rawOffset + data.dstOffset || 0) / 3600;
            Session.set("selectedLocationUTCOffset", utcOffset);
          }
          catch(e) {
            timeZoneApiErrorCallback(e.message);
          }

        }).error(function(error) {
          timeZoneApiErrorCallback(error);
        });
      }

      if (place.geometry) {
        Session.set("selectedLocationPoint",
                    geoUtils.toGeoJSONPoint(place.geometry.location));
        Session.set("selectedLocationName", place.name + ", " + place.vicinity);
      }
    }
  );

};