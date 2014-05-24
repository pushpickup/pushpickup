Template.listedGameSummary.helpers({
  placeName: function () {
    var game = this;
    // return everything before first comma (if no comma, return everything)
    return game.location.name.replace(/,.*/,'');
  },
  // diagnostic -- not intended for production use
  placeDistance: function () {
    return (0.00062137119 * GeoJSON.pointDistance(
      this.location.geoJSON,
      AmplifiedSession.get("current-location").geo
    )).toFixed(1) + " mi"; // conversion from meters to miles
  }
});