Meteor.methods({
  "nearest-past-games": function (location) {
    this.unblock();
    check(location, GeoJSONPoint);
    return Games.find({
      'startsAt': {$lt: new Date()},
      'location.geoJSON': {$near: {$geometry: location}}
    }, {limit: 15}).fetch();
  },
  "utc-offset-startsAt-day-and-time": function (game) {
    var offset = game.location.utc_offset;
    if (! Match.test(offset, UTCOffset)) {
      offset = -8; // California knows how to party
    }
    // moment and google offsets differ in sign
    return moment(game.startsAt).zone(-offset).format('ddd h:mma');
  },
  "inviteFriends": function (emails, gameId) {
    this.unblock();
    check(emails, [ValidEmail]);
    check(gameId, String);
    var game = Games.findOne(gameId);
    var user = Meteor.users.findOne(this.userId);
    if (!game || !user) return;
    Email.send({
      from: user.emails[0].address,
      to: emails,
      subject: user.profile.name + " invited you to play "+game.type+" "
        + Meteor.call("utc-offset-startsAt-day-and-time", game),
      text: "Want to join in? Below is a link to the game.\n\n"
        + Meteor.absoluteUrl('dev/g/'+gameId)
        + "\nThanks for helping to push pickup."
    });
  }
});
