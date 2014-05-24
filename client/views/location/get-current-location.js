Template.getCurrentLocation.events({
  "click .get-current-location.btn": function (evt, templ) {
    getUserLocation(function (point) {
      Session.set("selectedLocationPoint", point);
      Session.set("selectedLocationName", "Current Location");
    });
  }
});