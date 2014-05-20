/* Default Session Variables */
Session.setDefault('searching', 'not');
Session.setDefault('search-results', false);

// Set default location to Berkeley
AmplifiedSession.setDefault("current-location", Location.defaultLocation);
Session.setDefault("map-center", Location.defaultLocation.geo);
AmplifiedSession.setDefault("user-location-set", false);

Session.setDefault(
  "game-types",
  _.pluck(GameOptions.find({option: "type"}).fetch(), 'value')
);
Session.setDefault("max-distance", 100000); // 100,000 m => 62 miles

var initialNumGamesRequested = 15;
Session.setDefault("num-games-requested", initialNumGamesRequested);

/* Autoruns */

Deps.autorun(function () {
  if (Session.equals("get-user-location", "success")) {
    $('.search-input[type=search]').val("Current Location");
    console.log("get-user-location = success")
    Meteor.setTimeout(function () {
      Session.set("get-user-location", null);
    }, 5000);
  } else if (Session.equals("get-user-location", "get")) {
    Location.getUserLocation();
  }
});

Deps.autorun(function () {
  if (! Session.equals("dev-mode", true))
    return;

  if (Session.equals("search-results", false)) {
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
        "nearby-upcoming-games", AmplifiedSession.get("current-location").geo, {
          types: Session.get("game-types"),
          maxDistance: Session.get("max-distance"),
          limit: Session.get("num-games-requested")
          
        }, function () { Session.set("gamesReady", true); });
    });

    // Grab up to initialNumGamesRequested past games
    // as near as possible to current location
    Deps.autorun(function () {
      var location = AmplifiedSession.get("current-location").geo;
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