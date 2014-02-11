// // Game generator
// var insertGame = (function () {
//   // within the default map bounds (berkeley, ca)
//   var lngBnds = {gte: -122.409603, lt: 122.134944};
//   var latBnds = {gte: 37.774920, lt: 37.937563};
// })();

// get n random players
var getNPlayers = (function () {
  var names = ["Shirl", "Camilla", "Blondell", "Shaunta", "Simone", "Riley", "Daniele", "Jefferson", "Jewell", "Olen", "Ira", "Ona", "Harriet", "Sheron", "Adriane", "Geri", "Hettie", "Clara", "Melita", "Soo", "Allyn", "Lissette", "Latrisha", "Holly", "Arnette", "Takako", "Lezlie", "Lashaun", "May", "Francis", "Dacia", "Katharine", "Max", "Kristan", "Shiela", "Lora", "Honey", "Sade", "Pok", "Harriette", "Vivan", "Dusty", "Nelly", "Clora", "Jolyn", "Caroline", "Cindie", "Judie", "Alma", "Virgilio"];
  return function (n) {
    return _.map(_.sample(names, n), function (name) {
      return {name: name, rsvp: "in"};
    });
  };
})();

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

// Populate games db from Assets
bootstrap = function () {
  var donny = Meteor.users.findOne({
    'emails.address': 'donny@pushpickup.com'
  });
  var donnyId = donny && donny._id;
  if (!donnyId) {
    donnyId = Accounts.createUser({
      email: 'donny@pushpickup.com',
      password: 'foobar',
      profile: {name: 'Donny Winston'}
    });
    Meteor.users.update(donnyId, {$set: {emails: [{
      address: "donny@pushpickup.com", verified: true
    }]}});
  }

  var types = _.pluck(GameOptions.find({option: "type"}).fetch(), 'value');

  var featureCollection = EJSON.parse(
    Assets.getText('exampleRecurringUltimateGames.json'));
  _.each(featureCollection.features, function (feature) {
    var location = {geoJSON: feature.geometry,
                    name: feature.properties.name};
    var note = feature.properties.note;
    var startsAts = asMoments(feature.properties.startsAts);
    var requested = {};
    var players = [];
    var statuses = _.pluck(GameOptions.find({option: "status"}).fetch(),
                           'value');
    _.each(startsAts, function (startsAt) {
      requested.players = _.random(2,14);
      players = getNPlayers(_.random(requested.players - 1));
      Games.insert({creator: {name: "Donny Winston", userId: donnyId},
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
