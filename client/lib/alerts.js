Alerts = {
  // Local (client-only) collection
  collection: new Meteor.Collection(null),

  throw: function(obj) {
    check(obj, {
      message: String,
      type: String,
      where: String,
      autoremove: Match.Optional(Number)
    });
    return Alerts.collection.insert({
      message: obj.message, type: obj.type,
      where: obj.where, seen: false,
      autoremove: obj.autoremove
    });
  },
  clearSeen: function(options) {
    check(options, Match.Optional({where: String}));
    Alerts.collection.remove(_.extend({seen: true}, options || {}));
  },

  // Match.test each value against its pattern.
  // Return a list of applicable Alerts,
  // using optionally provided default values for Alert properties.
  gather: function(alertables, options) {
    check(alertables, [{value: Match.Any, pattern: Match.Any, alert: Object}]);
    check(options, Match.Optional({
      type: Match.Optional(String),
      where: Match.Optional(String)
    }));
    return _.compact(_.map(alertables, function (alertable) {
      if (Match.test(alertable.value, alertable.pattern)) {
        return null; // no Alert needed
      } else {
        return _.extend(_.clone(options) || {}, alertable.alert);
      }
    }));
  },
  // Gather alerts and throw them. Return true if no alerts were gathered,
  // false otherwise.
  test: function(alertables, options) {
    var alerts = Alerts.gather(alertables, options);
    _.forEach(alerts, function (alert) { Alerts.throw(alert); });
    return alerts.length === 0;
  }
};
