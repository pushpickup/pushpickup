Session.toggle = function (key) {
  var val1 = true;
  var val2 = false;
  if (arguments.length === 3) { // val1 and val2 passed in
    val1 = arguments[1];
    val2 = arguments[2];
  }
  if (Session.equals(key, val1)) {
    Session.set(key, val2);
  } else {
    Session.set(key, val1);}};
var toggleInclusion = function (set, val) {
  if (_.contains(set, val)) {
    return _.reject(set, function (elt) { return elt === val; } );
  } else {
    // concat breaks the set abstraction, but _.union requires array args
    return set.concat(val);
  }
};

Session.setDefault("startsAtRange", [
    +moment().startOf('hour'),
    +moment().startOf('hour').add(1, 'weeks')]);
Session.setDefault("dateRanges", [{
  gte: moment().startOf('hour').toDate(),
  lt: moment().startOf('hour').add(1, 'weeks').toDate()
}]);
// Polymer coordinates is an array of
// LinearRing coordinate arrays. Confusing as fuck.
Session.setDefault("geoWithin", { // Berkeley!
  type: "Polygon",
  coordinates: [[[-122.409603,37.937563],
                 [-122.134944,37.937563],
                 [-122.134944,37.774920],
                 [-122.409603,37.774920],
                 [-122.409603,37.937563]]]});
Session.setDefault("gameDays", [0,1,2,3,4,5,6]);
Session.setDefault("pageNum", 0);
Session.setDefault("selectedLocationPoint", null);
Session.setDefault("selectedLocationName", null);
Session.setDefault("addingGame", false);
Session.setDefault("editingGame", false);
Session.setDefault(
  "gameTypes",
  _.pluck(GameOptions.find({option: "type"}).fetch(), 'value')
);

// subscribe to games
Deps.autorun(function () {
  if (Session.equals("dev-mode", true))
    return;

  var query = {};
  query.dateRanges = Session.get("dateRanges");
  query.geoWithin  = Session.get("geoWithin");
  query.gameTypes  = Session.get("gameTypes");
  Session.set("gamesReady", false);
  Meteor.subscribe(
    "games", query, Session.get("pageNum"), function () {
      Session.set("gamesReady", true);
    });
});

var autocomplete = null;
var geocoder, codeAddress;
map = null;
markers = [];
var newLocMarker = null;
var markerFor, deleteMarkers, showMarkers;
var tryHTML5Geolocation;

geoUtils = {};
geoUtils.milesToMeters = function (miles) {
  return miles * 1609.34;
};
geoUtils.toGeoJSONPoint = function (latLng) {
  return {type: "Point", coordinates: [latLng.lng(), latLng.lat()]};
};
geoUtils.toGeoJSONPolygon = function (latLngBounds) {
  var SW = latLngBounds.getSouthWest();
  var NE = latLngBounds.getNorthEast();
  var corners = {
    sw: [SW.lng(), SW.lat()],
    nw: [SW.lng(), NE.lat()],
    ne: [NE.lng(), NE.lat()],
    se: [NE.lng(), SW.lat()]
  };
  return {
    type: "Polygon",
    coordinates: [[corners.sw, corners.nw,
                   corners.ne, corners.se,
                   corners.sw]]};
};
geoUtils.toGeoJSONMultiPoint = function (latLngBounds) {
  var SW = latLngBounds.getSouthWest();
  var NE = latLngBounds.getNorthEast();
  SW = [SW.lng(), SW.lat()];
  NE = [NE.lng(), NE.lat()];
  return {
    type: "MultiPoint",
    coordinates: [SW, NE]
  };
};

// When the user selects a city, get the place details for the city and
// zoom the map in on the city.
var onPlaceChanged = function () {
  var place = autocomplete.getPlace();
  if (place.geometry) {
    var latLng = place.geometry.location;
    map.panTo(latLng);
    map.setZoom(12);
    Session.set("selectedLocationPoint", geoUtils.toGeoJSONPoint(latLng));
    Session.set("selectedLocationName",place.formatted_address);
  } else {
    document.getElementById('locationSearchBox').placeholder = 'Location';
  }
};

