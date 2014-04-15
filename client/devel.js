Session.setDefault('searching', 'not');
Session.setDefault('search-results', false);

var sanPabloParkBerkeleyCA = {
	"type" : "Point", "coordinates" : [-122.284786, 37.855271]
};
Session.setDefault("current-location", sanPabloParkBerkeleyCA);
Session.setDefault("map-center", sanPabloParkBerkeleyCA);

Session.setDefault(
  "game-types",
  _.pluck(GameOptions.find({option: "type"}).fetch(), 'value')
);
Session.setDefault("max-distance", 100000); // 100,000 m => 62 miles

var initialNumGamesRequested = 15;
Session.setDefault("num-games-requested", initialNumGamesRequested);

var getUserLocation = function (onSuccess /* optional */) {
  Session.set("get-user-location", "pending");
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var point = {
        "type": "Point",
        "coordinates": [position.coords.longitude,
                        position.coords.latitude]
      };
      Session.set("get-user-location", "success");
      Session.set("current-location", point);
      onSuccess && onSuccess(point);
    }, function() {
      Session.set("get-user-location", "failure");
      alert('Error: The Geolocation service failed.');
    });
  } else {
    Session.set("get-user-location", "failure");
    console.log('Error: Your browser doesn\'t support geolocation.');
  }
};

Deps.autorun(function () {
  if (Session.equals("get-user-location", "success")) {
    $('.search-input input[type=search]').val("Current Location");
    Meteor.setTimeout(function () {
      Session.set("get-user-location", null);
    }, 1000);
  } else if (Session.equals("get-user-location", "failure")) {
    Meteor.setTimeout(function () {
      Session.set("get-user-location", null);
    }, 1000);
  }
});

Deps.autorun(function (c) {
  if (Session.equals("dev-mode", true)) {
    getUserLocation();
    c.stop();
  }
});

PastGames = new Meteor.Collection(null);
var setPastGames = function (arr) {
  PastGames.remove({});
  _.forEach(arr, function (doc) { PastGames.insert(doc); });
};

Deps.autorun(function () {
  if (! Session.equals("dev-mode", true))
    return;

  if (! Session.equals("searching", "after")) {
    // No map, so no map bounds to poll.
    // Get nearby or user-involved games that are upcoming.
    // Pull in up to initialNumGamesRequested of the nearest past games.

    Deps.autorun(function () {
      var handle;
      var userId = Meteor.userId();
      handle = userId && Meteor.subscribe("user-upcoming-games");
      if (handle && handle.ready()
          && (! Session.get("soloGame"))) {
        // These sets are mutually exclusive. If a user is playing *and*
        // organizing a game, that game is in the "organizing" list.
        Session.set(
          "user-organizing-upcoming-initial",
          Games.find({
            'creator.userId': userId
          }, {
            reactive: false, fields: {_id: 1}
          }).fetch());
        Session.set(
          "user-playing-upcoming-initial",
          Games.find({
            'players.userId': userId,
            'creator.userId': {$ne: userId}
          }, {
            reactive: false, fields: {_id: 1}
          }).fetch());
      }
    });

    Deps.autorun(function () {
      Session.set("gamesReady", false);
      Meteor.subscribe(
        "nearby-upcoming-games", Session.get("current-location"), {
          types: Session.get("game-types"),
          maxDistance: Session.get("max-distance"),
          limit: Session.get("num-games-requested")
        }, function () { Session.set("gamesReady", true); });
    });

    // Grab up to initialNumGamesRequested past games
    // as near as possible to current location
    Deps.autorun(function () {
      var location = Session.get("current-location");
      Meteor.call("nearest-past-games", location, function (err, res) {
        if (!err) setPastGames(res);
      });
    });

  } else {
    // after searching -- findingsMap is rendered

    Deps.autorun(function () {
      Session.set("gamesReady", false);
      geoWithinUpcomingGamesHandle = Meteor.subscribe(
        "geowithin-upcoming-games", Session.get("geoWithin"), {
          types: Session.get("game-types"),
          limit: Session.get("num-games-requested")
        }, function () { Session.set("gamesReady", true); });
    });

    // Grab up to initialNumGamesRequested past games
    // as near as possible to map center
    Deps.autorun(function () {
      var location = Session.get("map-center");
      Meteor.call("nearest-past-games", location, function (err, res) {
        if (!err) setPastGames(res);
      });
    });
  }

  Deps.autorun(function () {
    var numUpcoming = Games.find().count();
    var deficit =  initialNumGamesRequested - numUpcoming;
    Session.set("num-past-games-to-display", (deficit > 0) ? deficit: 0);
  });
});

Deps.autorun(function () {
  Session.set("user_subs_ready", false);
  Meteor.userId() && Meteor.subscribe('user_subs', function () {
    Session.set("user_subs_ready", true);
  });

  Meteor.subscribe("user-data");
});

var handlebarsHelperMap = {
  SGet: function (key) { return Session.get(key); },
  SEql: function (key, val) { return Session.equals(key, val); },
  gte: function (a, b) { return a && b && a >= b; },
  lt: function (a, b) { return a && b && a < b; },
  userInGame: function () {
    // are global handlebars helpers reactive? Seems so.
    var game = this;
    return !! (Meteor.userId() && Games.findOne({
      _id: game._id, 'players.userId': Meteor.userId()
    }));
  },
  pluralize: function (hasLength, singular, plural) {
    if (hasLength.length === 1) {
      return singular;
    } else {
      return plural;
    }
  },
  baseURL: function () {
    return Meteor.absoluteUrl().slice(0,-1);
  },
  past: function (date) {
    return date < new Date();
  },
  participle: function(date, options) {
    check(options.hash, {past: String, present: String});
    return (date < new Date()) ? options.hash.past : options.hash.present;
  },
  alerts: function () {
    return Template.meteorAlerts;
  }
};
(function (handlebarsHelperMap) {
  _.forEach(_.keys(handlebarsHelperMap), function (key) {
    Handlebars.registerHelper(key, handlebarsHelperMap[key]);
  });
})(handlebarsHelperMap);

