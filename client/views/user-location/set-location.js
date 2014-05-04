Template.setLocation.events({
  "click .location-link": function(e) {
    e.preventDefault();

    Session.set('get-user-location', 'get');
  }
});