var initializeMapStuff = _.once(function(c) {
  google.maps.visualRefresh = true;
  geocoder = new google.maps.Geocoder();

  // Initialize map to Grove Park, Berkeley, CA USA
  var mapOptions = {
    zoom: 12, //18 good for one-game zoom
    center: new google.maps.LatLng(37.856287,-122.272274),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    panControl: false,
    streetViewControl: false,
    minZoom: 3
  };
  map = new google.maps.Map(
    document.getElementById('map-canvas'), mapOptions);

  geoUtils.toLatLng = function (geoJSONPoint) {
    var lat = geoJSONPoint.coordinates[1];
    var lng = geoJSONPoint.coordinates[0];
    return new google.maps.LatLng(lat, lng);
  };

  var littleMarkerIcon = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: 'red',
    fillOpacity: .4,
    scale: 4.5,
    strokeColor: 'white',
    strokeWeight: 1
  };

  var icon = {
    normal: "/red-dot.png",
    active: "/yellow-dot.png"
  };

  markerFor = function (game) {
    var latLng, marker;
    latLng = geoUtils.toLatLng(game.location.geoJSON);
    marker = new google.maps.Marker({
      position: latLng,
      icon: icon.normal
    });
    marker.set("game", game._id);
    return marker;
  };

  deleteMarkers = function () {
    if (markers) {
      for (i in markers) {
        markers[i].setMap(null);
      }
      markers.length = 0;
    }
  };

  showMarkers = function () {
    if (markers) {
      for (i in markers) {
        markers[i].setMap(map);
      }
    }
  };

  codeAddress = function (address) {
    geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        // What is results[0]? I guess there's at least one result,
        // and result[0] is most specific. Each result has a
        // geometry.location, which is a google.maps.LatLng
        var latLng = results[0].geometry.location;
        map.panTo(latLng);
        map.setZoom(12);
        //map.setCenter(latLng);
      } else {
        alert("Geocode was not successful for the following reason: " +
              status);
      }
    });
  };

  tryHTML5Geolocation = function (map) {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var pos = new google.maps.LatLng(position.coords.latitude,
                                         position.coords.longitude);
        map.panTo(pos);
      }, function() {
        alert('Error: The Geolocation service failed.');
      });
    } else {
      console.log('Error: Your browser doesn\'t support geolocation.');
    }
  };

  refreshMarkers = function () {
    // when adding/editing a game, the only marker displayed
    // should correspond to the user-selected location, if any,
    // so abort this.
    if (Session.equals("addingGame", true) ||
        Session.equals("editingGame", true)) return;

    deleteMarkers();
    var solo = Games.findOne(Session.get("soloGame"));
    if (solo) {
      markers.push(markerFor(solo));
    } else {
      Games.find().forEach(function (game) {
        markers.push(markerFor(game));
      });
    }
    showMarkers();
    _.each(markers, function (marker) {
      google.maps.event.addListener(marker, 'click', function() {
        Session.toggle("selectedGame", marker.get("game"), null);
      });
      google.maps.event.addListener(marker, 'mouseover', function() {
        Session.set("activeGame", marker.get("game"));
      });
      google.maps.event.addListener(marker, 'mouseout', function() {
        Session.set("activeGame", null);
      });
    });
  };

  // Keep map markers consistent with games listed, deleting and
  // adding markers.
  Deps.autorun(refreshMarkers);

  // Highlight active game on map with special marker
  var highlightActiveMarker = (function() {
    var m, activeGame, prevActiveGame = null;
    var zIndex = google.maps.Marker.MAX_ZINDEX + 1;
    var findMarker = function (game) {
      // with <=10 markers, O(n) find is fine
      return _.find(markers, function (m) {
        return m.get("game") === game;
      });
    };
    return function () {
      // highlighting is confusing given a solo game
      if (Session.equals("soloGame", true)) return;

      activeGame = Session.get("activeGame");
      if (markers.length === 0) return;
      if (prevActiveGame) {
        m = findMarker(prevActiveGame);
        // perhaps map moved, so marker no longer exists
        m ? m.setIcon(icon.normal) : prevActiveGame = null;
      }
      if (activeGame) {
        m = findMarker(activeGame);
        if (m) m.setIcon(icon.active);
        if (m) m.setZIndex(zIndex++);// bring to front
        prevActiveGame = activeGame;
      }
    };
  })();

  Deps.autorun(highlightActiveMarker);


  // help sync Games with map bounds
  google.maps.event.addListener(map, 'idle', function () {
    map.getBounds() && Session.set(
      "geoWithin", geoUtils.toGeoJSONPolygon(map.getBounds()));
    Session.set("mapCenter",
                geoUtils.toGeoJSONPoint(map.getCenter()));
  });

  // When adding/editing game, clear map of markers and
  // listen for map clicks to set Session.selectedLocationPoint.
  // When no longer adding/editing game, remove map click handler and
  // refresh markers. Also, reset pageNum to 0.
  var removeListener = google.maps.event.removeListener;
  var addListener = google.maps.event.addListener;
  var locationSelectListener = null;
  Deps.autorun(function () {
    if (Session.equals("addingGame", true) ||
        Session.equals("editingGame", true)) {
      deleteMarkers();
      removeListener(locationSelectListener);
      locationSelectListener = addListener(
        map, 'click', function (e) {
          Session.set("selectedLocationName", null);
          Session.set("selectedLocationPoint",
                      geoUtils.toGeoJSONPoint(e.latLng));
        });
    } else if (locationSelectListener) { // but no longer adding game
      removeListener(locationSelectListener);
      locationSelectListener = null;
      Session.set("pageNum", 0);
      refreshMarkers();
    }
  });

  // Reactive computation to (re)drop marker according to
  // Session.selectedLocationPoint if adding/editing game
  Deps.autorun(function () {
    if (Session.equals("addingGame", false) &&
        Session.equals("editingGame", false)) {
      newLocMarker && newLocMarker.setMap(null);
      newLocMarker = null;
      Session.set("locationMarkerSet", false);
    } else {
      var point = Session.get("selectedLocationPoint") ||
            (Session.get("soloGame") &&
             Games.findOne(Session.get("soloGame")).location.geoJSON);
      if (! point) { // "What's the point?"
        Session.set("locationMarkerSet", false);
        return;
      }
      var position = geoUtils.toLatLng(point);
      newLocMarker && newLocMarker.setMap(null);
      newLocMarker = new google.maps.Marker({
        position: position,
        map: map,
        icon: icon.normal
      });
      Session.set("locationMarkerSet", true);
    }
  });

  // (re)center map on solo game
  Deps.autorun(function () {
    // make findOne() non-reactive?
    var solo = Games.findOne(Session.get("soloGame"));
    if (solo) map.panTo(geoUtils.toLatLng(solo.location.geoJSON));
  });
});

