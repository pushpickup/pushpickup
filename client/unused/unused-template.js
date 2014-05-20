Template.unauthInviteFriendsLink.events({
  "click .unauth-invite-friends-link": function () {
    Session.set("unauth-invite-friends", this._id);
  }
});

Template.joinGameLink.events({
  "click .join-game-link a": function () {
    if (Meteor.userId()) {
      addSelfToGame(this._id);
    } else {
      Session.set("unauth-join", this._id);
    }
  }
});