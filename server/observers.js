
var sendGameOnEmail = function (playerName, emailAddress, game) {
  sendEmail({
    from: emailTemplates.from,
    to: playerName + "<" + emailAddress + ">",
    subject: "Game ON: " + game.type + " " +
      utils.displayTime(game) + " at " +
      game.location.name.replace(/,.*/,''),
    text: "Enjoy yourself, " + playerName + ".\n" +
      "For your reference, [here](" + Meteor.absoluteUrl('g/'+game._id)
      + ") is a link to the game.\n"
      + "\n"
      + "Thanks for helping to push pickup."
  });
};

var sendGameAddedNotification = function (user, gameId, game) {
  var verifiedEmail = _.find(user.emails, function (e) { return e.verified; });
  if (verifiedEmail) {
    sendEmail({
      from: emailTemplates.from,
      to: user.profile.name + " <" + verifiedEmail.address + ">",
      subject: "Game " + game.status + ": " + game.type + " "
        + utils.displayTime(game) + " at "
        + game.location.name,
      text: user.profile.name + ",\n"
        + "Want to join in? [Here](" + Meteor.absoluteUrl('g/'+gameId)
        + ") is a link to the game.\n"
        + "\n"
        + "Thanks for helping to push pickup."
    });
  }
};

sendGameOnEmails = function (game) {
  var players = _.map(game.players, function (player) {
    var user = Meteor.users.findOne(player.userId);
    if (user && user.emails && user.emails[0].verified) {
      return {
        name: user.profile.name,
        address: user.emails[0].address
      };
    } else {
      return null;
    }
  });
  // _.uniq: (array, isSorted, transformation) -> array
  players = _.uniq(players, false, function (player) {
    return player && player.address;
  });
  _.forEach(players, function (player) {
    player && sendGameOnEmail(player.name, player.address, game);
  });
};

var userSubQuery = function (game) {
  return {
    types: game.type,
    days: moment(game.startsAt).day(),
    region: {$geoIntersects: {$geometry: game.location.geoJSON}}
  };
};

observers = {
  gameOnObserver: function () {
    var handler = Games.find({status: "proposed"}).observeChanges({
      removed: function (id) {
        // likely a status update from "proposed" to "on",
        // but could be a game cancellation
        var game = Games.findOne(id);
        if (! game) {
          return; // game cancelled
        } else if (game.players.length < 2) {
          return; // fewer than two players, so don't send email
        } else { // status has changed to "on"
          sendGameOnEmails(game);
        }
      }
    });
  },
  gameAddedNotifier: function () {
    var handler = Games.find({notificationsSent: {$exists: false}})
          .observeChanges({
            added: function (id, fields) {
              var subs = UserSubs.find(userSubQuery(fields), {
                fields: {userId: 1}
              }).fetch();
              var userIds = _.uniq(_.pluck(subs, 'userId'));
              var users = _.map(userIds, function (id) {
                return Meteor.users.findOne(id);
              });
              _.forEach(users, function (user) {
                if (user) { sendGameAddedNotification(user, id, fields); }
              });
              Games.update(id, {$set: {notificationsSent: true}});
            }
          });
  }
};