// Initialize the map and its events and helpers
// once Google Maps API is loaded
Template.map.rendered = function () {
  initializeMapStuff();
};

// Autocomplete for location search via Google Places API
Template.locationSearchBox.rendered = function () {
  autocomplete && google.maps.event.clearListeners(autocomplete);
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('locationSearchBox'),
    {});
  google.maps.event.addListener(
    autocomplete, 'place_changed', function () {
        Location.onPlaceChanged(autocomplete);
      }
    );
};

Template.layout.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "top"});
  }
});

Template.userDropdown.helpers({
  userIdentifier: function () { // assumes Meteor.user() is not null
    var user = Meteor.user();
    if (user.emails) {
      var firstVerifiedEmail = _.find(user.emails, function (email) {
        return email.verified;
      });
      return firstVerifiedEmail ? firstVerifiedEmail.address : user.username;
    } else {
      return user.username;
    }
  }
});

Template.changePassword.helpers({
  strangePassword: function () {
    return Session.get("strange-passwd") || "";
  },
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "changePassword"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "changePassword"})) ?
      "has-error": "";
  }
});

Template.changePassword.events({
  "submit .change-password": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var oldPassword = templ.find("input.old-password").value;
    var newPassword = templ.find("input.new-password").value;
    try {
      check(newPassword, ValidPassword);
    } catch (e) {
      if (e instanceof Match.Error) {
        Alerts.throw({
          message: e.message.slice(13), // slice off "Match Error: "
          type: "danger",
          where: "changePassword"
        });
      }
      return;
    }
    Accounts.changePassword(
      oldPassword,
      newPassword,
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Your password is set.",
            type: "success", where: "top",
            autoremove: 3000
          });
          Router.go('home');
        } else {
          console.log(err);
          // typical err.reason: "Incorrect password"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "changePassword"
          });
        }
      });
  }
});

Template.setPassword.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "setPassword"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "setPassword"})) ?
      "has-error": "";
  }
});

Template.setPassword.events({
  "submit .set-password": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var password = templ.find("input.password").value;
    try {
      check(password, ValidPassword);
    } catch (e) {
      console.log(e);
      Alerts.throw({
        // expecting "Match error: Password must be at least 6 characters."
        message: e.message.slice(13),
        type: "danger", where: "setPassword"
      });
      return;
    }
    try {
      Accounts.resetPassword(
        self.token,
        password,
        function (err) {
          if (!err) {
            Alerts.throw({
              message: "Your password is set",
              type: "success", where: "setPassword"
            });
            Router.go('home');
          } else {
            console.log(err);
            Alerts.throw({
              message: err.reason,
              type: "danger", where: "setPassword"
            });
          }
        });
    } catch (err) {
      Alerts.throw({
        message: "A token to set your password was "+
          "not found (or has expired). How about we send a fresh link?",
        type: "warning", where: "sendResetPasswordEmail"
      });
      Router.go("get-reset-link");
    }
  }
});

Template.sendResetPasswordEmail.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "sendResetPasswordEmail"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "sendResetPasswordEmail"})) ?
      "has-error": "";
  }
});

Template.sendResetPasswordEmail.events({
  "submit .get-reset-link": function (evt, templ) {
    evt.preventDefault();
    Accounts.forgotPassword(
      {email: templ.find("input.email").value},
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Check for an email from " +
              "support@pushpickup.com to set your " +
              " password",
            type: "success", where: "top"
          });
          Router.go('home');
        } else {
          console.log(err);
          // e.g. "User not found"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "sendResetPasswordEmail"
          });
        }
      });
  }
});

// Template.sendResetPasswordEmail and Template.sendVerificationEmail are
// remarkably similar. I should consider folding them into one template.

Template.sendVerificationEmail.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "sendVerificationEmail"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "sendVerificationEmail"})) ?
      "has-error": "";
  }
});

