Template.addSelfAndFriends.events({
  "submit form": function (event, template) {
    
    var path = Router.current().path
    var inviteeId = path.split('?')[1]

    var game = this;
    event.preventDefault();
    Alerts.clearSeen({where: "addSelfAndFriends"});
    // rejects "empty" friends
    var friends = Friends.makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    if (! Alerts.test(alertables.inviteFriends(friends),
                      {type: "danger", where: "addSelfAndFriends"})) {
      return;
    }
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) { // new user
      var fullName = fullNameInput.value;
      if (! Alerts.test(alertables.signUp(email, fullName),
                        {type: "danger", where: "addSelfAndFriends"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addSelfAndFriends", game._id, email, fullName, friends,
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password, function (err) {
              if (!err) {
                Session.set("joined-game", game._id);
                Session.set("unauth-join", null);
                Session.set("strange-passwd", result.password);
                Alerts.throw({
                  message: "You've joined this game -- be sure to invite your friends!",
                  type: "success", where: game._id,
                  autoremove: 5000
                });
                if (inviteeId) {
                  Meteor.call(
                    "dev.notifyInviter", game._id, email, fullName, inviteeId,
                    function (error, result) {
                      if (error) {
                        console.log(error);
                      }
                    });
                }
              } else {
                console.log(err);
              }
            });
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "addSelfAndFriends"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "addSelfAndFriends"
              });
            }
          }
        });
    } else { // attempt to sign in, join game, and possibly add friends
      var password = template.find("input.password").value;
      if (! Alerts.test(alertables.signIn(email, password),
                        {type: "danger", where: "addSelfAndFriends"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (!err) {
          Meteor.call(
            "dev.addSelfAndFriends", friends, game._id,
            function (error, result) {
              if (! error) {
                Session.set("joined-game", game._id);
                Session.set("unauth-join", null); // logged in now
                Alerts.throw({
                    message: "You've joined this game -- be sure to invite your friends!",
                    type: "success", where: game._id,
                    autoremove: 5000
                  });
                var path = Router.current().path;
                var inviteeId = path.split('?')[1];
                var email = Meteor.user().emails[0].address;
                var fullName = Meteor.user.profile.name;

                if (inviteeId) {
                  Meteor.call(
                    "dev.notifyInviter", game._id, email, fullName, inviteeId,
                    function (error, result) {
                      if (error) {
                        console.log(error);
                      }
                    });
                }
                if (! _.isEmpty(friends)) {
                  Alerts.throw({
                    message: "Thanks, " + Meteor.user().profile.name +
                      ". Your friends have been invited. We'll let you know when they join!",
                    type: "success", where: game._id,
                    autoremove: 5000
                  });
                }
              } else {
                console.log(error);
                Alerts.throw({
                  message: "Hmm, something went wrong. Try again?",
                  type: "danger", where: game._id
                });
              }
            });
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason, type: "danger", where: "addSelfAndFriends"
          });
        }
      });
    }
  },
  "click .add-self-and-friends .close": function () {
    Session.set("unauth-join", null);
  }
});

Template.addSelfAndFriends.destroyed = function () {
  Alerts.collection.remove({where: "addSelfAndFriends"});
};