Template.devLayout.created = function () {
  Session.set("dev-mode", true);
};
Template.layout.created = function () {
  Session.set("dev-mode", false);
};

Template.devNav.events({
  'click .start-search a': function () {
    Session.set('searching', 'during');
    Session.set("viewing-settings", false);
  },
  'click .search-input input': function () {
    Session.set('searching', 'during');
  },
  'click .exit-search a': function () {
    if (Session.equals('search-results', true)) {
      Session.set('searching', 'after');
    } else {
      Session.set('searching', 'not');
    }
  },
  'click .back a': function () {
    Session.set('searching', 'not');
    Session.set('search-results', false);
  }
});

Template.settingsCog.events({
  "click a": function () {
    Session.toggle("viewing-settings");
  }
});

Template.devBody.events({
  "click": function() {
    if(Session.equals("viewing-settings", true)) {
      Session.set("viewing-settings", false);
    } 
  }
});

Template.listOfGames.helpers({
  maxDistance: function () {
    var m = Session.get("max-distance");
    return m &&
      (0.00062137119 * m).toFixed(0)
      + "mi (" + (m/1000).toFixed(0) + "km)";
  },
  userOrganizingUpcoming: function () {
    var uoui = Session.get("user-organizing-upcoming-initial");
    return uoui
      && (uoui.length > 0)
      && Games.find({$or: uoui}, {sort: {startsAt: 1}})
      || [];
  },
  userPlayingUpcoming: function () {
    var upui = Session.get("user-playing-upcoming-initial");
    var userId = Meteor.userId();
    return upui
      && (upui.length > 0)
      && Games.find({$or: upui}, {sort: {startsAt: 1}})
      || [];
  },
  nonuserUpcoming: function () {
    var uopui = _.union(Session.get("user-organizing-upcoming-initial") || [],
                        Session.get("user-playing-upcoming-initial") || []);
    return Games.find({
      '_id': {$nin: _.pluck(uopui || [], '_id')},
      'startsAt': {$gte: new Date()}
    }, {sort: {startsAt: 1}});
  },
  noneUpcoming: function () {
    return Games.find().count() === 0;
  },
  pastGames: function () {
    var limit = Session.get("num-past-games-to-display") || 0;
    return limit && PastGames.find({}, {sort: {startsAt: -1}, limit: limit});
  }
});

Template.listOfGames.events({
  "click .game-summary": function () {
    Router.go('devDetail', {_id: this._id});
  }
});

Template.addFriendsLink.events({
  "click .add-friends-link a": function () {
    Session.set("add-friends", this._id);
  }
});

Template.unauthAddFriendsLink.events({
  "click .unauth-add-friends-link": function () {
    Session.set("unauth-add-friends", this._id);
  }
});

Template.joinGameLink.events({
  "click .join-game-link a": function () {
    if (Meteor.userId()) {
      addSelfToGame(this._id);
    } else {
      Session.set("unauth-join", this._id);
    }
  }
});

var addSelfToGame = function (gameId) {
  if (! gameId) { return; }
  Meteor.call("addSelf", {
    gameId: gameId,
    name: Meteor.user().profile.name
  }, function (err) {
    if (!err) {
      Session.set("joined-game", gameId);
      Session.set("unauth-join", null);
    } else {
      console.log(err);
      Alerts.throw({
        message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
        type: "danger",
        where: gameId
      });
    }
  });
};

Template.whoIsPlaying.helpers({
  organizing: function () {
    return this.creator.userId == Meteor.userId();
  },
  playing: function () {
    return _.contains(_.pluck(this.players, 'userId'), Meteor.userId());
  },
  numNeeded: function () {
    var numNeeded = this.requested.players - this.players.length;
    return (numNeeded > 0) ? numNeeded : 0;
  },
  numOthers: function () {
    // not just (this.players.length - 1) because organizer may not have played
    var self = this;
    return _.reject(self.players, function (player) {
      return player.userId === Meteor.userId();
    }).length;
  }
});

// Return friends as [{name: XXX, email: XXX}, {name: YYY}, ...]
// `email` is optional
// Ignore inputs where both `name` and `email` are empty
var makeFriends = function (nameInputs, emailInputs) {
  var friends = {};
  _.forEach(nameInputs, function (input) {
    friends[input.id] = {};
    friends[input.id].name = input.value;
  });
  _.forEach(emailInputs, function (input) {
    if (! _.isEmpty(input.value))
      friends[input.id].email = input.value;
  });
  return _.reject(_.values(friends), function (friend) {
    return _.isEmpty(friend.name) && _.isEmpty(friend.email);
  });
};

var alertables = {
  signUp: function (email, fullName, password) {
    var them = [{
      value: email, pattern: ValidEmail,
      alert: {message: "Your email doesn't look right"}
    },{
      value: fullName, pattern: NonEmptyString,
      alert: {message: "Please put in your name"}
    }];
    if (password !== undefined) {
      them.push({
        value: password, pattern: ValidPassword,
        alert: {message: "Password must be at least 6 characters"}
      });
    }
    return them;
  },
  signIn: function (email, password) {
    return [{
      value: email, pattern: ValidEmail,
      alert: {message: "Your email doesn't look right"}
    },{
      value: password, pattern: NonEmptyString,
      alert: {message: "Enter your password to sign in"}
    }];
  },
  addFriends: function (friends) {
    return [{
      value: friends, pattern: [{name: NonEmptyString,
                                 email: Match.Optional(ValidEmail)}],
      alert: {message: "A friend's email either doesn't look right "
              + "or needs a name to go with it"}
    }];
  },
  comment: function (comment) {
    return [{value: comment, pattern: NonEmptyString,
             alert: {message: "Your comment must have value"}}];
  }
};

