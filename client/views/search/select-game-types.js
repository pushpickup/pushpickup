Template.selectGameTypes.helpers({
  options: function () {
    // TODO: retrieve :checked via Session
    return GameOptions.find({option: "type"},{sort: {value: 1}});
  },
  shouldBeChecked: function(value) {
    var games = Session.get('game-types');

    if (games.indexOf(value) > -1){
      return 'true'
    }
    return ''
  },
  deselectBoxes: function() {

  }
});