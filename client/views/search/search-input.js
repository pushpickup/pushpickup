Template.searchInput.helpers({
  selected_city: function() {
    return Session.get('userSelectedLocation')
  }
});




Template.searchInput.rendered = function () {
  var template = this;
  if (Session.equals("searching", "during")) {
    var autocomplete = null;
    autocomplete && google.maps.event.clearListeners(autocomplete);
    autocomplete = new google.maps.places.Autocomplete(
      template.find('.search-input'),
      {types: ['(cities)']});
    google.maps.event.addListener(
      autocomplete, 'place_changed', function () {
        Location.onPlaceChanged(autocomplete);
      }
    );
  }
};