Template.addSelfAndFriends.events({
  "submit form": function (event, template) {
    var game = this;
    event.preventDefault();
    Alerts.clearSeen({where: "addSelfAndFriends"});
    // rejects "empty" friends
    var friends = makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    if (! Alerts.test(alertables.addFriends(friends),
                      {type: "danger", where: "addSelfAndFriends"})) {
      return;
    }
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) { // new user
      var fullName = fullNameInput.value;
      if (! Alerts.test(alertables.signUp(email, fullName),
                        {type: "danger", where: "addSelfAndFriends"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addSelfAndFriends", game._id, email, fullName, friends,
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password, function (err) {
              if (!err) {
                Session.set("joined-game", game._id);
                Session.set("unauth-join", null);
                Session.set("strange-passwd", result.password);
              } else {
                console.log(err);
              }
            });
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "addSelfAndFriends"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "addSelfAndFriends"
              });
            }
          }
        });
    } else { // attempt to sign in, join game, and possibly add friends
      var password = template.find("input.password").value;
      if (! Alerts.test(alertables.signIn(email, password),
                        {type: "danger", where: "addSelfAndFriends"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (!err) {
          Meteor.call(
            "dev.addSelfAndFriends", friends, game._id,
            function (error, result) {
              if (! error) {
                Session.set("joined-game", game._id);
                Session.set("unauth-join", null); // logged in now
                if (! _.isEmpty(friends)) {
                  Alerts.throw({
                    message: "Thanks, " + Meteor.user().profile.name +
                      ". Your friend has been added (and will get an email notification if you added their address)!",
                    type: "success", where: game._id,
                    autoremove: 5000
                  });
                }
              } else {
                console.log(error);
                Alerts.throw({
                  message: "Hmm, something went wrong. Try again?",
                  type: "danger", where: game._id
                });
              }
            });
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason, type: "danger", where: "addSelfAndFriends"
          });
        }
      });
    }
  },
  "click .add-self-and-friends .close": function () {
    Session.set("unauth-join", null);
  }
});

Template.addSelfAndFriends.destroyed = function () {
  Alerts.collection.remove({where: "addSelfAndFriends"});
};

Template.addFriends.events({
  "submit form": function (event, template) {
    var game = this;
    event.preventDefault();
    Alerts.clearSeen({where: "addFriends"});
    var friends = makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    if (_.isEmpty(friends)) {
      Alerts.throw({message: "Even imaginary friends have names",
                    type: "danger", where: "addFriends"});
      return;
    }
    if (! Alerts.test(alertables.addFriends(friends),
                      {type: "danger", where: "addFriends"})) {
      return;
    }
    Meteor.call(
      "dev.addFriends", game._id, friends, function (error, result) {
        if (!error) {
          Alerts.throw({
            message: "Thanks, " + Meteor.user().profile.name +
              ". Your friend has been added (and will get an email notification if you added their address)!",
            type: "success", where: game._id,
            autoremove: 5000
          });
          Session.set("add-friends", null);
        } else {
          // typical error: email in use
          // BUT we're currently allowing users to add friends
          // that are existing users...
          console.log(error);
          if (error instanceof Meteor.Error) {
            Alerts.throw({
              message: error.reason,
              type: "danger", where: "addFriends"
            });
          } else {
            Alerts.throw({
              message: "Hmm, something went wrong. Try again?",
              type: "danger", where: "addFriends"
            });
          }
        }
      });
  },
  "click .add-friends .close": function () {
    Session.set("add-friends", null);
  }
});

Template.addFriends.destroyed = function () {
  Alerts.collection.remove({where: "addFriends"});
};

// used exclusively by Template.addFriendsInput
FriendsToAdd = new Meteor.Collection(null);

Template.addFriendsInput.created = function () {
  FriendsToAdd.insert({name: "", email: ""});
};

Template.addFriendsInput.destroyed = function () {
  FriendsToAdd.remove({}); // words b/c Meteor.Collection is local
  Session.set("add-friends", null);
  Session.set("unauth-add-friends", null);
};

Template.addFriendsInput.events({
  "click .add-another-friend": function () {
    FriendsToAdd.insert({name: "", email: ""});
  }
});

Template.addFriendsInput.helpers({
  friends: function () {
    return FriendsToAdd.find();
  }
});

Template.listedGameSummary.helpers({
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  // diagnostic -- not intended for production use
  placeDistance: function () {
    return (0.00062137119 * GeoJSON.pointDistance(
      this.location.geoJSON,
      Session.get("current-location")
    )).toFixed(1) + " mi"; // conversion from meters to miles
  }
});

Template.soloGameSummary.helpers({
  type: function () {
    var game = this;
    return _.string.capitalize(game.type);
  },
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  placeLocation: function () {
    var game = this;
    var comma_separated = game.location.name.match(/.*?, (.*)/);
    if (! comma_separated) {
      return "";
    } else {
      return comma_separated[1];
    }
  }
});

Template.selectGameTypes.helpers({
  options: function () {
    // TODO: retrieve :checked via Session
    return GameOptions.find({option: "type"},{sort: {value: 1}});
  }
});

var onPlaceChanged = function () {
  var place = autocomplete.getPlace();
  if (place.geometry) {
    Session.set("selectedLocationPoint",
                geoUtils.toGeoJSONPoint(place.geometry.location));
    Session.set("selectedLocationName", place.name);
  }
};

var onSelectLocationChanged = function () {
  var place = autocomplete.getPlace();
  if (place.utc_offset) {
    Session.set("selectedLocationUTCOffset", place.utc_offset / 60);
  }
  if (place.geometry) {
    Session.set("selectedLocationPoint",
                geoUtils.toGeoJSONPoint(place.geometry.location));
    Session.set("selectedLocationName", place.name + ", " + place.vicinity);
  }
};

