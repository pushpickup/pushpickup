Game = function (doc) {
  _.extend(this, doc);
};
_.extend(Game.prototype, {
  displayTime: function () {
    var offset = this.location.utc_offset;
    if (! Match.test(offset, UTCOffset)) {
      offset: -8; // Default to California
    }
    // UTC offsets returned by Google Places API differ in sign
    // from what is expected by moment.js
    return moment(this.startsAt).zone(-offset).format('ddd h:mma');
  }
});

Games = new Meteor.Collection("games", {
  transform: function (doc) { return new Game(doc); }
});
UserSubs = new Meteor.Collection("user_subs");



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
