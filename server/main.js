var development = Meteor.settings.DEVELOPMENT; // Toggles bootstrapping


// establish donny and stewart, admins who can edit any game
// and delete any game comments.
var ensureAdmins = function () {
  var admins = [{name: "Donny Winston", email: "donny@pushpickup.com"},
                {name: "Stewart McCoy", email: "mccoy.stewart@gmail.com"}];

  _.forEach(admins, function (admin) {
    var user = Meteor.users.findOne({'emails.address': admin.email});
    if (! user) {
      admin._id = Accounts.createUser({
        email: admin.email,
        // set password via `Accounts.sendResetPasswordEmail` or similar
        profile: {name: admin.name}
      });
    }
    Meteor.users.update(admin._id || user._id, {$set: {
      'emails.0.verified': true,
      admin: true
    }});
  });
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

  ensureAdmins();

  ////
  // start observers
  ////

  observers.gameOnObserver();
  // TODO: initialize process to send daily digest of upcoming games of
  // interest to user, based on UserSubs.
  //observers.gameAddedNotifier();
});