// If location name has more than two commas,
// it's probably too long and complicated, so substitute with
// autocomplete result's "`place.name`,  `place.vicinity`"
var simplifyLocation = function (given) {
  if (_.string.count(given,',') > 2) {
    return Session.get("selectedLocationName") || given.split(",", 3).join(",");
  } else {
    return given;
  }
};

var autocomplete = null;
Template.searchInput.rendered = function () {
  var template = this;
  autocomplete && google.maps.event.clearListeners(autocomplete);
  autocomplete = new google.maps.places.Autocomplete(
    template.find('.search-input input'),
    {types: ['(cities)']});
  google.maps.event.addListener(
    autocomplete, 'place_changed', onPlaceChanged);
};

Template.getCurrentLocation.events({
  "click .get-current-location.btn": function (evt, templ) {
    getUserLocation(function (point) {
      Session.set("selectedLocationPoint", point);
      Session.set("selectedLocationName", "Current Location");
    });
  }
});

var inputValue = function (element) { return element.value; };

var inputValues = function (selector) {
  return _.map($(selector).get(), inputValue);
};

Template.runSearch.events({
  'click button': function (event, template) {
    Session.set("game-types",
                inputValues(".select-game-types input:checked"));
    Session.set("searching", "after");
    Session.set("search-results", true);
  }
});

Deps.autorun(function () {
  // autorun Games subscription currently depends on Session 'gameTypes'
    Session.set("gameTypes", Session.get("game-types"));
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

var ppRegion = function (formatted_address) {
  return formatted_address;
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
      zoom: 12, //18 good for one-game zoom
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
    Alerts.collection.remove({where: "subscribe"});
  });

  self._syncMapWithSearch = Deps.autorun(function () {
    if (Session.equals("searching", "after")) {
      map.panTo(geoUtils.toLatLng(Session.get("selectedLocationPoint")));
      map.setZoom(12);
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

Template.findingsMap.destroyed = function () {
  this._manageMapMarkers && this._manageMapMarkers.stop();
  this._manageSubsDisplay && this._manageSubsDisplay.stop();
  this._syncMapWithSearch && this._syncMapWithSearch.stop();
};

Template.subscribe.helpers({
  detail: function () {
    return ppConjunction(Session.get('game-types')) +
      " around " + ppRegion(Session.get('selectedLocationName'));
  },
  subscribed: function () {
    return Session.equals("user-sub-intersects-map", true);
  }
});

Template.subscribe.destroyed = function () {
  Alerts.collection.remove({where: "subscribe"});
};

Template.subscribeAfterJoined.helpers({
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  subscribed: function () {
    return Session.equals("user-sub-intersects-map", true);
  }
});

Template.subscribeAfterJoined.destroyed = function () {
  Alerts.collection.remove({where: "subscribe"});
};

Template.authenticateAndSubscribe.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "authenticateAndSubscribe"});
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) {
      var fullName = fullNameInput.value;
      if (! Alerts.test(alertables.signUp(email, fullName),
                        {type: "danger", where: "authenticateAndSubscribe"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addUserSub", email, fullName,
        Session.get("gameTypes"), Session.get("gameDays"),
        Session.get("geoWithin"),
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password);
            Alerts.throw({
              message: "Thanks, " + fullName +
                "! Check for an email from " +
                "support@pushpickup.com to verify your email address",
              type: "success", where: "subscribe"
            });
            Session.set("unauth-subscribe", null);
            Session.set("strange-passwd", result.password);
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "authenticateAndSubscribe"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "authenticateAndSubscribe"
              });
            }
          }
        });
    } else { // attempt to sign in and subscribe
      var password = template.find("input.password").value;
      if (! Alerts.test(alertables.signIn(email, password),
                        {type: "danger", where: "authenticateAndSubscribe"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (! err) {
          Meteor.call(
            "addUserSub", Session.get("gameTypes"),
            Session.get("gameDays"), Session.get("geoWithin"),
            function (error) {
              Session.set("unauth-subscribe", null); // logged in now
              addUserSub.callback(error);
            });
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "authenticateAndSubscribe"
          });
        }
      });
    }
  },
  "click .authenticate-and-subscribe .close": function () {
    Session.set("unauth-subscribe", null);
  }
});

Template.authenticateAndSubscribe.destroyed = function () {
  Session.set("unauth-subscribe", null);
};

var addUserSub = {
  callback: function (error, result) {
    if (!error) {
      Session.set("user-sub-intersects-map", true);
      Alerts.throw({
        type: "success",
        message: "**Subscribed!** We'll let you know " +
          "when there are new games.",
        where: "main"
      });
      if (! _.find(Meteor.user().emails, function (email) {
        return email.verified;
      })) {
        Alerts.throw({
          type: "warning",
          message: "You must have a verified email address to subscribe." +
            "check for an email from support@pushpickup.com to " +
            "verify your email address.",
          where: "main"
        });
      }
    } else {
      console.log(error);
      Alerts.throw({
        type: "danger",
        message: "Hmm, something went wrong. " +
          "Try again?",
        where: "subscribe",
        autoremove: 3000
      });
    }
  }
};

Template.subscribeButton.events({
  'click button': function () {
    if (! Meteor.userId()) {
      Session.set("unauth-subscribe", true);
    } else {
      if (Session.get("soloGame")) {
        var game = Games.findOne(Session.get("soloGame"));
        Meteor.call("addUserSub",
                    [game.type],
                    Session.get("gameDays"),
                    // above can also be e.g. [moment(game.startsAt).day()],
                    Session.get("geoWithin"),
                    addUserSub.callback);
      } else {
        Meteor.call("addUserSub",
                    Session.get("gameTypes"),
                    Session.get("gameDays"),
                    Session.get("geoWithin"),
                    addUserSub.callback);
      }
    }
  }
});