Template.sendVerificationEmail.events({
  "submit .get-verify-link": function (evt, templ) {
    evt.preventDefault();
    var email = templ.find("input.email").value;
    if (! Meteor.userId()) {
      // user must be authenticated
      Alerts.throw({
        message: "You must be signed in to add an email address " +
          "to your account",
        type: "info", where: "signIn"
      });
      Router.go('signIn');
    } else {
      Meteor.call("addUserEmail", email, function (err, res) {
        if (!err) {
          Alerts.throw({
            message: "Thanks! Check for an email from " +
              "support@pushpickup.com to verify your email address",
            type: "success", where: "top"
          });
          Router.go('home');
        } else {
          // typical error: email in use
          console.log(err);
          if (err instanceof Meteor.Error) {
            Alerts.throw({
              message: err.reason,
              type: "danger", where: "sendVerificationEmail"
            });
          } else {
            Alerts.throw({
              message: "Hmm, something went wrong. Try again?",
              type: "danger", where: "sendVerificationEmail"
            });
          }
        }
      });
    }
  }
});

Template.manageUserSubs.events({
  "click button.unsubscribeAll": function () {
    _.forEach(
      _.pluck(UserSubs.find().fetch(), '_id'),
      function (id) {
        UserSubs.remove(id); });
  }
});

Template.signIn.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "signIn"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "signIn"})) ?
      "has-error": "";
  }
});

Template.signIn.events({
  "submit .sign-in": function (evt, templ) {
    evt.preventDefault();
    Meteor.loginWithPassword(
      templ.find("input.login").value,
      templ.find("input.password").value,
      function (err) {
        if (err) {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason, type: "danger", where: "signIn"
          });
        }
      }
    );
  }
});

var ppConjunction = function (array) {
  var out = "";
  for (var i=0, l=array.length; i<l; i++) {
    out = out + array[i];
    if (i === l-2 && l === 2) {
      out = out + " and ";
    } else if (i === l-2) {
      out = out + ", and ";
    } else if (i < l-2) {
      out = out + ", ";
    }
  }
  return out;
};

Template.addUserSubMessage.helpers({
  types: function () {
    return ppConjunction(Session.get("gameTypes") || []);
  },
  days: function () {
    return ppConjunction(
      _.map(Session.get("gameDays"), function (n) {
        return moment().day(n).format('dddd');
      }));
  },

  // assumes singular helpers are only invoked when Session.get("soloGame")
  // returns a valid game id.
  type: function () {
    var game = Games.findOne(Session.get("soloGame"));
    return game && game.type;
  },
  day: function () {
    var game = Games.findOne(Session.get("soloGame"));
    return game && moment(game.startsAt).format('dddd');
  }
});

Template.addUserSub.events({
  "click button.addUserSub": function () {
    if (! Meteor.userId()) {
      Alerts.throw({
        type: "warning",
        message: "You must be signed in to subscribe. "+
          "Add or join a (proposed) game to automatically create an account.",
        where: "addUserSub",
        autoremove: 10000
      });
      return;
    }
    if (_.find(Meteor.user().emails, function (email) {
      return email.verified;
    })) {
      var methodCallback = function (error, result) {
        if (!error) {
          Alerts.throw({
            type: "success",
            message: "Thanks! Expect to be notified via email " +
              "about new games posted in this region.",
            where: "addUserSub"
          });
        } else {
          Alerts.throw({
            type: "danger",
            message: "Hmm, something went wrong. "+
              "You *do* appear to have a verified email address. "+
              "Try again?",
            where: "addUserSub"
          });
        }
      };
      if (Session.get("soloGame")) {
        var game = Games.findOne(Session.get("soloGame"));
        Meteor.call("addUserSub",
                    [game.type],
                    [moment(game.startsAt).day()],
                    Session.get("geoWithin"),
                    methodCallback);
      } else {
        Meteor.call("addUserSub",
                    Session.get("gameTypes"),
                    Session.get("gameDays"),
                    Session.get("geoWithin"),
                    methodCallback);
      }
    } else {
      Alerts.throw({
        type: "warning",
        message: "You must have a verified email address to subscribe",
        where: "sendVerificationEmail"
      });
      Router.go("get-verify-link");
    }
  }
});

Template.games.helpers({
  gamesReady: function () {
    return Session.equals("gamesReady", true);
  },
  games: function () {
    return Games.find({}, {sort: {startsAt: 1}});
  },
  previous: function () {
    return (Session.equals("pageNum", 0)) ? "disabled" : "";
  },
  next: function () {
    return (Games.find().count() < recordsPerPage) ? "disabled" : "";
  },
  fewerThan: function (n) {
    return Games.find().count() < n;
  }
});

Template.games.events({
  "mouseenter .game": function (evt, templ) {
    Session.set("activeGame", this._id); },
  "mouseleave .game": function (evt, templ) {
    Session.set("activeGame", null); },
  "click .pager #previous": function (evt, templ) {
    var pageNum = Session.get("pageNum");
    if (pageNum > 0) Session.set("pageNum", pageNum - 1);
  },
  "click .pager #next": function (evt, templ) {
    var pageNum = Session.get("pageNum");
    if (Games.find().count() === recordsPerPage) {
      Session.set("pageNum", pageNum + 1);
    }
  }
});

