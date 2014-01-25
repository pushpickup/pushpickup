var gameOnEmail = function (playerName, emailAddress, game) {
  Email.send({
    from: "support@pushpickup.com",
    to: playerName + "<" + emailAddress + ">",
    subject: "Game ON: " + game.type + " " +
      moment(game.startsAt).format('dddd h:mmA') + " at " +
      game.location.name,
    text: "Have a great game, " + playerName + ".\n" +
      "For your reference, below is a link to the game.\n\n" +
      Meteor.absoluteUrl('games/'+game._id) + "\nThanks for playing."
  });
};

observers.gameOnObserver = function () {
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
          player && gameOnEmail(player.name, player.address, game);
        });
      }
    }
  });
};
