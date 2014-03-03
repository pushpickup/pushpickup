// Populate the database with sample users and games

// example player names
var names = ["Shirl", "Camilla", "Blondell", "Shaunta", "Simone", "Riley", "Daniele", "Jefferson", "Jewell", "Olen", "Ira", "Ona", "Harriet", "Sheron", "Adriane", "Geri", "Hettie", "Clara", "Melita", "Soo", "Allyn", "Lissette", "Latrisha", "Holly", "Arnette", "Takako", "Lezlie", "Lashaun", "May", "Francis", "Dacia", "Katharine", "Max", "Kristan", "Shiela", "Lora", "Honey", "Sade", "Pok", "Harriette", "Vivan", "Dusty", "Nelly", "Clora", "Jolyn", "Caroline", "Cindie", "Judie", "Alma", "Virgilio"];

var examplePlayers;
var userNumGames = {}; // Keep track of how many games each user is in

// retrieve n players. useful for adding players to a game in one swoop
// 5 games max (past or upcoming) per player
var getUpToNPlayers = function (n) {
  var nPlayers = _.map(_.sample(examplePlayers, n), function (user) {
    return {userId: user._id, name: user.profile.name, rsvp: "in"};
  });
  return _.compact(_.map(nPlayers, function (player) {
    if (userNumGames[player.userId] >= 5) {
      return null;
    } else {
      userNumGames[player.userId] += 1;
      return player;
    }
  }));
};

// Helper function for parsing relative start times
var asMoments = function (relativeStartsAts) {
  // input: array of form ["Tuesday 05:15 PM","Thursday 05:15 PM",...]
  // output: array of corresponding moments
  return _.map(relativeStartsAts, function (relativeStartsAt) {
    var startsAt = moment(moment().week() +" "+ relativeStartsAt,
                          "ww dddd hh:mm A");
    return (startsAt.isBefore(moment())) ?
      startsAt.add('weeks', 1) : startsAt;
  });
};

// flips a coin to return the same moment or one shifted a week earlier.
var randomlyPastOrFuture = function (m) {
  return (Random.fraction() < 0.5) ?
    m : moment(m).subtract('weeks', 1);
};

// Populate users db from names above, and populate games db from Assets
bootstrap = function () {

  // for each name, create a user with a verified email address
  _.forEach(names, function (name) {
    var id = Accounts.createUser({
      // Example names above are not full names, but defensively
      // replace spaces with periods below.
      email: name.toLowerCase().replace(/\s/,'.') + "@pushpickup.com",
      password: "foobar", profile: {name: name}
    });
    Meteor.users.update(id, {$set: {'emails.0.verified': true}});
  });

  // inserted test games will not include donny@pushpickup.com as a player
  examplePlayers = Meteor.users.find().fetch();
  _.forEach(examplePlayers, function (user) {
    userNumGames[user._id] = 0;
  });

  // establish donny, a power user (can edit any game)
  var donnyId = Accounts.createUser({
    email: 'donny@pushpickup.com',
    password: 'foobar',
    profile: {name: 'Donny Winston'}
  });
  Meteor.users.update(donnyId, {$set: {'emails.0.verified': true}});

  // establish Tim Tester, who creates test games
  var timId = Accounts.createUser({
    email: 'tim.tester@pushpickup.com',
    password: 'foobar',
    profile: {name: 'Tim Tester'}
  });
  Meteor.users.update(timId, {$set: {'emails.0.verified': true}});

  var types = _.pluck(GameOptions.find({option: "type"}).fetch(), 'value');

  var featureCollection = EJSON.parse(
    Assets.getText('exampleRecurringUltimateGames.json'));
  _.each(featureCollection.features, function (feature) {
    var location = {geoJSON: feature.geometry,
                    name: feature.properties.name};
    var note = feature.properties.note;
    var startsAts = _.map(asMoments(feature.properties.startsAts),
                          randomlyPastOrFuture);
    var requested = {};
    var players = [];
    var statuses = _.pluck(GameOptions.find({option: "status"}).fetch(),
                           'value');
    _.each(startsAts, function (startsAt) {
      requested.players = _.random(2,14);
      players = getUpToNPlayers(_.random(requested.players - 1));
      Games.insert({creator: {name: "Tim Tester", userId: timId},
                    notificationsSent: true,
                    type: _.sample(types),
                    status: _.sample(statuses),
                    location: location, note: note,
                    startsAt: startsAt.toDate(),
                    players: players,
                    comments: [],
                    requested: requested});
    });
  });
  var days = [0,1,2,3,4,5,6];
  var berkeley = {
    type: "Polygon",
    coordinates: [[[-122.409603,37.937563],
                   [-122.134944,37.937563],
                   [-122.134944,37.774920],
                   [-122.409603,37.774920],
                   [-122.409603,37.937563]]]
  };
  UserSubs.insert({
    userId: donnyId,
    types: types,
    days: days,
    region: berkeley
  });
};
