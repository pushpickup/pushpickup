Friends = (function() {
  var friendsModule = {};

  // Return friends as [{name: XXX, email: XXX}, {name: YYY}, ...]
  // `email` is optional
  // Ignore inputs where both `name` and `email` are empty
  friendsModule.makeFriends = function(nameInputs, emailInputs) {
    var friends = {};

    _.forEach(nameInputs, function (input) {
      friends[input.id] = {};
      friends[input.id].name = input.value;
    });

    _.forEach(emailInputs, function (input) {
      if (!_.isEmpty(input.value)) {
        friends[input.id].email = input.value;
      }
    });

    return _.reject(_.values(friends), function (friend) {
      return _.isEmpty(friend.name) && _.isEmpty(friend.email);
    });
  };

  friendsModule.inviteFriends = function(gameId, inviteList ) {

    var filteredInviteList = _.map(inviteList, function(friend) {
      return _.pick(friend, 'name', 'email');
    });

    Meteor.call(
      "dev.inviteFriends", gameId, filteredInviteList, function (error, result) {
        if (!error) {
          Alerts.throw({
            message: "Your friend(s) has been sent an invitation :)",
            type: "success", where: gameId
          });
        } else {
          // typical error: email in use
          // BUT we're currently allowing users to add friends
          // that are existing users...
          console.log(error);
          if (error instanceof Meteor.Error) {
            Alerts.throw({
              message: error.reason,
              type: "danger", where: "inviteFriends"
            });
          } else {
            Alerts.throw({
              message: "Hmm, something went wrong. Try again?",
              type: "danger", where: "inviteFriends"
            });
          }
        }
      });

  }

  return friendsModule;
})();