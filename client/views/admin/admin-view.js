////
// Admin view and helpers
////

Template.adminView.created = function () {
  Session.set("waiting-on", "all-games-snapshot");
  Meteor.call("allGamesSnapshot", function (err, res) {
    if (!err) {
      Session.set("all-games-snapshot", res);
    } else {
      alert("Error: " + err.message);
    }
    Session.set("waiting-on", "all-users-snapshot");
    Meteor.call("allUsersSnapshot", function (err, res) {
      if (!err) {
        Session.set("all-users-snapshot", res);
      } else {
        alert("Error: " + err.message);
      }
      Session.set("waiting-on", null);
    });
  });
};

Template.adminView.helpers({
  upcomingGames: function () {
    // an array snapshot of minimal info on all upcoming games in the system
    return _.sortBy(Session.get("all-games-snapshot"), "startsAt");
  },
  fromNow: function () {
    return moment(this.startsAt).fromNow();
  },
  allUsers: function () {
    // an array snapshot of minimal info on all users in the system
    //
    // `_.sortBy` sorts in ascending order, so `-u.gamesJoined` puts
    // active players up top.
    return _.sortBy(Session.get("all-users-snapshot"), function (u) {
      return -u.gamesJoined;
    });
  },
  whenRegistered: function () {
    return moment(this.createdAt).fromNow();
  }
});

Template.adminView.destroyed = function () {
  Session.set("all-games-snapshot", null);
};