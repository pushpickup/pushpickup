  Template.devDetailBody.events({
    "click .leave-game": function () {
      Meteor.call("leaveGame", this._id);
    }
  });