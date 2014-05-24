Template.devSubscriptions.events({
  "click .unsubscribe-all": function () {
    _.forEach(
      _.pluck(UserSubs.find().fetch(), '_id'),
      function (id) {
        UserSubs.remove(id); });
  }
});

Template.devSubscriptions.helpers({
  loading: function () {
    return ! Session.equals("user_subs_ready", true);
  },
  hasSubs: function () {
    return UserSubs.find().count() > 0;
  },
  subsCount: function () {
    return UserSubs.find().count();
  }
});

Template.subscribe.helpers({
  detail: function () {
    return ppConjunction(Session.get('game-types')) +
      " around " + ppRegion(Session.get('selectedLocationName'));
  },
  subscribed: function () {
    return Session.equals("user-sub-intersects-map", true);
  }
});

Template.subscribe.destroyed = function () {
  Notifications.remove({where: "subscribe"});
};

Template.subscribeAfterJoined.helpers({
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  subscribed: function () {
    return Session.equals("user-sub-intersects-map", true);
  }
});

Template.subscribeAfterJoined.destroyed = function () {
  Notifications.remove({where: "subscribe"});
};

Template.authenticateAndSubscribe.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "authenticateAndSubscribe"});
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) {
      var fullName = fullNameInput.value;
      if (! Alerts.test(Alertables.signUp(email, fullName),
                        {type: "danger", where: "authenticateAndSubscribe"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addUserSub", email, fullName,
        Session.get("gameTypes"), Session.get("gameDays"),
        Session.get("geoWithin"),
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password);
            Alerts.throw({
              message: "Thanks, " + fullName +
                "! Check for an email from " +
                "support@pushpickup.com to verify your email address",
              type: "success", where: "subscribe"
            });
            Session.set("unauth-subscribe", null);
            Session.set("strange-passwd", result.password);
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "authenticateAndSubscribe"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "authenticateAndSubscribe"
              });
            }
          }
        });
    } else { // attempt to sign in and subscribe
      var password = template.find("input.password").value;
      if (! Alerts.test(Alertables.signIn(email, password),
                        {type: "danger", where: "authenticateAndSubscribe"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (! err) {
          Meteor.call(
            "addUserSub", Session.get("gameTypes"),
            Session.get("gameDays"), Session.get("geoWithin"),
            function (error) {
              Session.set("unauth-subscribe", null); // logged in now
              addUserSub.callback(error);
            });
        } else {
          console.log(err);
          // typical err.reason: "User not found" or "Incorrect password"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "authenticateAndSubscribe"
          });
        }
      });
    }
  },
  "click .authenticate-and-subscribe .close": function () {
    Session.set("unauth-subscribe", null);
  }
});

Template.authenticateAndSubscribe.destroyed = function () {
  Session.set("unauth-subscribe", null);
};

var addUserSub = {
  callback: function (error, result) {
    if (!error) {
      Session.set("user-sub-intersects-map", true);
      Alerts.throw({
        type: "success",
        message: "**Subscribed!** We'll let you know " +
          "when there are new games.",
        where: "main"
      });
      if (! _.find(Meteor.user().emails, function (email) {
        return email.verified;
      })) {
        Alerts.throw({
          type: "warning",
          message: "You must have a verified email address to subscribe." +
            "check for an email from support@pushpickup.com to " +
            "verify your email address.",
          where: "main"
        });
      }
    } else {
      console.log(error);
      Alerts.throw({
        type: "danger",
        message: "Hmm, something went wrong. " +
          "Try again?",
        where: "subscribe",
        autoremove: 3000
      });
    }
  }
};

Template.subscribeButton.events({
  'click button': function () {
    if (! Meteor.userId()) {
      Session.set("unauth-subscribe", true);
    } else {
      if (Session.get("soloGame")) {
        var game = Games.findOne(Session.get("soloGame"));
        Meteor.call("addUserSub",
                    [game.type],
                    Session.get("gameDays"),
                    // above can also be e.g. [moment(game.startsAt).day()],
                    Session.get("geoWithin"),
                    addUserSub.callback);
      } else {
        Meteor.call("addUserSub",
                    Session.get("gameTypes"),
                    Session.get("gameDays"),
                    Session.get("geoWithin"),
                    addUserSub.callback);
      }
    }
  }
});