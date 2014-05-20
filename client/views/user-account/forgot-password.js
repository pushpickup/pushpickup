Template.devForgotPassword.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    Accounts.forgotPassword(
      {email: templ.find("input[type=email]").value},
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Check for an email from " +
              "support@pushpickup.com to set your " +
              " password",
            type: "success", where: "settings"
          });
          Session.set("settings-forgot-password", false);
        } else {
          console.log(err);
          // e.g. "User not found"
          Alerts.throw({
            message: err.reason,
            type: "danger", where: "forgotPassword"
          });
        }
      });
  }
});