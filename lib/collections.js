Games = new Meteor.Collection("games");
UserSubs = new Meteor.Collection("user_subs");
Invitees = new Meteor.Collection("invitees");



GameOptions = new Meteor.Collection(null);

var types = ["ultimate", "basketball", "soccer"];
var statuses = ["proposed", "on"];
var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

_.forEach(types, function (type) {
  GameOptions.insert({option: "type", value: type});
});
_.forEach(statuses, function (status) {
  GameOptions.insert({option: "status", value: status});
});
_.forEach(days, function (day, i) {
  // value used for sorting and used by moment()
  GameOptions.insert({option: "day", value: i, name: day});
});
