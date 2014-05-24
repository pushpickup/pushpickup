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
  },
  locationUnknown: function() {
    return !Session.get("get-user-location");
  },
  showSetLocation : function () {
    if(!AmplifiedSession.get("user-location-set") || Session.equals("get-user-location", "success"))
    {
      return true;
    } else {
      return false;
    }
  }
});

Template.locationFailedTemplate.rendered = function () {
  var input = this.find('.select-location input');
  // console.log(autocomplete);
  var autocomplete = new google.maps.places.Autocomplete(
      input,
      {types: ['(cities)']});
  
  google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();

      var placeName = place.formatted_address.split(", ");

      var location = {
        "geo" : {
          "type": "Point",
          "coordinates": [place.geometry.location.A,
                        place.geometry.location.k]
        },
        "city" : placeName[0],
        "state" : placeName[1]
      };

      console.log(location);
      AmplifiedSession.set("current-location", location);
      AmplifiedSession.set("user-location-set", true);
      Session.set("get-user-location", "success");
  });
};