Template.devDetail.events({
  "click .share-game-link a": function () {
    Session.set("copy-game-link", this._id);
  },
  "click .copy-game-link input": function () {
    var copyGameLink = document.getElementById("copyGameLink")
    copyGameLink.selectionStart = 0;
    copyGameLink.selectionEnd = 999;
    copyGameLink.readOnly = true;
  },
  "click .copy-game-link .close": function () {
    Session.set("copy-game-link", null);
  },
  "click .subscribe-after-joined .close": function () {
    Session.set("joined-game", null);
  }
});

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

  var infowindow = new google.maps.InfoWindow({
    content: "<a href=\"https://maps.google.com/maps?saddr=My+Location&daddr="+latLng.lat()+","+latLng.lng()+"\" target=\"_blank\">Get directions</a>"
  });

  google.maps.event.addListener(marker, 'click', function() {
    infowindow.open(map,marker);
  });

  // A weird hack -- I don't know why an immediate `infowindow.open`
  // escapes notice of the default AutoPan. By waiting one second,
  // the map will autopan to accomodate the infowindow.
  Meteor.setTimeout(function () {
    infowindow.open(map,marker);
  }, 1000);


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

Template.joinOrLeave.helpers({
  addingPlayers: function () {
    var game = this;
    return Session.equals("unauth-join", game._id) ||
      Session.equals("add-friends", game._id);
  }
});

Template.joinOrLeave.events({
  "click .join-game": function () {
    if (Meteor.userId()) {
      addSelfToGame(this._id);
    } else {
      Session.set("unauth-join", this._id);
    }
  },
  "click .leave-game": function () {
    Meteor.call("leaveGame", this._id);
  }
});

var whosPlayingHelpers = {
  userPlayers: function () {
    var isUser = function (player) { return !! player.userId; };
    return _.select(this.players, isUser);
  },
  friends: function (players) {
    var self = this;
    return _.select(players, function (p) {
      return (! p.userId) && p.friendId === self.userId;
    });
  },
  numFriends: function () {
    return this.length;
  }
};
Template.whosPlayingSummary.helpers(whosPlayingHelpers);
Template.whosPlayingEditable.helpers(whosPlayingHelpers);

Template.editGameLink.helpers({
  canEdit: function () {
    var user = Meteor.user();
    if (user) {
      return user._id === this.creator.userId || user.admin;
    } else {
      return false;
    }
  }
});

Template.comments.helpers({
  numComments: function () {
    return (this.comments.length === 0) ? "No" : this.comments.length;
  },
  comments: function () {
    var self = this;
    return _.map(self.comments, function (comment) {
      return _.extend({gameId: self._id}, comment);
    });
  }
});

Template.comments.events({
  "click .remove-comment": function (event, template) {
    var self = this;
    Meteor.call("removeComment", self);
  }
});

Template.addComment.events({
  "submit form.add-comment": function (event, template) {
    event.preventDefault();
    var self = this;
    Alerts.clearSeen({where: "addComment"});
    var comment = template.find("input.comment").value;
    if (! Alerts.test(alertables.comment(comment),
                      {type: "danger", where: "addComment"})) {
      return;
    }
    if (! Meteor.userId()) {
      Session.set("unauth-comment", comment);
    } else {
      Meteor.call("addComment", comment, self._id);
    }
  }
});

Template.addComment.destroyed = function () {
  Session.set("unauth-comment", null);
};

Template.authenticateAndComment.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "authenticateAndComment"});
    var game = this;
    var comment = template.find("input.comment").value;
    if (! Alerts.test(alertables.comment(comment),
                      {type: "danger", where: "authenticateAndComment"})) {
      return;
    }
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) {
      var fullName = fullNameInput.value;
      if (! Alerts.test(alertables.signUp(email, fullName),
                        {type: "danger", where: "authenticateAndComment"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addCommenter", game._id, email, fullName, comment,
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password);
            Alerts.throw({
              message: "Thanks, " + fullName +
                "! Check for an email from " +
                "support@pushpickup.com to verify your email address",
              type: "success", where: game._id
            });
            Session.set("unauth-comment", null);
            Session.set("strange-passwd", result.password);
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "authenticateAndComment"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "authenticateAndComment"
              });
            }
          }
        });
    } else { // attempt to sign in and add comment
      var password = template.find("input.password").value;
      if (! Alerts.test(alertables.signIn(email, password),
                        {type: "danger", where: "authenticateAndComment"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (! err) {
          Meteor.call(
            "addComment", comment, game._id,
            function (error) {
              Session.set("unauth-comment", null); // logged in now
              if (error) {
                console.log(error);
                Alerts.throw({
                  message: "Hmm, something went wrong. Try again?",
                  type: "danger", where: game._id
                });
              }
            });
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "authenticateAndComment"
          });
        }
      });
    }
  },
  "click .authenticate-and-comment .close": function () {
    Session.set("unauth-comment", null);
  }
});

Template.addInfoOrSignIn.helpers({
  email: function () { return Session.get("sign-in.email"); }
});

Template.addInfoOrSignIn.events({
  "click .sign-in": function (evt, templ) {
    Session.set("sign-in.email", templ.find("input.email").value);
    Session.set("sign-in", true);
  },
  "click .add-info": function (evt, templ) {
    Session.set("sign-in.email", templ.find("input.email").value);
    Session.set("sign-in", false);
  }
});

Template.addInfoOrSignIn.destroyed = function () {
  Session.set("sign-in.email", undefined);
  Session.set("sign-in", false);
};


Template.devEditableGame.helpers({
  selectType: function () {
    var self = this;
    var them = GameOptions.find({option: "type"}).map(function (type) {
      return {
        value: type.value,
        text: type.value,
        checked: (type.value === self.type),
        name: 'gameTypeGroup'
      };
    });
    return {id: 'gameType', options: them};
  },
  selectPlayersRequested: function () {
    var self = this;
    var numRequested = self.requested && self.requested.players || 10;
    var them =  _.map(_.range(2, 29, 2), function (i) {
      return { value: i, text: i, selected: (i === numRequested) };
    });
    return {includeLabel: true,
            label: "Players needed", id: "requestedNumPlayers", containerClass: "num-players-container",
            options: them};
  },
  editingGame: function () {
    return this.title === "Edit game";
  },
  atLeastOnePlayer: function () {
    return this.players && (! _.isEmpty(this.players));
  }
});

