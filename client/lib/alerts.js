Alerts = (function() {
  var alertsModule = {};

  alertsModule.throw = function(obj) {
    check(obj, {
      message: String,
      type: String,
      where: String,
      autoremove: Match.Optional(Number)
    });

    return Notifications.insert({
      message: obj.message, type: obj.type,
      where: obj.where, seen: false,
      autoremove: obj.autoremove
    });
  };

  alertsModule.clearSeen = function(options) {
    check(options, Match.Optional({where: String}));
    Notifications.remove(_.extend({seen: true}, options || {}));
  };

  // Match.test each value against its pattern.
  // Return a list of applicable Alerts,
  // using optionally provided default values for Alert properties.
  alertsModule.gather = function(alertables, options) {
    check(Alertables, [{value: Match.Any, pattern: Match.Any, alert: Object}]);
    check(options, Match.Optional({
      type: Match.Optional(String),
      where: Match.Optional(String)
    }));

    return _.compact(_.map(Alertables, function (alertable) {
      if (Match.test(alertable.value, alertable.pattern)) {
        return null; // no Alert needed
      } else {
        return _.extend(_.clone(options) || {}, alertable.alert);
      }
    }));
  };

  // Gather alerts and throw them. Return true if no alerts were gathered,
  // false otherwise.
  alertsModule.test = function(alertables, options) {
    var alerts = Alerts.gather(Alertables, options);
    _.forEach(alerts, function (alert) { Alerts.throw(alert); });
    return alerts.length === 0;
  };

  return alertsModule;
})();