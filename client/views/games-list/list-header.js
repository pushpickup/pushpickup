Template.listHeader.helpers({
  currentCity: function() {
    return Session.get("current-location").cityName;
  }
});