Template.game.rendered = function () {
  //$("div.progress").tooltip();
  //$("img.game-type").tooltip();
};

Template.game.events({
  "click .game-header": function (evt, templ) {
    Session.toggle("selectedGame", this._id, null);
  },
  "click .addPlayer": function () {
    Session.toggle("addingPlayer", Session.get("selectedGame"), false);
  },
  "click .editPlayer": function (event) {
    if (! Session.get("addingPlayer"))
      Session.toggle("editingPlayer", event.currentTarget.text, false);
  },
  "click .show-share-link": function () {
    Session.set("showShareLink", this._id);
  }
});

Template.game.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: self._id});
  },
  locationName: function () {
    var game = this;
    return game.location.name.replace(/,.*/, '');
  },
  note: function () {
    var self = this;
    return utils.converter.makeHtml(self.note);
  },
  context: function () {
    if (Session.equals("selectedGame", this._id)) {
      return "success";
    } else if (Session.equals("activeGame", this._id)) {
      return "active";
    } else return ""; },
  quickHumanTime: function (date) {
    return moment(date).calendar(); },
  selectedGame: function () {
    return Session.equals("selectedGame", this._id); },
  showAll: function (requested) {
    return _.map(requested, function (val, key) {
      return key + ":" + val;}); },
  baseURL: function () {
    return Meteor.absoluteUrl().slice(0,-1);
  },
  mapLink: function () {
    var coords = this.location.geoJSON.coordinates;
    return "https://maps.google.com/?q="+coords[1]+","+coords[0]; },
  listNames: function (players) {
    if (players.length === 0) return "no one yet.";
    var out = "";
    var playerDisplay = "";
    for(var i=0, l=players.length; i<l; i++) {
      if (players[i].userId === Meteor.userId()) {
        playerDisplay = "<a class=\"editPlayer\">"+players[i].name+"</a>";
      } else {
        playerDisplay = players[i].name;
        }
      out = out + playerDisplay;
      if (i === l-2 && l === 2) {
        out = out + " and ";
      } else if (i === l-2) {
        out = out + ", and ";
      } else if (i <=  l-3) {
        out = out + ", ";
      } else if (i === l-1) {
        out = out + ".";
      }
    }
    return out;
  },
  equal: function (x, y) {
    return x === y;
  },
  // percent of this.requested.minPlayers achieved so far
  progress: function () {
    var minPlayers = this.requested.players || 14;
    return Math.round(100 * this.players.length / minPlayers);
  },
  addPlayer: function () {
    var self = this;
    if (Session.equals("addingPlayer", Session.get("selectedGame"))) {
      return Template.editablePlayer({
        which: 'add',
        title: 'Add player', action: 'Add',
        game: self, user: Meteor.user()});
    } else {
      return "";
    }
  },
  editPlayer: function () {
    var self = this;
    if (Session.get("editingPlayer")) {
      return Template.editablePlayer({
        which: 'edit', name: Session.get("editingPlayer"),
        title: 'Edit name', action: 'OK',
        game: self, user: Meteor.user()});
    } else {
      return "";
    }
  },
  userCanEdit: function () {
    var self = this;
    var user  = Meteor.user();
    return self.creator.userId === user._id || user.admin;
  },
  showShareLink: function () {
    return Session.equals("showShareLink", Session.get("selectedGame"));
  }
});

Template.gameComments.events({
  'click .start-comment': function () {
    Session.set("addingComment", Session.get("selectedGame"));
  }
});

Template.editableComment.helpers({
  addingComment: function () {
    return Session.get("addingComment");
  },
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "editableComment"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "editableComment"})) ?
      "has-error": "";
  }
});

Template.editableComment.events({
  "submit #addComment": function (evt, templ) {
    var game = Games.findOne(Session.get("selectedGame"));
    evt.preventDefault();
    var message = templ.find("#message").value;
    if (_.isEmpty(message)) {
      Alerts.throw({
        message: "This is not the place to express emptiness",
        type: "danger", where: "editableComment"
      });
    } else if (! Meteor.userId()) {
      Alerts.throw({
        type: "warning",
        message: "You must be signed in to comment. "+
          "Add or join a (proposed) game to automatically create an account.",
        where: "editableComment",
        autoremove: 10000
      });
    } else { // authenticated user
      Meteor.call("addComment", message, game._id, function (err) {
        if (!err) {
          Session.set("addingComment", false);
        } else {
          console.log(err);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
            type: "danger",
            where: "editableComment"
          });
        }
      });
    }
  },
  "click button.cancel": function () {
    Session.set("editingComment", false);
    Session.set("addingComment", false);
  },
  "click .remove-comment": function (event, templ) {
    if (confirm("Really remove comment?")) {
      // TODO: Meteor.call('removeComment', ...);
      Session.set("editingComment", false);
    }
  }
});

