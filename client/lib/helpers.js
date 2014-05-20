var handlebarsHelperMap = {
  SGet: function (key) { return Session.get(key); },
  SEql: function (key, val) { return Session.equals(key, val); },
  gte: function (a, b) { return a && b && a >= b; },
  lt: function (a, b) { return a && b && a < b; },
  userInGame: function () {
    // are global handlebars helpers reactive? Seems so.
    var game = this;
    return !! (Meteor.userId() && Games.findOne({
      _id: game._id, 'players.userId': Meteor.userId()
    }));
  },
  pluralize: function (hasLength, singular, plural) {
    if (hasLength.length === 1 || hasLength === 1) {
      return singular;
    } else {
      return plural;
    }
  },
  baseURL: function () {
    return Meteor.absoluteUrl().slice(0,-1);
  },
  old: function (date) {
    return date < moment().subtract('weeks',1).toDate();
  },
  past: function (date) {
    return date < new Date();
  },
  participle: function(date, options) {
    check(options.hash, {past: String, present: String});
    return (date < new Date()) ? options.hash.past : options.hash.present;
  },
  alerts: function () {
    return Template.meteorAlerts;
  }
};
(function (handlebarsHelperMap) {
  _.forEach(_.keys(handlebarsHelperMap), function (key) {
    Handlebars.registerHelper(key, handlebarsHelperMap[key]);
  });
})(handlebarsHelperMap);