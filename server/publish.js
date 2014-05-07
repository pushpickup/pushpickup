Meteor.publish("game", function (id) {
  return Games.find(id);
});

Meteor.publish("user-data", function () {
  return Meteor.users.find({_id: this.userId},
                           {fields: {'admin': 1}});
});

Meteor.publish("user-upcoming-games", function () {
  check(this.userId, String);
  return Games.find({startsAt: {$gte: new Date()},
                     $or: [{'players.userId': this.userId},
                           {'creator.userId': this.userId}]});
});

var nearbyGamesQuery = function (location, options) {
  check(location, GeoJSONPoint);
  check(options, Match.Optional({
    types: Match.Optional([GameType]),
    maxDistance: Match.Optional(Number),
    limit: Match.Optional(Match.Integer)
  }));
  var types = options.types ||
        _.pluck(GameOptions.find({option: "type"}).fetch(), 'value');
  var maxDistance = (options.maxDistance && (options.maxDistance < 100000)) ?
        options.maxDistance : 100000; // 100,000 m => 62 miles
  return {
    'location.geoJSON': {
      $near: {$geometry: location},
      $maxDistance: maxDistance
    },
    'type': {$in: types}
  };
};

// Meteor.publish("everywhere-games", function (options) {
//   return Games.find({}, { 'startsAt': {$gte: new Date()} }), {
//     sort: {startsAt: 1}, limit: 15 });
// });

Meteor.publish("nearby-upcoming-games", function (location, options) {
  var nearby = nearbyGamesQuery(location, options);
  var limit = options.limit || 15; // `check`ed by nearbyGamesQuery
  return Games.find(_.extend(nearby, {
    'startsAt': {$gte: new Date()}
  }), {
    sort: {startsAt: 1}, limit: limit
  });
});

var geoWithinGamesQuery =  function (geometry, options) {
  check(geometry, GeoJSONPolygon);
  check(options, Match.Optional({
    types: Match.Optional([GameType]),
    limit: Match.Optional(Match.Integer)
  }));
  var types = options.types ||
        _.pluck(GameOptions.find({option: "type"}).fetch(), 'value');
  return {
    'location.geoJSON': {
      $geoWithin: {$geometry: geometry}
    },
    'type': {$in: types}
  };
};

Meteor.publish("geowithin-upcoming-games", function (geometry, options) {
  var geoWithin = geoWithinGamesQuery(geometry, options);
  var limit = options.limit || 15; // `check`ed by geoWithinGamesQuery
  return Games.find(_.extend(geoWithin, {
    'startsAt': {$gte: new Date()}
  }), {
    sort: {startsAt: 1}, limit: limit
  });
});

// DEPRECATED 2014/02/21
Meteor.publish("games", function(query, pageNum) {
  check(query, {
    dateRanges: [DateRange],
    geoWithin: GeoJSONPolygon,
    gameTypes: [GameType]
  });
  check(pageNum, Match.Integer);
  var dbQuery = {};
  // select for dateRanges
  var startsAtClauses = [];
  _.each(query.dateRanges, function (dateRange) {
    startsAtClauses.push({
      startsAt: {$gte: dateRange.gte, $lt: dateRange.lt}
    });
  });
  dbQuery = _.extend(dbQuery, {$or: startsAtClauses});

  // select for geoWithin
  dbQuery = _.extend(dbQuery, {
    'location.geoJSON': {$geoWithin: {$geometry: query.geoWithin}}
  });

  // select for gameTypes
  if (_.isEmpty(query.gameTypes)) {
    query.gameTypes = _.pluck(GameOptions.find({option: "type"}).fetch(),
                              'value');
  }
  dbQuery = _.extend(dbQuery, {type: {$in: query.gameTypes}});

  return Games.find(dbQuery, {
    sort: {startsAt: 1},
    skip: pageNum * recordsPerPage,
    limit: recordsPerPage
  });
});

Meteor.publish("user_subs", function () {
  var self = this;
  // DEACTIVATED for now. Return an empty cursor
  // for use by code that uses UserSubs.
  return UserSubs.find({userId: -1});
  //return UserSubs.find({userId: self.userId});
});
