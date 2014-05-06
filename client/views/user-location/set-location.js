Template.setLocation.events({
  "click .location-link": function(e) {
    e.preventDefault();

    Session.set('get-user-location', 'get');
  }
});

Template.setLocation.helpers({
  locationFailed: function() {
    return Session.equals("get-user-location", "failure");
  },
  locationObtained: function() {
    return Session.equals("get-user-location", "success");
  },
  locationPending: function() {
    return Session.equals("get-user-location", "pending");
  }
})