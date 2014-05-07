Meteor.methods({
  saveUserLocation: function (location) {
    Meteor.users.upsert(Meteor.userId(), {$set: {"profile.location": location}});
  },
  "nearest-past-games": function (location) {
    this.unblock();
    check(location, GeoJSONPoint);
    return Games.find({
      'startsAt': {$lt: new Date()},
      'location.geoJSON': {
        $near: {$geometry: location},
        $maxDistance: 100000 // 100,000 m => 62 miles
      }}, {limit: 15}).fetch();
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
  "notifyInvitedFriend": function (options) {
    this.unblock();
    check(options, {
      added: {name: String, email: ValidEmail},
      adderId: String,
      gameId: String
    });
    var added = options.added;
    var addedEmail = added.email;
    var addedName = added.name;
    console.log('added email', addedEmail)
    console.log('added name', addedName)
    var adder = Meteor.users.findOne(options.adderId);
    var game = Games.findOne(options.gameId);
    if (!added || !adder || !game)
      throw new Meteor.Error(404, "One of adder, added or game not found.");

    var correctMoment = utils.startsAtMomentWithOffset(game);
    var dayLong = correctMoment.format('dddd');
    var day = correctMoment.format('ddd');
    var time = correctMoment.format('h:mma');

    var inviteeId = Invitees.insert({inviterEmail: adder.emails[0].address, 
      inviterName: adder.profile.name});
    
    sendInvitationEmail({
      from: emailTemplates.from,
      to: addedEmail,
      subject: "You're invited: " + _.string.capitalize(game.type) + " "
        + day + ". " + time + " at "
        + game.location.name.replace(/,.*/,''),
      text: "Hi "+addedName+", \n"
        + "\n"
        + "You've been invited by "+adder.profile.name
        + " ("+adder.emails[0].address+")"
        + " to play pickup "+game.type+":\n"
        + "\n"
        + "* "+game.location.name+"\n"
        + "* "+day+". "+time+" with "+game.requested.players+" others\n"
        + "\n"
        + "[Join the game](" + Meteor.absoluteUrl('g/'+game._id) + ")"
        + " with "+adder.profile.name + " on PushPickup.\n"
        + "\n"
        + "Is this your first time hearing of PushPickup? "
        + "Well, simply put, it's the best way to organize pickup basketball, "
        + "soccer, and ultimate frisbee. Please let us know what you think -- "
        + "you can just reply to this email.\n"
        + "\n"
        + "Sincerely,\n"
        + "Donny Winston & Stewart McCoy"
    });
  },
  "notifyInviter": function (options) {
    this.unblock();
    
    var inviterInfo = Invitees.findOne(options.inviteeId)

    // if they try to sign up from the same link twice, let's not notify
    // the user over and over again...

    if (inviterInfo){
      var addedEmail = options.addedEmail;
      var addedName = options.addedName;
      

      var inviterEmail = inviterInfo.inviterEmail;
      var inviterName = inviterInfo.inviterName;

      var game = Games.findOne(options.gameId);
      
      var correctMoment = utils.startsAtMomentWithOffset(game);
      var dayLong = correctMoment.format('dddd');
      var day = correctMoment.format('ddd');
      var time = correctMoment.format('h:mma');
      
      sendInviterNotifyEmail({
        from: emailTemplates.from,
        to: inviterEmail,
        subject: addedName + " joined " + game.type+" on "+day+" at "+time+" at"+game.location.name,
        text: "Hi "+inviterName+", \n"
          + addedName + " ("+addedEmail+") "
          + "just joined the pickup "+game.type+" game "
          + "you're playing in:\n"
          + "* "+game.location.name+"\n"
          + "* "+day+". "+time+" with "+game.requested.players+" others\n"
          + "\n"
          + "Inviting friends always makes for a better game!\n"
      });

      Invitees.remove(options.inviteeId);
    }
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
    var day_long_inline = utils.isToday(game) ?
          "Today" : "this coming "+startsAtM.format('dddd');
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
        + "Join me for pickup " + game.type + " " + day_long_inline + "." 
        + " Check out the [game details on PushPickup]("+gameURL+") and join the game." 
        + " Hope to see you there!\n"
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

    if (! tokenRecord.unsubscribeAll)
      return {
        userId: user._id,
        error: new Meteor.Error(
          403, "Token provided in link is not an unsubscribe-all token")
      };

    Meteor.users.update(user._id, {$set: {doNotDisturb: true}});

    return {userId: user._id};
  },
  gameOnViaToken: function (token) {
    var self = this;
    check(token, String);

    var user = Meteor.users.findOne(
      {'services.email.verificationTokens.token': token});
    if (!user)
      throw new Meteor.Error(403, "Game-on trigger expired");

    var tokenRecord = _.find(user.services.email.verificationTokens,
                             function (t) {
                               return t.token == token;
                             });
    if (!tokenRecord)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Game-on trigger expired for user")
      };

    var game = Games.findOne(tokenRecord.gameId);
    if (!game)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Game-on trigger is for unknown game")
      };

    if (game.status === "proposed") {
      // update game to trigger `gameOnObserver`
      Games.update(game._id, {$set: {status: "on"}});
    } else {
      Meteor.isServer && sendGameOnEmails(game);
    }

    return {userId: user._id, gameId: game._id};
  },
  cancelGameViaToken: function (token) {
    var self = this;
    check(token, String);

    var user = Meteor.users.findOne(
      {'services.email.verificationTokens.token': token});
    if (!user)
      throw new Meteor.Error(403, "Cancel-game trigger expired");

    var tokenRecord = _.find(user.services.email.verificationTokens,
                             function (t) {
                               return t.token == token;
                             });
    if (!tokenRecord)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Cancel-game trigger expired for user")
      };

    var game = Games.findOne(tokenRecord.gameId);
    if (!game)
      return {
        userId: user._id,
        error: new Meteor.Error(403, "Cancel-game trigger is for unknown game")
      };

    self.setUserId(user._id);
    Meteor.call("cancelGame", game._id);

    return {userId: user._id, gameId: game._id};
  },
  "allGamesSnapshot": function () {
    var user = this.userId && Meteor.users.findOne(this.userId);
    if (!user || !user.admin)
      throw new Meteor.Error(401, "Admin access only");

    return Games.find({startsAt: {$gte: new Date()}},
               {fields: {type: 1, startsAt: 1, location: 1}}).fetch();
  },
  "allUsersSnapshot": function () {
    var user = this.userId && Meteor.users.findOne(this.userId);
    if (!user || !user.admin)
      throw new Meteor.Error(401, "Admin access only");

    return Meteor.users.find({}, {
      fields: {profile: 1, emails: 1, createdAt: 1}}).map(function (u) {
        return {
          name: u.profile && u.profile.name || "Anonymous",
          email: u.emails && u.emails[0] ||
            {address: "no email", verified: false},
          createdAt: u.createdAt,
          gamesAdded: Games.find({'creator.userId': u._id}).count(),
          gamesJoined: Games.find({'players.userId': u._id}).count()
        };
      });
  }
});
