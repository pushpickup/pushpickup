var gameOptionsHandle = Meteor.subscribe("game_options");
Deps.autorun(function (c) {
  if (gameOptionsHandle.ready()) {
    Session.setDefault(
      "game-types",
      _.pluck(GameOptions.find({option: "type"}).fetch(), 'value'));
    c.stop();
  }
});
Session.setDefault('searching', 'not');
Session.setDefault('search-results', false);

var handlebarsHelperMap = {
  SGet: function (key) { return Session.get(key); },
  SEql: function (key, val) { return Session.equals(key, val); },
  userInGame: function () {
    // are global handlebars helpers reactive? Seems so.
    var game = this;
    return Games.findOne({
      _id: game._id, 'players.userId': Meteor.userId()
    });
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
  }
};
(function (handlebarsHelperMap) {
  _.forEach(_.keys(handlebarsHelperMap), function (key) {
    Handlebars.registerHelper(key, handlebarsHelperMap[key]);
  });
})(handlebarsHelperMap);


Template.devNav.events({
  'click .start-search': function () { Session.set('searching', 'during'); },
  'click .search-input': function () { Session.set('searching', 'during'); },
  'click .exit-search': function () {
    if (Session.equals('search-results', true)) {
      Session.set('searching', 'after');
    } else {
      Session.set('searching', 'not');
    }
  },
  'click .back': function () {
    Session.set('searching', 'not');
    Session.set('search-results', false);
  }
});

Template.listOfGames.helpers({
  games: function () { return Games.find({}, {sort: {startsAt: 1}}); }
});

Template.listOfGames.events({
  "click .game-summary": function () {
    Router.go('devDetail', {_id: this._id});
  }
});

Template.addFriendsLink.events({
  "click .add-friends-link": function () {
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
  Meteor.call("addPlayer", gameId, Meteor.user().profile.name, function (err) {
    if (!err) {
      Session.set("unauth-join", null);
      Session.set("sign-in-and-join", null);
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

Template.listedGame.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: self._id});
  }
});

Template.whoIsPlaying.helpers({
  playing: function () {
    return _.contains(_.pluck(this.players, 'userId'), Meteor.userId());
  },
  others: function () {
    var numOthers = this.players.length - 1;
    return (numOthers == 1) ? "1 other": numOthers + " others";
  }
});

var makeFriends = function (nameInputs, emailInputs) {
  var friends = {};
  _.forEach(nameInputs, function (input) {
    friends[input.id] = {};
    friends[input.id].name = input.value;
  });
  _.forEach(emailInputs, function (input) {
    friends[input.id].email = input.value;
  });
  return _.reject(_.values(friends), function (friend) {
    return _.isEmpty(friend.name);
  });
};

Template.addSelfAndFriends.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "addSelfAndFriends"});
  }
});

Template.addSelfAndFriends.events({
  "submit form": function (event, template) {
    var game = this;
    event.preventDefault();
    var email = template.find("input.email").value;
    var fullName = template.find("input.full-name").value;
    var friends = makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    Meteor.call(
      "dev.unauth.addPlayers", game._id, email, fullName, friends,
      function (error, result) {
        if (!error) {
          Meteor.loginWithPassword(email, result.password);
          Alerts.throw({
            message: "Thanks, " + fullName +
              "! Check for an email from " +
              "support@pushpickup.com to verify your email address",
            type: "success", where: game._id
          });
          Session.set("unauth-join", null);
          Session.set("strange-passwd", result.password);
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
  },
  "click .add-self-and-friends .close": function () {
    Session.set("unauth-join", null);
  },
  "click .sign-in-and-join": function () {
    Session.set("sign-in-and-join", this._id);
  }
});

Template.addSelfAndFriends.destroyed = function () {
  Alerts.collection.remove({where: "addSelfAndFriends"});
};

Template.addFriends.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "addFriends"});
  }
});

