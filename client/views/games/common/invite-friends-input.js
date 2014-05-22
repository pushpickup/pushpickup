// used exclusively by Template.addFriendsInput

Template.inviteFriendsInput.created = function () {
  FriendsToAdd.insert({name: "", email: ""});
};

Template.inviteFriendsInput.destroyed = function () {
  FriendsToAdd.remove({}); // words b/c Meteor.Collection is local
  Session.set("invite-friends", null);
  Session.set("unauth-invite-friends", null);
};

Template.inviteFriendsInput.events({
  "click .add-another-friend": function () {
    FriendsToAdd.insert({name: "", email: ""});
  }
});

Template.inviteFriendsInput.helpers({
  friends: function () {
    return FriendsToAdd.find();
  }
});