Template.devSelectWhen.helpers({
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
      var t = moment(dayStart).add('minutes', 15 * i);
      return {
        value: +t,
        text: t.format('h:mmA'),
        selected: ((15 * i) === selectedMinutes)
      };
    });

    them = _.reject(them, function (t) {
      return t.value < +moment() || t.value > +moment().add('weeks', 1);
    });
    return {label: 'Time', id: 'gameTime', containerClass: "game-time-container", options: them};
  },
  selectDay: function () {
    var self = this;
    var selfDayStart = self.startsAt &&
          moment(self.startsAt).startOf('day');
    var them =  _.map(_.range(7), function (i) {
      var dayStart = moment().startOf('day').add('days', i);
      return {
        value: dayStart.valueOf(),
        text: dayStart.format('dddd'),
        selected: (+dayStart === +selfDayStart)
      };
    });
    them[0].text = 'Today';
    them[1].text = 'Tomorrow';
    return {label: "When", 
            id: "gameDay", 
            containerClass: "game-day-container",
            options: them};
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


Template.devEditableGame.events({
  "change #gameDay": function (evt, templ) {
    Session.set("newGameDay", +evt.currentTarget.value);
    Deps.flush(); // update selectable game times immediately
  },
  "change #gameTime": function (evt, templ) {
    Session.set("newGameTime", +evt.currentTarget.value);
  },
  "submit #editGameForm": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var markedIds = $(templ.findAll(".gamePlayers input:checked"))
          .map(function () { return this.value; }).get();
    var remainingPlayers = _.reject(self.players, function (p) {
      return _.contains(markedIds, p.userId || (! p.userId) && p.friendId);
    });

    var game = {
      type: templ.find("#gameType input:checked").value,
      // status depends on (requested.players - players.length)
      startsAt: new Date(+templ.find("#gameTime").value),
      location: {
        name: simplifyLocation(templ.find(".select-location input").value),
        geoJSON: Session.get("selectedLocationPoint")
          || Games.findOne(self._id).location.geoJSON
      },
      note: templ.find("#gameNote").value,
      players: remainingPlayers,

      // for now, no editing comments (simulate an email-list dynamic)
      comments: self.comments,

      requested: selectorValuesFromTemplate({
        players: ["#requestedNumPlayers", asNumber]
      }, templ)
    };

    var utc_offset = Session.get("selectedLocationUTCOffset")
          || Games.findOne(self._id).location.utc_offset;
    if (utc_offset) {
      game.location.utc_offset = utc_offset;
    }

    Meteor.call("editGame", self._id, game);
    Router.go('devDetail', {_id: self._id});
  },
  "keypress .select-location input": function (event, template) {
    if (event.which === 13) { // <RET> pressed
      // submit triggered from location field
      // event.stopImmediatePropagation() and event.preventDefault()
      return false;
    }
    return true;
  },
  "submit #addGameForm": function (event, template) {
    event.preventDefault();
    if (Session.equals("waiting-on", "add")) {
      return;
    } else {
      Session.set("waiting-on", "add");
    }
    Alerts.clearSeen({where: "editableGame"});
    var game = {
      type: template.find("#gameType input:checked").value,
      // status depends on requested.players
      startsAt: new Date(+template.find("#gameTime").value),
      location: {
        name: simplifyLocation(template.find(".select-location input").value),
        geoJSON: Session.get("selectedLocationPoint")
      },
      note: template.find("#gameNote").value,
      players: [],
      comments: [],
      requested: selectorValuesFromTemplate({
        players: ["#requestedNumPlayers", asNumber]
      }, template)
    };
    if (game.requested.players === 0) {
      game.status = "on";
    } else {
      game.status = "proposed";
    }
    if (Session.get("selectedLocationUTCOffset")) {
      game.location.utc_offset = Session.get("selectedLocationUTCOffset");
    }
    try {
      check(game, ValidGame);
    } catch (e) {
      if (e instanceof Match.Error) {
        console.log(e.message);
        var result = /Match error: (.*) in field (.*)/.exec(e.message);
        if (result[2] === 'location.name') {
          Alerts.throw({
            message: "Your game location needs a name.",
            type: "danger", where: "editableGame"
          });
        } else if (result[2] === 'location.geoJSON') {
          Alerts.throw({
            message: "Your game needs a location. A map will appear when you've selected one.",
            type: "danger", where: "editableGame",
            autoremove: 5000
          });
        } else {
          Alerts.throw({
            message: e.message, type: "danger", where: "editableGame"
          });
        }
      } else {
        Alerts.throw({
          message: "Hmm, something went wrong. Try again?",
          type: "danger", where: "editableGame"
        });
      }
      // TODO: fold Session.set("waiting-on", null) calls into a single
      // Deps.autorun that nullifies "waiting-on" whenever there are
      // unseen Alerts because just-thrown Alerts implies error
      // or success of form action.
      Session.set("waiting-on", null);
      return;
    }

    var playing = !! template.find("input[type=checkbox].playing:checked");

    var addedAlert = {
      message: "Game added! Check your email and be sure to forward "
        + " the invitation to your friends.",
      type: "success"
      // add "where" when game _id is available
    };

    if (! Meteor.userId()) {
      var email = template.find("input.email").value;
      var fullNameInput = template.find("input.full-name");
      if (fullNameInput) { // new user
        var fullName = fullNameInput.value;
        if (! Alerts.test(alertables.signUp(email, fullName),
                          {type: "danger", where: "editableGame"})) {
          Session.set("waiting-on", null);
          return;
        }
        Meteor.call("dev.unauth.addGame", email, fullName, game, function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password, function (error) {
              if (!error) {
                playing && Meteor.call("addSelf", {
                  gameId: result.gameId,
                  name: fullName
                }, function (err) {
                  if (!err) {
                    Session.set("joined-game", result.gameId);
                  }
                });
              }
            });
            Meteor.call("sendForwardableInvite", result.gameId);
            Alerts.throw(_.extend({where: result.gameId}, addedAlert));
            Session.set("strange-passwd", result.password);
            Router.go('devDetail', {_id: result.gameId});
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "editableGame"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "editableGame"
              });
            }
            Session.set("waiting-on", null);
          }
        });
      } else { // attempt to sign in, add game, and possibly invite friends
        var password = template.find("input.password").value;
        if (! Alerts.test(alertables.signIn(email, password),
                          {type: "danger", where: "editableGame"})) {
          Session.set("waiting-on", null);
          return;
        }
        Meteor.loginWithPassword(email, password, function (error) {
          if (!error) {
            Meteor.call("addGame", game, function (error, result) {
              if (!error) {
                playing && Meteor.call("addSelf", {
                  gameId: result.gameId
                }, function (err) {
                  if (!err) {
                    Session.set("joined-game", result.gameId);
                  }
                });
                Router.go('devDetail', {_id: result.gameId});
                Meteor.call("sendForwardableInvite", result.gameId);
                Alerts.throw(_.extend({where: result.gameId}, addedAlert));
              } else {
                console.log(error);
                Alerts.throw({
                  message: "Hmm, something went wrong: \""
                    + error.reason + "\". Try again?",
                  type: "danger",
                  where: "editableGame"
                });
                Session.set("waiting-on", null);
              }
            });
          } else {
            console.log(error);
            // typical error.reason: "User not found" or "Incorrect password"
            Alerts.throw({
              message: error.reason, type: "danger", where: "editableGame"
            });
            Session.set("waiting-on", null);
          }
        });
      }
    } else { // authenticated user
      Meteor.call("addGame", game, function (error, result) {
        if (!error) {
          playing && Meteor.call("addSelf", {
            gameId: result.gameId
          }, function (err) {
            if (!err) {
              Session.set("joined-game", result.gameId);
            }
          });
          Router.go('devDetail', {_id: result.gameId});
          Meteor.call("sendForwardableInvite", result.gameId);
          Alerts.throw(_.extend({where: result.gameId}, addedAlert));
        } else {
          console.log(error);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+error.reason+"\". Try again?",
            type: "danger",
            where: "editableGame"
          });
          Session.set("waiting-on", null);
        }
      });
    }
  },
  "click .remove": function (evt, templ) {
    evt.preventDefault();
    if (confirm("Really cancel game? Players will be notified.")) {
      Meteor.call("cancelGame", this._id);
      Router.go('home');
    }
  }
});

