Alertables = (function() {
  var alertablesModule = {};

  alertablesModule.signUp = function (email, fullName, password) {
    var them = [{
      value: email, pattern: ValidEmail,
      alert: {message: "Your email doesn't look right"}
    },{
      value: fullName, pattern: NonEmptyString,
      alert: {message: "Please put in your name"}
    }];

    if (password !== undefined) {
      them.push({
        value: password, pattern: ValidPassword,
        alert: {message: "Password must be at least 6 characters"}
      });
    }
    return them;
  };

  alertablesModule.signIn = function (email, password) {
    return [{
      value: email, pattern: ValidEmail,
      alert: {message: "Your email doesn't look right"}
    },{
      value: password, pattern: NonEmptyString,
      alert: {message: "Enter your password to sign in"}
    }];
  };

  alertablesModule.inviteFriends = function (friends) {
    return [{
      value: friends, pattern: [{name: NonEmptyString,
                                 email: ValidEmail}],
      alert: {message: "A friend's email either doesn't look right "
              + "or needs a name to go with it"}
    }];
  };

  alertablesModule.comment = function (comment) {
    return [{value: comment, pattern: NonEmptyString,
             alert: {message: "Your comment must have value"}}];
  };

  return alertablesModule;
})();