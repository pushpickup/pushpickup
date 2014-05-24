Template.devSignUp.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "devSignUp"});
    var fullName = template.find("input.full-name").value;
    var email = template.find("input.email").value;
    var password = template.find("input.password").value;
    if (! Alerts.test(Alertables.signUp(email, fullName, password),
                      {type: "danger", where: "devSignUp"})) {
      return;
    }
    Meteor.call("dev.signUp", email, fullName, password, function (err) {
      if (err) {
        console.log(err);
        Alerts.throw({
          message: err.reason, type: "danger", where: "devSignUp"
        });
      } else {
        Meteor.loginWithPassword(email, password, function (err) {
          if (err) {
            console.log(err);
            Alerts.throw({
              message: err.reason, type: "danger", where: "devSignUp"
            });
          } else {
            Router.go('home');
          }
        });
      }
    });
  }
});