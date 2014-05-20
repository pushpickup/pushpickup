Location = {

  // unused ?
  // onPlaceChanged : function () {
  //   var place = autocomplete.getPlace();
  //   if (place.geometry) {
  //     Session.set("selectedLocationPoint",
  //                 geoUtils.toGeoJSONPoint(place.geometry.location));
  //     Session.set("selectedLocationName", place.name);
  //   }
  // },

  // If location name has more than two commas,
  // it's probably too long and complicated, so substitute with
  // autocomplete result's "`place.name`,  `place.vicinity`"
  simplifyLocation : function (given) {
    if (_.string.count(given,',') > 2) {
      return Session.get("selectedLocationName") || given.split(",", 3).join(",");
    } else {
      return given;
    }
  },

  // Set default location to Berkeley
  defaultLocation : {
    "geo" : {
      "type" : "Point", 
      "coordinates" : [-122.284786, 37.855271],  
    },
    "city" : "Berkeley",
    "state" : "CA"
  },

  getUserLocation : function (onSuccess /* optional */) {

    Session.set("get-user-location", "pending");
    if(navigator.geolocation) {    
      navigator.geolocation.getCurrentPosition(function(position) {

        var location = {
          "geo" : {
            "type": "Point",
            "coordinates": [position.coords.longitude,
                          position.coords.latitude]
          }
        };

        // console.log(position.coords.longitude + ", " + position.coords.latitude);
        // console.log("https://maps.googleapis.com/maps/api/geocode/json?latlng="+point.coordinates[1]+","+point.coordinates[0]+"&sensor=true");
        
        HTTP.get("http://api.geonames.org/findNearbyPlaceNameJSON?lat="+position.coords.latitude+"&lng="+position.coords.longitude+"&radius=5&cities=cities1000&style=medium&username="+GEONAMES_USERNAME,
          {}, function(err, res) {
            if(err)
            {
              // console.log(err);

              // This set of three lines is repeated in the code, needs to be put in a function.
              AmplifiedSession.set("current-location", location);
              AmplifiedSession.set("user-location-set", true);
              Session.set("get-user-location", "success");

            } else {

              if(!res.data.geonames)
              {
                // console.log("register an account on geonames.com, activate it, and set the username in client/config.js");
                // console.log(res.data.status.message);

                AmplifiedSession.set("current-location", location);
                AmplifiedSession.set("user-location-set", true);
                Session.set("get-user-location", "success");

              } else {
                res.data.geonames.sort(function(a, b) {
                  var keyA = a.population,
                      keyB = b.population;

                  if(keyA < keyB) return 1;
                  if(keyA > keyB) return -1;
                  return 0;
                });

                // console.log(res.data.geonames);

                location.city = res.data.geonames[0].name;
                location.state = res.data.geonames[0].adminCode1;

                AmplifiedSession.set("current-location", location);
                AmplifiedSession.set("user-location-set", true);
                Session.set("get-user-location", "success");
              }
              // Save to user account
              // if(Meteor.user()) {
              //   Meteor.call('saveUserLocation', location, function (err, res) {
              //     // handle error
              //     if(err)
              //       console.log(err);
              //   });
              // }
            }
          });

        onSuccess && onSuccess(location);
      }, function() {
        Session.set("get-user-location", "failure");
      }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
    } else {
      Session.set("get-user-location", "failure");
      console.log('Error: Your browser doesn\'t support geolocation.');
    }
  },

}