Template.gameComments.helpers({
  addComment: function () {
    var self = this;
    if (Session.equals("addingComment", Session.get("selectedGame"))) {
      return Template.editableComment({
        which: 'add',
        title: 'Add comment', action: 'Add'
      });
    } else {
      return "";
    }
  },
  editComment: function () {
    var self = this;
    // TODO: give each comment an id (or track index in comments Array)
    // to enable this.
    if (Session.get("editingComment")) {
      return Template.editablePlayer({
        which: 'edit', name: Session.get("editingComment"),
        title: 'Edit comment', action: 'OK'});
    } else {
      return "";
    }
  },
  someComments: function () {
    return this.comments.length > 0;
  }
});

Template.gameComment.helpers({
  timestamp: function () {
    var self = this;
    return moment(self.timestamp).fromNow();
  },
  canRemove: function () {
    var comment = this;
    var user = Meteor.user();
    if (! user) return false;
    var game = Games.findOne(comment.gameId);
    return user._id === comment.userId ||
      user._id === game.creator.userId ||
      user.admin;
  }
});

Template.editablePlayer.destroyed = function () {
  Notifications.remove({where: "editablePlayer"});
};

Template.editablePlayer.helpers({
  addingPlayer: function () {
    return Session.get("addingPlayer");
  },
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "editablePlayer"});
  },
  error: function () {
    return (Notifications.findOne({type: "danger", where: "editablePlayer"})) ?
      "has-error": "";
  }
});

Template.editablePlayer.events({
  "submit #addPlayer": function (evt, templ) {
    var game = this.game;
    evt.preventDefault();
    var name = templ.find("#name").value;
    if (_.contains(_.pluck(game.players, 'name'), name)) {
      Alerts.throw({
        message: "Name taken for this game. " +
          "Try a nickname or include a last initial.",
        type: "danger", where: "editablePlayer"
      });
    } else if (! Meteor.userId()) {
      Meteor.call("unauthenticated.addPlayer", game._id, name, function (err, res) {
        if (!err) {
          Meteor.loginWithPassword(res.username, res.password);
          Alerts.throw({
            message: "Thanks for joining the game!\n\nHere is a strange username and " +
              "password you can use from now on:  \n" + "username:  \n" +
              "**" + res.username + "**  \n" + "password:  \n" +
              "**" + res.password + "**  \n\n" +
              "Write down or copy/paste these somewhere!\n\n"+
              "(You can of course "+
              "[change your password](/change-password)"+
              " and also add an email address "+
              "with which to log in instead -- see links in the drop-down menu up top).",
            type: "success",
            where: game._id
          });
          Session.set("addingPlayer", false);
          Session.set("strange-passwd", res.password);
        } else {
          console.log(err);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
            type: "danger",
            where: game._id
          });
        }
      });
    } else { // authenticated user
      if (! Meteor.user().profile) {
        Meteor.users.update(Meteor.userId(), {$set: {"profile.name": name}});
      }
      Meteor.call("addPlayer", game._id, name, function (err) {
        if (!err) {
          // Otherwise, the below gets kind of annoying for multiple adds
          if ((_.filter(game.players, function (p) {
            return p.userId === Meteor.userId(); })).length === 1) {
            Alerts.throw({
              message: "Thanks for adding to the game!",
              type: "success",
              where: game._id
            });
          }
          Session.set("addingPlayer", false);
        } else {
          console.log(err);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
            type: "danger",
            where: game._id
          });
        }
      });
    }
  },
  "submit #editPlayer": function (evt, templ) {
    var self = this;
    var game = self.game;
    evt.preventDefault();
    var name = templ.find("#name").value;
    if (_.contains(_.pluck(game.players, 'name'), name)) {
      Alerts.throw({
        message: "Name taken for this game. " +
          "Try a nickname or include a last initial.",
        type: "danger", where: "editablePlayer"
      });
    } else {
      var user = Meteor.user();
      if (self.name === user.profile.name) {
        Meteor.users.update(Meteor.userId(), {$set: {"profile.name": name}});
      }
      Meteor.call(
        "editGamePlayer", game._id,
        {oldName: self.name, newName: name}, function (err) {
          if (!err) {
            Session.set("editingPlayer", false);
          }
        });
    }
  },
  "click button.cancel": function () {
    Session.set("editingPlayer", false);
    Session.set("addingPlayer", false);
  },
  "click .drop-out": function (event, templ) {
    if (confirm("Really drop out?")) {
      Meteor.call('pullPlayer',
                  templ.find("input").value, Session.get("selectedGame"));
      Session.set("editingPlayer", false);
    }
  }
});

Template.home.helpers({
  addingGame: function () {
    return Session.equals("addingGame", true);
  }
});

