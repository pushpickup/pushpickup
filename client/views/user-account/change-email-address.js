Template.devChangeEmailAddress.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    var newEmail = templ.find("input[type=email]").value;
    var pass = templ.find("input[type=password]").value;
    var user = Meteor.user();
    var oldEmail = user && user.emails[0].address;
    if (! Match.test(newEmail, ValidEmail)) {
      Alerts.throw({
        message: "That email address doesn't look valid.",
        type: "danger", where: "changeEmailAddress"
      });
      return;
    }
    Meteor.loginWithPassword(oldEmail, pass, function (err) {
      if (err) {
        Alerts.throw({
          message: "We could not sign you in again using that password. " +
            "Please try again.",
          type: "danger", where: "changeEmailAddress"
        });
      } else {
        Meteor.call("changeEmailAddress", newEmail, function (err, res) {
          console.log(err);
          if (err) {
            Alerts.throw({
              message: err.reason, type: "danger", where: "changeEmailAddress"
            });
          } else {
            Alerts.throw({
              message: "Thanks! Remember to verify your address.",
              type: "info", where: "settings"
            });
            Session.set("settings-change-email-address", null);
          }
        });
      }
    });
  }
});