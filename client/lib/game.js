Game = (function() {
  var gameModule = {};

  gameModule.addSelfToGame = function (gameId) {
    if (!gameId) {
      return;
    }
    var path = Router.current().path;
    var inviteeId = path.split('?')[1]

    Meteor.call("addSelf", {
      gameId: gameId,
      name: Meteor.user().profile.name
    }, function (err) {
      if (!err) {
        Session.set("joined-game", gameId);
        Session.set("unauth-join", null);
        Alerts.throw({
          message: "You've joined this game -- be sure to invite your friends!",
          type: "success", where: gameId,
          autoremove: 5000
        });

        var fullName = Meteor.user().profile.name;
        var email = Meteor.user().emails[0].address;

        if (inviteeId) {
          Meteor.call(
            "dev.notifyInviter", gameId, email, fullName, inviteeId,
            function (error, result) {
              if (error) {
                console.log(error);
              }
            });
        }
      } else {
        console.log(err);
        Alerts.throw({
          message: "Hmm, something went wrong: \"" + err.reason + "\". Try again?",
          type: "danger",
          where: gameId
        });
      }
    });
  };

  return gameModule;
})();