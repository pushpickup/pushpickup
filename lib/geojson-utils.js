gju = {};

// If you need more utils,
// then `meteor add geojson-utils` (meteor core package)

// from https://github.com/maxogden/geojson-js-utils
// in turn from http://www.movable-type.co.uk/scripts/latlong.html
gju.pointDistance = function (pt1, pt2) {
  var lon1 = pt1.coordinates[0],
      lat1 = pt1.coordinates[1],
      lon2 = pt2.coordinates[0],
      lat2 = pt2.coordinates[1],
      dLat = gju.numberToRadius(lat2 - lat1),
      dLon = gju.numberToRadius(lon2 - lon1),
      a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(gju.numberToRadius(lat1))
        * Math.cos(gju.numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (6371 * c) * 1000; // returns meters
};

gju.numberToRadius = function (number) {
    return number * Math.PI / 180;
};
