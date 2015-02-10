Template.soloGameSummary.helpers({
  type: function () {
    var game = this;
    return _.string.capitalize(game.type);
  },
  organizing: function () {
    debugger;
    return this.creator.userId == Meteor.userId();
  },
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  placeLocation: function () {
    var game = this;
    var comma_separated = game.location.name.match(/.*?, (.*)/);
    if (! comma_separated) {
      return "";
    } else {
      return comma_separated[1];
    }
  }
});
