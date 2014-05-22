Template.authenticateAndComment.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Alerts.clearSeen({where: "authenticateAndComment"});
    var game = this;
    var comment = template.find("input.comment").value;
    if (! Alerts.test(Alertables.comment(comment),
                      {type: "danger", where: "authenticateAndComment"})) {
      return;
    }
    var email = template.find("input.email").value;
    var fullNameInput = template.find("input.full-name");
    if (fullNameInput) {
      var fullName = fullNameInput.value;
      if (! Alerts.test(Alertables.signUp(email, fullName),
                        {type: "danger", where: "authenticateAndComment"})) {
        return;
      }
      Meteor.call(
        "dev.unauth.addCommenter", game._id, email, fullName, comment,
        function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password);
            Alerts.throw({
              message: "Thanks, " + fullName +
                "! Check for an email from " +
                "support@pushpickup.com to verify your email address",
              type: "success", where: game._id
            });
            Session.set("unauth-comment", null);
            Session.set("strange-passwd", result.password);
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "authenticateAndComment"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "authenticateAndComment"
              });
            }
          }
        });
    } else { // attempt to sign in and add comment
      var password = template.find("input.password").value;
      if (! Alerts.test(Alertables.signIn(email, password),
                        {type: "danger", where: "authenticateAndComment"})) {
        return;
      }
      Meteor.loginWithPassword(email, password, function (err) {
        if (! err) {
          Meteor.call(
            "addComment", comment, game._id,
            function (error) {
              Session.set("unauth-comment", null); // logged in now
              if (error) {
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
            message: err.reason,
            type: "danger", where: "authenticateAndComment"
          });
        }
      });
    }
  },
  "click .authenticate-and-comment .close": function () {
    Session.set("unauth-comment", null);
  }
});