Template.addFriends.events({
  "submit form": function (event, template) {
    var game = this;
    event.preventDefault();
    var friends = makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    Meteor.call(
      "dev.addFriends", friends, Meteor.userId(), game._id,
      function (error, result) {
        if (!error) {
          Alerts.throw({
            message: "Thanks, " + Meteor.user().profile.name +
              "! An added friend is a happy friend (hopefully).",
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

Template.signInInline.helpers({
  alerts: function () {
    var self = this;
    return Template.meteorAlerts({where: "signInInline"});
  },
  error: function () {
    return (Alerts.collection.findOne({type: "danger", where: "signInInline"})) ?
      "has-error": "";
  }
});

Template.signInInline.events({
  "submit .sign-in": function (evt, templ) {
    evt.preventDefault();
    Meteor.loginWithPassword(
      templ.find("input.email").value,
      templ.find("input.password").value,
      function (err) {
        if (!err) {
          addSelfToGame(Session.get("sign-in-and-join"));
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason, type: "danger", where: "signInInline"
          });
        }
      });
  },
  "click .sign-in-inline .close": function () {
    Session.set("sign-in-and-join", null);
  }
});

Template.gameSummary.helpers({
  type: function () {
    var game = this;
    return _.string.capitalize(game.type);
  },
  day: function () {
    var game = this;
    return moment(game.startsAt).format('dddd');
  },
  time: function () {
    var game = this;
    return moment(game.startsAt).format('h:mma');
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
      var rest_with_state_abbr = comma_separated[1].match(/.*[A-Z]{2}/);
      if (! rest_with_state_abbr) {
        return comma_separated[1];
      } else {
        return rest_with_state_abbr[0];
      }
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
    var latLng = place.geometry.location;
    Session.set("selectedLocationPoint", geoUtils.toGeoJSONPoint(latLng));
    Session.set("selectedLocationName",place.formatted_address);
  } else {
    $('.search-input input').get(0).placeholder = 'Enter Location';
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
    autocomplete, 'place_changed', onPlaceChanged); // call Meteor.method
};

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

  var map = new google.maps.Map(
    self.find('.findings-map-canvas'), {
      zoom: 12, //18 good for one-game zoom
      center: geoUtils.toLatLng(Session.get("selectedLocationPoint")),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
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
          Session.set("selectedLocationName", selectedResult.formatted_address);
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
    Session.set("geoWithin", geoUtils.toGeoJSONPolygon(map.getBounds()));
    // asynchronous Session.set('selectedLocationName',...)
    locationName.sync();
    Alerts.collection.remove({where: "subscribe"});
  });

  if (! self._syncMapWithSearch) {
    self._syncMapWithSearch = Deps.autorun(function () {
      if (Session.equals("searching", "after")) {
        map.panTo(geoUtils.toLatLng(Session.get("selectedLocationPoint")));
        map.setZoom(12);
        // implicit Session.set('geoWithin',...) via map 'idle' listener
      }
    });
  }

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
        marker.setMap(null);
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
};

Template.findingsMap.destroyed = function () {
  this._manageMapMarkers && this._manageMapMarkers.stop();
  this._syncMapWithSearch && this._syncMapWithSearch.stop();
};

Template.subscribe.helpers({
  detail: function () {
    return ppConjunction(Session.get('game-types')) +
      " in " + ppRegion(Session.get('selectedLocationName'));
  },
  status: function () {
    var alert = Alerts.collection.findOne({where: "subscribe"});
    if (alert) {
      return Template.meteorAlerts({where: "subscribe"});
    } else {
      return Template.subscribeButton();
    }
  }
});

Template.subscribeButton.events({
  'click button': function () {
    // for now, simply simulate subscribing user
    Alerts.throw({
      message: "**Subscribed!** We'll let you know when there are new games.",
      type: "success",
      where: "subscribe"
    });
  }
});

Template.subscribe.destroyed = function () {
  Alerts.collection.remove({where: "subscribe"});
};

Template.devDetail.events({
  "click .share-game-link": function () {
    Session.set("copy-game-link", this._id);
  },
  "click .copy-game-link .close": function () {
    Session.set("copy-game-link", null);
  }
});

Template.devDetailBody.helpers({
  alerts: function () {
    var self = this; // the game
    return Template.meteorAlerts({where: self._id});
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
      mapTypeControl: true,
      panControl: false,
      streetViewControl: false,
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
