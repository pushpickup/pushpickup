Template.whoIsPlaying.helpers({
  organizing: function () {
    return this.creator.userId == Meteor.userId();
  },
  playing: function () {
    return _.contains(_.pluck(this.players, 'userId'), Meteor.userId());
  },
  numNeeded: function () {
    var numNeeded = this.requested.players - this.players.length;
    return (numNeeded > 0) ? numNeeded : 0;
  },
  numOthers: function () {
    // not just (this.players.length - 1) because organizer may not have played
    var self = this;
    return _.reject(self.players, function (player) {
      return player.userId === Meteor.userId();
    }).length;
  }
});