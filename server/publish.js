Meteor.startup(function () {

  Meteor.publish("game_options", function () {
    return GameOptions.find();
  });

  Meteor.publish("game", function (id) {
    return Games.find(id);
  });

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
    return UserSubs.find({userId: self.userId});
  });

});
