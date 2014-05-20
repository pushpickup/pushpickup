Template.addFriendsLink.events({
  "click .add-friends-link a": function () {
    Session.set("invite-friends", this._id);
  }
});