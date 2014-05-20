Template.settings.events({
  // signed in
  "click .sign-out.trigger": function () {
    Meteor.logout();
    Router.go('home');
  },
  "click .send-verification-email": function () {
    Meteor.call("sendVerificationEmail");
    Alerts.throw({
      message: "Thanks. Look out for an email from support@pushpickup.com" +
        " to verify your email address.",
      type: "info", where: "settings", autoremove: 3000
    });
  }
});