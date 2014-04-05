Meteor.methods({
  "nearest-past-games": function (location) {
    this.unblock();
    check(location, GeoJSONPoint);
    return Games.find({
      'startsAt': {$lt: new Date()},
      'location.geoJSON': {$near: {$geometry: location}}
    }, {limit: 15}).fetch();
  },
  "notifyPlayers": function (gameId) {
    this.unblock();
    check(gameId, String);
    var game = Games.findOne(gameId);
    if (!game)
      return;
    var players = _.compact(_.map(game.players, function (player) {
      var user = player.userId &&
            player.userId !== game.creator.userId &&
            Meteor.users.findOne(player.userId);
      if (user && user.emails && user.emails[0].verified) {
        return {
          name: user.profile && user.profile.name || "Push Pickup User",
          address: user.emails[0].address
        };
      } else {
        return null;
      }
    }));
    _.each(players, function (player) {
      sendEmail({
        from: emailTemplates.from,
        to: player.address,
        subject: " Game *updated*: "+game.type+" at "
          + utils.displayTime(game),
        text: "Details for a game you're playing in have changed. [Here]("
          + Meteor.absoluteUrl('g/'+gameId) + ") is a link to the game.\n"
          +"\n"
          + "Thanks for helping to push pickup."
      });
    });
  },
  "sendVerificationEmail": function () {
    this.unblock();
    this.userId && sendVerificationEmail(this.userId);
  },
  "changeEmailAddress": function (newEmail) {
    this.unblock();
    check(newEmail, ValidEmail);
    if (! this.userId) {
      throw new Meteor.Error(
        401, "You must be signed in to change your email address.");
    }
    var available = Meteor.call("isEmailAvailable", newEmail);
    console.log("got here");
    if (! available) {
      throw new Meteor.Error(
        403, "Someone has already added and verified that email address");
    }
    var user = Meteor.users.findOne(this.userId);
    var oldEmail = user.emails[0].address;
    Meteor.users.update(this.userId, {
      $push: {emails: {address: newEmail, verified: false}}
    });
    Meteor.users.update(this.userId, {
      $pull: {emails: {address: oldEmail}}
    });
    sendVerificationEmail(this.userId, newEmail);
    return true;
  },
  "makeAdmin": function (userId) {
    var self = this;
    check(userId, String);
    var requester = Meteor.users.findOne(self.userId);
    if (requester && requester.admin) {
      Meteor.users.update(userId, {$set: {admin: true}});
      return true;
    } else {
      return false;
    }
  },
  "notifyAddedFriend": function (options) {
    this.unblock();
    check(options, {
      addedId: String,
      adderId: String,
      gameId: String
    });
    var added = Meteor.users.findOne(options.addedId);
    var adder = Meteor.users.findOne(options.adderId);
    var game = Games.findOne(options.gameId);
    if (!added || !adder || !game)
      throw new Meteor.Error(404, "One of adder, added or game not found.");

    var correctMoment = utils.startsAtMomentWithOffset(game);
    var dayLong = correctMoment.format('dddd');
    var day = correctMoment.format('ddd');
    var time = correctMoment.format('h:mma');

    var ifUnverified = (added.emails[0].verified) ? "" :
          "Please [verify](" + verifyEmailUrl(added._id)
          + ") your account so you can receive updates made to the game.\n\n";
    sendEmail({
      from: emailTemplates.from,
      to: added.emails[0].address,
      subject: " You're in: "+game.type+" on "+dayLong+" at "+time,
      text: "- "+game.location.name+"\n"
        + "- "+day+". "+time+" w/ "+game.requested.players+" others\n"
        + "- [View details](" + Meteor.absoluteUrl('g/'+game._id) + ")\n"
        + "\n"
        + "You were added to this game by "+adder.profile.name
        + " ("+adder.emails[0].address+").\n"
        + "\n"
        + ifUnverified
        + "If you can't make it, please [leave the game]("
        + leaveGameUrl(added._id, game._id) + ") "
        +"so others will know.\n"
        + "\n"
        + "Thanks for helping to push pickup."
    });
  },
  // Send email that game organizer can forward to friends so that they
  // can easily join the game.
  "sendForwardableInvite": function (gameId) {
    this.unblock();
    check(gameId, String);
    var game = Games.findOne(gameId);
    if (!game)
      throw new Meteor.Error(404, "Game not found.");
    var creator = Meteor.users.findOne(game.creator.userId);
    var startsAtM = utils.startsAtMomentWithOffset(game);
    var day = utils.isToday(game) ? "Today" : startsAtM.format('ddd') + ".";
    var day_long = utils.isToday(game) ?
          "Today" : "This coming "+startsAtM.format('dddd');
    var time = startsAtM.format('h:mma');
    var gameNote = (_.isEmpty(game.note)) ? "" : "* " + game.note + "\n";
    var gameURL = Meteor.absoluteUrl('g/'+gameId);
    var email = {
      from: emailTemplates.from,
      to: creator.emails[0].address,
      // e.g. "Soccer Thu. 8:00pm at Franklin Square Park"
      subject: _.string.capitalize(game.type) + " "
        + day + " " + time + " at "
        + game.location.name.replace(/,.*/,''),
      text: "Hi " + creator.profile.name + ",\n"
        + "\n"
        + "Be sure to forward this invite to your friends:\n"
        + "\n"
        + "----\n"
        + "\n"
        + "Join me for pickup " + game.type + ":\n"
        + "\n"
        + "* " + day_long + " at " + time + "\n"
        + "* " + game.requested.players + " players needed.\n"
        + "* " + game.location.name + "\n"
        + gameNote + "\n"
        + "[Join the game]("+gameURL+") and I'll see you there!\n"
    };
    sendEmail(email, {withTotalUnsubscribe: false});
    return email;
  },
  leaveGameViaToken: function (token) {
    var self = this;
    check(token, String);

    var user = Meteor.users.findOne(
      {'services.email.verificationTokens.token': token});
    if (!user)
      throw new Meteor.Error(403, "Leave-game link expired");

    var tokenRecord = _.find(user.services.email.verificationTokens,
                             function (t) {
                               return t.token == token;
                             });
    if (!tokenRecord)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Leave-game link expired for user")
      };

    var game = Games.findOne(tokenRecord.gameId);
    if (!game)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Leave-game link is for unknown game")
      };

    Games.update(
      game._id,
      {$pull: {'players': {userId: user._id}}});

    return {userId: user._id, gameId: game._id};
  },
  unsubscribeAllViaToken: function (token) {
    var self = this;
    check(token, String);

    var user = Meteor.users.findOne(
      {'services.email.verificationTokens.token': token});
    if (!user)
      throw new Meteor.Error(403, "Unsubscribe-all link expired");

    var tokenRecord = _.find(user.services.email.verificationTokens,
                             function (t) {
                               return t.token == token;
                             });
    if (!tokenRecord)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Unsubscribe-all link expired for user")
      };

    var game = Games.findOne(tokenRecord.gameId);
    if (! tokenRecord.unsubscribeAll)
      return {
        userId: user._id,
        error: new Meteor.Error(
          403, "Token provided in link is not an unsubscribe-all token")
      };

    Meteor.users.update(user._id, {$set: {doNotDisturb: true}});

    return {userId: user._id};
  }
});
