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
  // Undocumented API, but can "assume it will stick around"
  // https://groups.google.com/d/msg/meteor-talk/b_jDgaINAV4/MsyWpmA9IgQJ
  // Nick Martin, Meteor core dev, 2013/02/21
  Games._ensureIndex({'location.geoJSON': "2dsphere"});

  if (development && (Games.find().count() === 0)
      && (Meteor.users.find().count() === 0)) {
    bootstrap(); // Populate Users, and Games from Assets
  }

  // start observers
  observers.gameOnObserver();
  observers.gameAddedNotifier();
});
