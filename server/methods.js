Meteor.methods({
  "nearest-past-games": function (location) {
    this.unblock();
    check(location, GeoJSONPoint);
    return Games.find({
      'startsAt': {$lt: new Date()},
      'location.geoJSON': {$near: {$geometry: location}}
    }, {limit: 15}).fetch();
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
        + moment(game.startsAt).format('ddd h:mma'),
      text: "Want to join in? Below is a link to the game.\n\n"
        + Meteor.absoluteUrl('dev/g/'+gameId)
        + "\nThanks for helping to push pickup."
    });
  }
});