Template.editableGame.helpers({
  selectType: function () {
    var self = this;
    var them = GameOptions.find({option: "type"}).map(function (type) {
      return {
        value: type.value,
        text: type.value,
        selected: (type.value === self.type)
      };
    });
    return Template.selectForm({includeLabel: true,
                                label: 'What', id: 'gameType',
                                options: them});
  },
  selectTime: function () {
    var self = this;
    var selfDayStart = self.startsAt &&
          moment(self.startsAt).startOf('day');
    var dayStart = moment(Session.get("newGameDay") ||
                          selfDayStart ||
                          moment().startOf('day'));

    var prevSelectedTime = Session.get("newGameTime");
    var dayMinutes = function (m) {
      return 60 * m.hours() + m.minutes();
    };
    var selectedMinutes =
          (prevSelectedTime && dayMinutes(moment(prevSelectedTime))) ||
          (self.startsAt && dayMinutes(moment(self.startsAt))) ||
          720; // noon is 720 minutes into day

    var them =  _.map(_.range(96), function (i) {
      var t = moment(dayStart).add(15 * i, 'minutes');
      return {
        value: +t,
        text: t.format('h:mmA'),
        selected: ((15 * i) === selectedMinutes)
      };
    });

    them = _.reject(them, function (t) {
      return t.value < +moment() || t.value > +moment().add(1, 'weeks');
    });
    return Template.selectForm({label: 'Time', id: 'gameTime',
                                options: them});
  },
  selectStatus: function () {
    var self = this;
    var them = GameOptions.find({option: "status"}).map(function (status) {
      return {
        value: status.value,
        text: status.value,
        selected: (status.value === self.status)
      };
    });
    return Template.selectForm({label: 'Status', id: 'gameStatus',
                                options: them});
  },
  selectDay: function () {
    var self = this;
    var selfDayStart = self.startsAt &&
          moment(self.startsAt).startOf('day');
    var them =  _.map(_.range(8), function (i) {
      var dayStart = moment().startOf('day').add(i, 'days');
      return {
        value: dayStart.valueOf(),
        text: dayStart.format('dddd'),
        selected: (+dayStart === +selfDayStart)
      };
    });
    them[0].text = 'Today' + ' (' + them[0].text + ')';
    them[1].text = 'Tomorrow' + ' (' + them[1].text + ')';
    var days = {includeLabel: true, label: "When", id: "gameDay",
                options: them};
    return Template.selectForm(days);
  },
  editingGame: function () {
    return Session.get("editingGame");
  },
  atLeastOnePlayer: function () {
    return this.players && (! _.isEmpty(this.players));
  }
});

// selector is either a String, e.g. "#name", or a [String, function] that
// takes the value and then feeds it to the (one-argument) function for
// a final value
var selectorValuesFromTemplate = function (selectors, templ) {
  var result = {};
  _.each(selectors, function (selector, key) {
    if (typeof selector === "string") {
      result[key] = templ.find(selector).value;
    } else {
      result[key] = (selector[1])(templ.find(selector[0]).value);
    }
  });
  return result;
};
var asNumber = function (str) { return +str; };

Template.editableGame.events({
  "change #gameDay": function (evt, templ) {
    Session.set("newGameDay", +evt.currentTarget.value);
  },
  "change #gameTime": function (evt, templ) {
    Session.set("newGameTime", +evt.currentTarget.value);
  },
  "submit #editGameForm": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var marked = $(templ.findAll(".gamePlayers input:checked"))
          .map(function () { return this.value; }).get();
    var remainingPlayers = _.reject(self.players, function (p) {
      return _.contains(marked, p.name);
    });
    Meteor.call("editGame", Session.get("soloGame"), {
      type: templ.find("#gameType").value,
      status: templ.find("#gameStatus").value,
      startsAt: new Date(+templ.find("#gameTime").value),
      location: {name: templ.find("#locationSearchBox").value,
                 geoJSON: Session.get("selectedLocationPoint") ||
                 Games.findOne(Session.get("soloGame")).location.geoJSON},
      note: templ.find("#gameNote").value,
      players: remainingPlayers,

      // for now, no editing comments (simulate an email-list dynamic)
      comments: self.comments,

      requested: selectorValuesFromTemplate({
        players: [".requested input.players", asNumber]
      }, templ)
    });
    Router.go('home');
  },
  "submit #addGameForm": function (evt, templ) {
    evt.preventDefault();
    var game = {
      type: templ.find("#gameType").value,
      status: templ.find("#gameStatus").value,
      startsAt: new Date(+templ.find("#gameTime").value),
      location: {name: templ.find("#locationSearchBox").value,
                 geoJSON: Session.get("selectedLocationPoint")},
      note: templ.find("#gameNote").value,
      players: [],
      comments: [],
      requested: selectorValuesFromTemplate({
        players: [".requested input.players", asNumber]
      }, templ)
    };
    try {
      check(game, ValidGame);
    } catch (e) {
      if (e instanceof Match.Error) {
        console.log(e.message);
        var result = /Match error: (.*) in field (.*)/.exec(e.message);
        if (result[2] === 'location.name') {
          Session.set("need_location_set", result[1]);
        } else if (result[2] === 'location.geoJSON') {
          Session.set("need_location_set",
                      "Your game needs a location. Use the 'Where' search box or click on the map to mark the location.");
        }
      }
      return;
    }
    if (! Meteor.userId()) {
      Meteor.call("unauthenticated.addGame", game, function (err, res) {
        if (!err) {
          Meteor.loginWithPassword(res.username, res.password);
          Alerts.throw({
            message: "Thanks for sharing your game!\n\nHere is a strange username and " +
              "password you can use from now on:  \n" + "username:  \n" +
              "**" + res.username + "**  \n" + "password:  \n" +
              "**" + res.password + "**  \n" +
              "Write down or copy/paste these somewhere!\n\n"+
              "(You can of course "+
              "[change your password](/change-password)"+
              " and also add an email address "+
              "with which to log in instead -- see links in the drop-down menu up top).",
            type: "success",
            where: res.gameId
          });
          Session.set("strange-passwd", res.password);
          Router.go('oneGame', {_id: res.gameId});
        } else {
          console.log(err);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
            type: "danger",
            where: "top" // change to within editableGame form?
          });
        }
      });
    } else { // authenticated user
      Meteor.call("addGame", game, function (err, res) {
        if (!err) {
          Alerts.throw({
            message: "Thanks for sharing your game!",
            type: "success",
            where: res.gameId
          });
          Router.go('oneGame', {_id: res.gameId});
        } else {
          console.log(err);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
            type: "danger",
            where: "top" // change to within editableGame form?
          });
        }
      });
    }
  },
  "click .cancelAll": function (evt) {
    evt.preventDefault(); // this bubbles to trigger "submit #addGameForm"!
    Router.go('home');
  },
  "click .remove": function (evt, templ) {
    evt.preventDefault();
    if (confirm("Really cancel game? Players will be notified.")) {
      Meteor.call("cancelGame", Session.get("soloGame"));
      Router.go('home');
    }
  }
});

