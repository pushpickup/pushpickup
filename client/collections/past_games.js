PastGames = new Meteor.Collection(null);

setPastGames = function (arr) {
  PastGames.remove({});
  _.forEach(arr, function (doc) { PastGames.insert(doc); });
};
