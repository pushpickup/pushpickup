Handlebars.registerHelper("Session", function (key) {
  return Session.get(key);
});

Handlebars.registerHelper("userInGame", function () {
  var game = this;
  return _.contains(_.pluck(game.players, 'userId'), Meteor.userId());
});

Template.devMain.helpers({
  searching: function () { return Session.equals("searching", true); }
});

Template.devMain.events({
  'click .search': function () { Session.set("searching", true); },
  'click .exit-search': function () { Session.set("searching", false); }
});

Template.listOfGames.helpers({
  games: function () { return Games.find({}, {sort: {startsAt: 1}}); }
});

Template.gameSummary.helpers({
  type: function () {
    var game = this;
    return _.string.capitalize(game.type);
  },
  day: function () {
    var game = this;
    return moment(game.startsAt).format('dddd');
  },
  time: function () {
    var game = this;
    return moment(game.startsAt).format('h:mma');
  },
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  placeLocation: function () {
    var game = this;
    var comma_separated = game.location.name.match(/.*?, (.*)/);
    if (! comma_separated) {
      return "";
    } else {
      var rest_with_state_abbr = comma_separated[1].match(/.*[A-Z]{2}/);
      if (! rest_with_state_abbr) {
        return comma_separated[1];
      } else {
        return rest_with_state_abbr[0];
      }
    }
  }
});

Template.selectGameTypes.helpers({
  options: function () {
    return GameOptions.find({option: "type"},{sort: {value: 1}});
  }
});

var onPlaceChanged = function () {
  var place = autocomplete.getPlace();
  if (place.geometry) {
    var latLng = place.geometry.location;
    Session.set("selectedLocationPoint", geoUtils.toGeoJSONPoint(latLng));
    Session.set("selectedLocationName",place.formatted_address);
    //map.panTo(latLng);
    //map.setZoom(12);
  } else {
    $('.active-search input').get(0).placeholder = 'Enter Location';
  }
};

var autocomplete = null;
Template.activeSearch.rendered = function () {
  var template = this;
  autocomplete && google.maps.event.clearListeners(autocomplete);
  autocomplete = new google.maps.places.Autocomplete(
    template.find('.active-search input'),
    {types: ['(cities)']});
  google.maps.event.addListener(
    autocomplete, 'place_changed', onPlaceChanged); // call Meteor.method
};
