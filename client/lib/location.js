Location = (function() {
  var locationModule = {};

  // unused ?
  locationModule.onPlaceChanged = function (autocomplete) {
    var place = autocomplete.getPlace();
    if (place.geometry) {
      Session.set("selectedLocationPoint",
                  geoUtils.toGeoJSONPoint(place.geometry.location));
      Session.set("selectedLocationName", place.name);
    }
  };

  // If location name has more than two commas,
  // it's probably too long and complicated, so substitute with
  // autocomplete result's "`place.name`,  `place.vicinity`"
  locationModule.simplifyLocation = function (given) {
    if (_.string.count(given,',') > 2) {
      return Session.get("selectedLocationName") || given.split(",", 3).join(",");
    } else {
      return given;
    }
  };

  // Set default location to Berkeley
  locationModule.defaultLocation = {
    "geo" : {
      "type" : "Point",
      "coordinates" : [-122.284786, 37.855271],
    },
    "city" : "Berkeley",
    "state" : "CA"
  };

  locationModule.getUserLocation = function (onSuccess /* optional */) {
    Session.set("get-user-location", "pending");

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {

        var location = {
          "geo" : {
            "type": "Point",
            "coordinates": [
              position.coords.longitude,
              position.coords.latitude
            ]
          }
        };

        Meteor.call("findUserLocation", position, function(err, res) {
          if(!err && res.data.geonames && res.data.geonames.length > 0) {
            res.data.geonames.sort(function(a, b) {
              var keyA = a.population,
                  keyB = b.population;

              if(keyA < keyB) {
                return 1;
              }

              if(keyA > keyB) {
                return -1;
              }

              return 0;
            });

            location.city = res.data.geonames[0].name;
            location.state = res.data.geonames[0].adminCode1;
          }

          AmplifiedSession.set("current-location", location);
          AmplifiedSession.set("user-location-set", true);
          Session.set("get-user-location", "success");
        });

        onSuccess && onSuccess(location);
      }, function() {
        Session.set("get-user-location", "failure");
      }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
    } else {
      Session.set("get-user-location", "failure");
      console.log('Error: Your browser doesn\'t support geolocation.');
    }
  };

  return locationModule;
})();