Template.inviteFriends.events({
  "submit form": function (event, template) {
    var game = this;
    event.preventDefault();
    Alerts.clearSeen({where: "inviteFriends"});
    var friends = Friends.makeFriends(template.findAll("input.friend-name"),
                              template.findAll("input.friend-email"));
    if (_.isEmpty(friends)) {
      Alerts.throw({message: "Even imaginary friends have names",
                    type: "danger", where: "inviteFriends"});
      return;
    }
    if (! Alerts.test(Alertables.inviteFriends(friends),
                      {type: "danger", where: "inviteFriends"})) {
      return;
    }
    Meteor.call(
      "dev.inviteFriends", game._id, friends, function (error, result) {
        if (!error) {
          Alerts.throw({
            message: "Your friend has been sent an invitation :)",
            type: "success", where: game._id
          });
          Session.set("invite-friends", null);
          window.scrollTo(0,0);
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
  },
  "click .add-friends .close": function () {
    Session.set("invite-friends", null);
  }
});

Template.inviteFriends.destroyed = function () {
  Notifications.remove({where: "inviteFriends"});
};

Template.inviteFriends.helpers({
  numFriends: function() {
    return FriendsToAdd.find().count();
  }
});