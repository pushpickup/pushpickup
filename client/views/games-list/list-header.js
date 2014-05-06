Template.listHeader.helpers({
  currentCity: function() {
    return Session.get("current-location").city + ', ' + Session.get("current-location").state;
  },
  userLocationSet : function () {
    return Session.get("user-location-set");
  },
});