Template.devSelectLocation.rendered = function () {
  var template = this;
  autocomplete && google.maps.event.clearListeners(autocomplete);
  autocomplete = new google.maps.places.Autocomplete(
    template.find('.select-location input'));
  google.maps.event.addListener(
    autocomplete, 'place_changed', onSelectLocationChanged);
};

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

Template.loadMoreGames.events({
  "click a": function () {
    Session.set("num-games-requested",
                Session.get("num-games-requested") + 15);
  }
});

Template.loadMoreGames.helpers({
  noMoreGames: function () {
    return Session.get("num-games-requested") > Games.find().count();
  }
});

Template.gameWhen.helpers({
  fromNow: function () {
    return moment(this.startsAt).fromNow();
  },
  displayDay: function () {
    var m = utils.startsAtMomentWithOffset(this);
    var day = m.format('ddd');
    if (m.isSame(moment(), 'day')) {
      day = "Today";
    } else if (m.isSame(moment().add('days', 1), 'day')) {
      day = "Tomorrow";
    }
    return day;
  },
  displayTime: function () {
    var m = utils.startsAtMomentWithOffset(this);
    return m.format('h:mma');
  }
});

Template.settings.events({
  // signed in
  "click .sign-out.trigger": function () {
    Meteor.logout();
    Router.go('home');
  },
  "click .send-verification-email": function () {
    Meteor.call("sendVerificationEmail");
    Alerts.throw({
      message: "Thanks. Look out for an email from support@pushpickup.com" +
        " to verify your email address.",
      type: "info", where: "settings", autoremove: 3000
    });
  }
});


// Set several Template.settings.events of the form:
//
// "click .sign-in.trigger": function () {
//   Session.toggle("settings-sign-in");
// }
var sessionToggler = function (action) {
  return function () {
    Session.toggle("settings-"+action);
  };
};
_.each([
  'sign-in', 'sign-up', 'forgot-password', 'set-password',
  'subscriptions', 'change-email-address', 'change-password',
  'help-and-feedback'
], function (action) {
  var key =  "click ."+action+".trigger";
  var eventMap = {};
  eventMap[key] = sessionToggler(action);
  Template.settings.events(eventMap);
});

Template.settingsItem.helpers({
  title: function () {
    return _.string.titleize(_.string.humanize(this.name))
      .replace('And','&');
  },
  isSetting: function () {
    return Session.get("settings-" + this.name);
  },
  action: function () {
    return Template[_.string.camelize("dev-"+this.name)];
  }
});

Template.devSignIn.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "devSignIn"});
    var email = template.find("input.email").value;
    var password = template.find("input.password").value;
    if (! Alerts.test(alertables.signIn(email, password),
                      {type: "danger", where: "devSignIn"})) {
      return;
    }
    Meteor.loginWithPassword(email, password, function (err) {
      if (err) {
        console.log(err);
        Alerts.throw({
          message: err.reason, type: "danger", where: "devSignIn"
        });
      } else {
        Router.go('home');
      }
    });
  }
});

