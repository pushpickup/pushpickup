Template.listOfGames.events({
  "click .game-summary": function () {
    Router.go('devDetail', {_id: this._id});
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