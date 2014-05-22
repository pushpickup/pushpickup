Template.devSignIn.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "devSignIn"});
    var email = template.find("input.email").value;
    var password = template.find("input.password").value;
    if (! Alerts.test(Alertables.signIn(email, password),
                      {type: "danger", where: "devSignIn"})) {
      return;
    }
    Meteor.loginWithPassword(email, password, function (err) {
      if (err) {
        console.log(err);
        Alerts.throw({
          message: err.reason, type: "danger", where: "devSignIn"
        });
      } else {
        Router.go('home');
      }
    });
  }
});