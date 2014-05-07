Template.listHeader.helpers({
  currentCity: function() {
    return AmplifiedSession.get("current-location").city + ', ' + AmplifiedSession.get("current-location").state;
  },
  userLocationSet : function () {
    return AmplifiedSession.get("user-location-set");
  },
});