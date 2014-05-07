Template.devChangeLocation.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Session.set('get-user-location', 'get');
    Session.set("settings-change-location", false);
    Session.set("viewing-settings", false);
  }
});

Template.devChangeLocation.helpers({
  userLocationSet : function () {
    return AmplifiedSession.get("user-location-set");
  },
  location: function () {
    if(AmplifiedSession.get("current-location").city)
      return AmplifiedSession.get("current-location").city + ', ' + AmplifiedSession.get("current-location").state;
    else
      return false;
  },
})