Template.devSignUp.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "devSignUp"});
    var fullName = template.find("input.full-name").value;
    var email = template.find("input.email").value;
    var password = template.find("input.password").value;
    if (! Alerts.test(alertables.signUp(email, fullName, password),
                      {type: "danger", where: "devSignUp"})) {
      return;
    }
    Meteor.call("dev.signUp", email, fullName, password, function (err) {
      if (err) {
        console.log(err);
        Alerts.throw({
          message: err.reason, type: "danger", where: "devSignUp"
        });
      } else {
        Meteor.loginWithPassword(email, password, function (err) {
          if (err) {
            console.log(err);
            Alerts.throw({
              message: err.reason, type: "danger", where: "devSignUp"
            });
          } else {
            Router.go('home');
          }
        });
      }
    });
  }
});

Template.devHelpAndFeedback.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Meteor.call("sendFeedback", {
      type: template.find("input[type=radio]:checked").value,
      message: template.find("textarea").value
    });
  }
});

Template.devSetPassword.events({
  "submit form": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var password = templ.find("input[type=password]").value;
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
        Session.get("set-password-token"),
        password,
        function (err) {
          if (!err) {
            Alerts.throw({
              message: "Your password is set",
              type: "success", where: "top",
              autoremove: 3000
            });
            Session.set("set-password-token", null);
            Session.set("viewing-settings", false);
          } else {
            console.log(err);
            if (err.reason === "Token expired") {
              Alerts.throw({
                message: "The token to set your password has expired. " +
                  "How about we send a fresh link?",
                type: "danger", where: "forgotPassword"
              });
              Session.set("set-password-token", null);
              Session.set("settings-forgot-password", true);
            } else {
              Alerts.throw({
                message: err.reason,
                type: "danger", where: "setPassword"
              });
            }
          }
        });
    } catch (err) {
      console.log(err);
      Alerts.throw({
        message: "A token to set your password was "+
          "not found (or has expired). How about we send a fresh link?",
        type: "danger", where: "forgotPassword"
      });
      Session.set("set-password-token", null);
      Session.set("settings-forgot-password", true);
    }
  }
});

Template.devForgotPassword.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    Accounts.forgotPassword(
      {email: templ.find("input[type=email]").value},
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Check for an email from " +
              "support@pushpickup.com to set your " +
              " password",
            type: "success", where: "settings"
          });
          Session.set("settings-forgot-password", false);
        } else {
          console.log(err);
          // e.g. "User not found"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "forgotPassword"
          });
        }
      });
  }
});

Template.devChangePassword.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    var oldPass = templ.find("input.old-password").value;
    var newPass = templ.find("input.new-password").value;
    // `oldPass` may not test as `ValidPassword` if requirements change.
    if (! Match.test(oldPass, NonEmptyString)) {
      Alerts.throw({
        message: "Please enter your current password.",
        type: "danger", where: "changePassword"
      });
      return;
    }
    if (! Match.test(newPass, ValidPassword)) {
      Alerts.throw({
        message: "New password must be at least 6 characters.",
        type: "danger", where: "changePassword"
      });
      return;
    }
    Accounts.changePassword(
      templ.find("input.old-password").value,
      templ.find("input.new-password").value,
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Password changed", type: "success", where: "settings",
            autoremove: 3000
          });
          Session.set("settings-change-password", false);
        } else {
          Alerts.throw({
            message: err.reason, type: "danger", where: "changePassword"
          });
        }
      });
  }
});

Template.devChangeEmailAddress.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    var newEmail = templ.find("input[type=email]").value;
    var pass = templ.find("input[type=password]").value;
    var user = Meteor.user();
    var oldEmail = user && user.emails[0].address;
    if (! Match.test(newEmail, ValidEmail)) {
      Alerts.throw({
        message: "That email address doesn't look valid.",
        type: "danger", where: "changeEmailAddress"
      });
      return;
    }
    Meteor.loginWithPassword(oldEmail, pass, function (err) {
      if (err) {
        Alerts.throw({
          message: "We could not sign you in again using that password. " +
            "Please try again.",
          type: "danger", where: "changeEmailAddress"
        });
      } else {
        Meteor.call("changeEmailAddress", newEmail, function (err, res) {
          console.log(err);
          if (err) {
            Alerts.throw({
              message: err.reason, type: "danger", where: "changeEmailAddress"
            });
          } else {
            Alerts.throw({
              message: "Thanks! Remember to verify your address.",
              type: "info", where: "settings"
            });
            Session.set("settings-change-email-address", null);
          }
        });
      }
    });
  }
});

Template.devSubscriptions.events({
  "click .unsubscribe-all": function () {
    _.forEach(
      _.pluck(UserSubs.find().fetch(), '_id'),
      function (id) {
        UserSubs.remove(id); });
  }
});

Template.devSubscriptions.helpers({
  loading: function () {
    return ! Session.equals("user_subs_ready", true);
  },
  hasSubs: function () {
    return UserSubs.find().count() > 0;
  },
  subsCount: function () {
    return UserSubs.find().count();
  }
});

Template.devFooter.helpers({
  omit: function () {
    var self = this;
    // Use data contexts supplied by add-game and edit-game routes
    // to omit footer (i.e., Privacy Policy) for those views.
    return (self.action && self.action === 'edit') ||
      (self.action && self.action === 'add');
  }
});

////
// Admin view and helpers
////

Template.adminView.created = function () {
  Session.set("waiting-on", "all-games-snapshot");
  Meteor.call("allGamesSnapshot", function (err, res) {
    if (!err) {
      Session.set("all-games-snapshot", res);
    } else {
      alert("Error: " + err.message);
    }
    Session.set("waiting-on", null);
  });
};

Template.adminView.helpers({
  upcomingGames: function () {
    // an array snapshot of minimal info on all upcoming games in the system
    return _.sortBy(Session.get("all-games-snapshot"), "startsAt");
  },
  fromNow: function () {
    return moment(this.startsAt).fromNow();
  }
});

Template.adminView.destroyed = function () {
  Session.set("all-games-snapshot", null);
};
