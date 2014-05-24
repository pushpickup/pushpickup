Template.devChangePassword.events({
  "submit form": function (evt, templ) {
    evt.preventDefault();
    var oldPass = templ.find("input.old-password").value;
    var newPass = templ.find("input.new-password").value;
    // `oldPass` may not test as `ValidPassword` if requirements change.
    if (! Match.test(oldPass, NonEmptyString)) {
      Alerts.throw({
        message: "Please enter your current password.",
        type: "danger", where: "changePassword"
      });
      return;
    }
    if (! Match.test(newPass, ValidPassword)) {
      Alerts.throw({
        message: "New password must be at least 6 characters.",
        type: "danger", where: "changePassword"
      });
      return;
    }
    Accounts.changePassword(
      templ.find("input.old-password").value,
      templ.find("input.new-password").value,
      function (err) {
        if (!err) {
          Alerts.throw({
            message: "Password changed", type: "success", where: "settings",
            autoremove: 3000
          });
          Session.set("settings-change-password", false);
        } else {
          Alerts.throw({
            message: err.reason, type: "danger", where: "changePassword"
          });
        }
      });
  }
});