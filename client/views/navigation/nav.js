Template.devNav.events({
  'click .start-search-init': function () {
    Session.set('searching', 'during');
    Session.set("viewing-settings", false);
  },
  'click .search-input': function () {
    Session.set('searching', 'during');
  },
  'click .exit-search a': function () {
    if (Session.equals('search-results', true)) {
      Session.set('searching', 'after');
    } else {
      Session.set('searching', 'not');
      Session.set('userSelectedLocation', '')
      Session.set('game-types', _.pluck(GameOptions.find({option: "type"}).fetch(), 'value'))
    }
  },
  'click .back a': function () {
    Session.set('searching', 'not');
    Session.set('search-results', false);
    Session.set('userSelectedLocation', '')
    Session.set('game-types', _.pluck(GameOptions.find({option: "type"}).fetch(), 'value'))
  }
});