Template.joinOrLeave.helpers({
  addingPlayers: function () {
    var game = this;
    return Session.equals("unauth-join", game._id) ||
      Session.equals("invite-friends", game._id);
  },
  organizing: function () {
    return this.creator.userId == Meteor.userId();
  }
});

Template.joinOrLeave.events({
  "click .join-game": function () {
    if (Meteor.userId()) {
      Game.addSelfToGame(this._id);
    } else {
      Session.set("unauth-join", this._id);
    }
  },
  "click .invite-friends": function() {
    Session.set("invite-friends", this._id);
  },
  "click .join-game-and-invite": function () {
    if (Meteor.userId()) {
      Game.addSelfToGame(this._id);
    } else {
      Session.set("unauth-join", this._id);
    }
    Session.set("invite-friends", this._id);
  }
});