var types = ["ultimate", "basketball", "soccer"];
var statuses = ["proposed", "on"];
var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

var development = Meteor.settings.DEVELOPMENT; // Toggles bootstrapping

Accounts.emailTemplates.from = "Push Pickup <support@pushpickup.com>";
Accounts.emailTemplates.enrollAccount.text = function(user, url) {
  var greeting = (user.profile && user.profile.name) ?
        ("Hello " + user.profile.name + ",") : "Hello,";
  return greeting + "\n"
    + "\n"
    + "To start using Push Pickup, simply click the link below.\n"
    + "\n"
    + url + "\n"
    + "\n"
    + "Thanks.\n";
};

Meteor.startup(function () {
  if (GameOptions.find().count() === 0) {
    _.forEach(types, function (type) {
      GameOptions.insert({option: "type", value: type});
    });
    _.forEach(statuses, function (status) {
      GameOptions.insert({option: "status", value: status});
    });
    _.forEach(days, function (day, i) {
      // value used for sorting and used by moment()
      GameOptions.insert({option: "day", value: i, name: day});
    });
  }

  if (development && (Games.find().count() === 0)
      && (Meteor.users.find().count() === 0)) {
    bootstrap(); // Populate Users, and Games from Assets
  }

  // start observers
  observers.gameOnObserver();
  observers.gameAddedNotifier();
});
