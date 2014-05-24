Template.devSetPassword.events({
  "submit form": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var password = templ.find("input[type=password]").value;
    try {
      check(password, ValidPassword);
    } catch (e) {
      console.log(e);
      Alerts.throw({
        // expecting "Match error: Password must be at least 6 characters."
        message: e.message.slice(13),
        type: "danger", where: "setPassword"
      });
      return;
    }
    try {
      Accounts.resetPassword(
        Session.get("set-password-token"),
        password,
        function (err) {
          if (!err) {
            Alerts.throw({
              message: "Your password is set",
              type: "success", where: "top",
              autoremove: 3000
            });
            Session.set("set-password-token", null);
            Session.set("viewing-settings", false);
          } else {
            console.log(err);
            if (err.reason === "Token expired") {
              Alerts.throw({
                message: "The token to set your password has expired. " +
                  "How about we send a fresh link?",
                type: "danger", where: "forgotPassword"
              });
              Session.set("set-password-token", null);
              Session.set("settings-forgot-password", true);
            } else {
              Alerts.throw({
                message: err.reason,
                type: "danger", where: "setPassword"
              });
            }
          }
        });
    } catch (err) {
      console.log(err);
      Alerts.throw({
        message: "A token to set your password was "+
          "not found (or has expired). How about we send a fresh link?",
        type: "danger", where: "forgotPassword"
      });
      Session.set("set-password-token", null);
      Session.set("settings-forgot-password", true);
    }
  }
});