Template.selectLocation.helpers({
  markerPresent: function () {
    return Session.get("locationMarkerSet");
  },
  locationError: function () {
    return Session.get("need_location_set") ? "has-error" : "";
  }
});

Template.selectLocation.events({
  "keypress input": function (evt) {
    // Don't submit form on pressing Enter
    if (evt.which === 13) {
      evt.preventDefault();
    }
  }
});

Template.locationFinder.events({
  "click button" :function (evt, templ) {
    tryHTML5Geolocation(map);
    map.setZoom(12);
  }
});

var dateRangesFromNow = function () {
  var todayNum = moment().day();
  var todayRange = {
    d: todayNum,
    dateRange: {
      gte: moment().startOf('hour').toDate(),
      lt: moment().endOf('day').toDate()
    }};
  var d = todayNum;
  var startOfDay = moment().startOf('day');
  var thisWeekDayRanges = _.times(7, function () {
    // Already got today, so increment day immediately
    startOfDay = moment(startOfDay).add(1, 'days');
    (d === 6) ? d = 0 : d += 1; // and increment day index

    return {
      d: d,
      dateRange: {
        gte: startOfDay.toDate(),
        lt: moment(startOfDay).endOf('day').toDate()
      }};
  });
  return ([todayRange]).concat(thisWeekDayRanges);
};

selectDateRanges = function (days) {

  var selected = _.select(dateRangesFromNow(), function (dr) {
    return _.contains(days, dr.d);
  });
  return _.pluck(selected, 'dateRange');
};

Deps.autorun(function () {
  var daysIncluded = Session.get("gameDays");
  if (_.isEmpty(daysIncluded)) daysIncluded = [0,1,2,3,4,5,6];
  Session.set("dateRanges", selectDateRanges(daysIncluded));
});

Template.typeFilter.rendered = function () {
  //$('img.game-type').tooltip();
};

Template.typeFilter.helpers({
  typeOptions: function () {
    var selectedTypes = Session.get("gameTypes");
    return GameOptions.find({option: "type"}, {sort: {value: 1}})
          .map(function (type) {
            return {
              value: type.value,
              selected: _.contains(selectedTypes, type.value)
            };
          });
  }
});

Template.typeFilter.events({
  "change input": function (evt, templ) {
    var gameTypes = Session.get("gameTypes");
    Session.set("gameTypes", toggleInclusion(gameTypes, this.value));
  }
});

Template.dayFilter.helpers({
  dayOptions: function () {
    var selectedDays = Session.get("gameDays");
    return GameOptions.find({option: "day"}, {sort: {value: 1}})
          .map(function (day) {
            return {
              name: day.name,
              value: day.value,
              selected: _.contains(selectedDays, day.value)
            };
          });
  }
});

Template.dayFilter.events({
  "change input": function (evt, templ) {
    var gameDays = Session.get("gameDays");
    Session.set("gameDays", toggleInclusion(gameDays, this.value));
  }
});


moment.locale('en', {
  calendar : {
    lastDay : '[Yesterday] h:mmA',
    sameDay : '[Today] h:mmA',
    nextDay : '[Tomorrow] h:mmA',
    lastWeek : '[Last] dddd h:mmA',
    nextWeek : 'dddd h:mmA',
    sameElse : 'dddd, MMM Do h:mmA'
  }
});
