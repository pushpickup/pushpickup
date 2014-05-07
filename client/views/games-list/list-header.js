Template.listHeader.helpers({
  currentCity: function() {
    if(AmplifiedSession.get("current-location").city)
      return AmplifiedSession.get("current-location").city + ', ' + AmplifiedSession.get("current-location").state;
    else
      return "your location";
  },
  userLocationSet : function () {
    return AmplifiedSession.get("user-location-set");
  },
});