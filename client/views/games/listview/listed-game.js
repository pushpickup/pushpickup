Template.listedGame.helpers({
  organizingOrPlaying: function () {
    var game = this;
    var isPlaying = Games.findOne({_id: game._id, 'players.userId': Meteor.userId()})
    var isOrganizing = this.creator.userId == Meteor.userId();
    if (isPlaying || isOrganizing)
      return true
    return false
  }
});