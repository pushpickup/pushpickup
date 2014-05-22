Template.findingsMap.destroyed = function () {
  this._manageMapMarkers && this._manageMapMarkers.stop();
  this._manageSubsDisplay && this._manageSubsDisplay.stop();
  this._syncMapWithSearch && this._syncMapWithSearch.stop();
};

Template.findingsMap.rendered = function () {
  var self = this;

  geoUtils.toLatLng = function (geoJSONPoint) {
    var lat = geoJSONPoint.coordinates[1];
    var lng = geoJSONPoint.coordinates[0];
    return new google.maps.LatLng(lat, lng);
  };

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

  var map = new google.maps.Map(
    self.find('.findings-map-canvas'), {
      zoom: 8, //18 good for one-game zoom
      center: geoUtils.toLatLng(Session.get("selectedLocationPoint")),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      panControl: false,
      streetViewControl: false,
      minZoom: 3
    });

  var geocoder = new google.maps.Geocoder();

  var locationName = {
    sync: function () {
      var self = this;
      geocoder.geocode({'latLng': map.getCenter()}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          // "Generally, addresses are returned from most specific to least specific"
          // https://developers.google.com/maps/documentation/geocoding/#ReverseGeocoding
          var cityResult = _.find(results, self._city);
          var neighborhoodResult = _.find(results.slice().reverse(), self._neighborhood);
          // prefer the name of a neighborhood at high zoom level
          var selectedResult = (map.getZoom() > 13) ?
                (neighborhoodResult || cityResult || results[1] || results[0]) :
                (cityResult || results[1] || results[0]);
          Session.set("selectedLocationName",
                      selectedResult.address_components[0].long_name);
        } else {
          console.log("Geocode was not successful for the following reason: " +
                      status);
        }
      });
    },
    _city: function (result) {
      // "political" and "locality" because that tends to indicate a city
      // source: https://developers.google.com/maps/documentation/geocoding/#Types
      // If only one result type, result.types is a String rather than a
      // one-element Array. Weird.
      var types = (Match.test(result.types, [String])) ?
            result.types : [result.types];
      return (_.contains(types, 'political') &&
              _.contains(types, 'locality'))
        ? result : null;
    },
    _neighborhood: function (result) {
      var types = (Match.test(result.types, [String])) ?
            result.types : [result.types];
      return (_.contains(types, 'neighborhood')) ? result : null;
    }
  };

  google.maps.event.addListener(map, 'idle', function () {
    var mapBounds = map.getBounds();
    if (mapBounds) {
      Session.set("geoWithin", geoUtils.toGeoJSONPolygon(mapBounds));
      Session.set("user-sub-intersects-map", (function () {
        return _.some(UserSubs.find().fetch(), function (sub) {
          return mapBounds.intersects(geoUtils.toLatLngBounds(sub.region));
        });
      })());
      Session.set("map-center", geoUtils.toGeoJSONPoint(map.getCenter()));
    }
    // asynchronous Session.set('selectedLocationName',...)
    locationName.sync();
    Notifications.remove({where: "subscribe"});
  });

  self._syncMapWithSearch = Deps.autorun(function () {
    if (Session.equals("searching", "after")) {
      map.panTo(geoUtils.toLatLng(Session.get("selectedLocationPoint")));
      map.setZoom(8);
      // implicit Session.set('geoWithin',...) via map 'idle' listener
    }
  });

  var markers = {
    _dict: {}, // "dictionary"

    _add: function (game) {
      var self = this;
      if (self._dict[game._id]) {
        return self._dict[game._id];
      } else {
        var latLng, marker;
        latLng = geoUtils.toLatLng(game.location.geoJSON);
        marker = new google.maps.Marker({
          position: latLng,
          map: map
        });
        return self._dict[game._id] = marker;
      }
    },

    _remove: function (game) {
      var self = this;
      var marker = self._dict[game._id];
      if (marker) {
        self._dict[game._id] = undefined;
        marker.setMap(null); // remove from map
        marker = null; // delete
        return true;
      } else {
        return false;
      }
    },

    manage: function () {
      var self = this;
      return Games.find().observe({
        added: function (game) {
          self._add(game);
        },
        // TODO: `changed` callback for (rare) location change
        removed: function (game) {
          self._remove(game);
        }
      });
    }
  };

  self._manageMapMarkers = markers.manage();


  // Display subscriptions

  var subs = {
    _dict: {}, // "dictionary"

    _add: function (sub) {
      var self = this;
      if (self._dict[sub._id]) {
        return self._dict[sub._id];
      } else {
        var bounds, rectangle;
        bounds = geoUtils.toLatLngBounds(sub.region);
        rectangle = new google.maps.Rectangle({
          strokeColor: '#43828F', // @brand-primary
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#43828F',
          fillOpacity: 0.35,
          map: map,
          bounds: bounds
        });
        return self._dict[sub._id] = rectangle;
      }
    },

    _remove: function (sub) {
      var self = this;
      var rectangle = self._dict[sub._id];
      if (rectangle) {
        self._dict[sub._id] = undefined;
        rectangle.setMap(null);
        rectangle = null;
        return true;
      } else {
        return false;
      }
    },

    manage: function () {
      var self = this;
      return UserSubs.find().observe({
        added: function (sub) {
          self._add(sub);
        },
        removed: function (sub) {
          self._remove(sub);
        }
      });
    }
  };

  self._manageSubsDisplay = subs.manage();
};