// Extend the functionality of `accounts-password` package
// to send custom emails

emailTemplates = {
  from: "Push Pickup <support@pushpickup.com>",
  siteName: Meteor.absoluteUrl()
    .replace(/^https?:\/\//, '').replace(/\/$/, ''),
  enrollAccount: {
    subject: function (user, options) {
      return "Activate your account on " + emailTemplates.siteName;
    },
    text: function (user, url, options) {
      var greeting = (user.profile && user.profile.name) ?
            ("Hello " + user.profile.name + ",") : "Hello,";
      var thankYouFor = options.thankYouFor ?
            "Thank you for " + options.thankYouFor + ".\n\n": "";
      var gameLink = options.gameId ?
            "[Here](" + Meteor.absoluteUrl('g/'+options.gameId) + ") "
            + "is a link to the game.\n\n" : "";
      return greeting + "\n"
        + "\n"
        + thankYouFor
        + "[Click here]("+url+") to verify your email "
        + "(and set your password) to get updates about your games.\n"
        + "\n"
        + gameLink
        + "Thanks for helping to push pickup.\n";
    }
  },
  verifyEmail: {
    subject: function (user) {
      return "Verify your email address on " + emailTemplates.siteName;
    },
    text: function (user, url) {
      var greeting = (user.profile && user.profile.name) ?
            ("Hello " + user.profile.name + ",") : "Hello,";
      return greeting + "\n"
        + "\n"
        + "To verify your account email, simply [click here]("+url+").\n"
        + "\n"
        + "Thanks for helping to push pickup.\n";
    }
  }
};

// After `accounts-base` package has loaded, modify Accounts.urls
Meteor.startup(function () {
  // Overwrite meteor/packages/accounts-base/url_server.js
  // so that accounts routes work with iron-router.
  // Idea from samhatoum (4th comment on
  // https://github.com/EventedMind/iron-router/issues/3).
  (function () {
    "use strict";

    Accounts.urls.resetPassword = function (token) {
      return Meteor.absoluteUrl('reset-password#' + token);
    };

    Accounts.urls.verifyEmail = function (token) {
      return Meteor.absoluteUrl('verify-email#' + token);
    };

    Accounts.urls.enrollAccount = function (token) {
      return Meteor.absoluteUrl('enroll-account#' + token);
    };

  })();
});

Accounts.urls.pushpickup = {
  leaveGame: function (token) {
    return Meteor.absoluteUrl('leave-game#' + token);
  },
  unsubscribeAll: function (token) {
    return Meteor.absoluteUrl('unsubscribe-all#' + token);
  },
  gameOn: function (token) {
    return Meteor.absoluteUrl('game-on#' + token);
  },
  cancelGame: function (token) {
    return Meteor.absoluteUrl('cancel-game#' + token);
  }
};

// To enable idempotent email-address verification in conjuction with other
// actions that send tokens via email. This token record should be acceptable
// to `Accounts.verifyEmail`.
var verifyEmailTokenRecord = function (userId, address) {
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first address if we weren't passed an address.
  // assumes this token is sent to the first address of the user!
  if (!address && user.emails && user.emails[0])
    address = user.emails[0].address;
  // make sure we have a valid address
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))
    throw new Error("No such email address for user.");


  return {
    token: Random.id(),
    address: address,
    when: new Date()};
};

// Should be verbatim from `Accounts.sendVerificationEmail`
// in `accounts-password` package, to ensure compatibility.
verifyEmailUrl = function (userId, address) {
  // Make sure the user exists, and address is one of their addresses.
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first unverified address if we weren't passed an address.
  if (!address) {
    var email = _.find(user.emails || [],
                       function (e) { return !e.verified; });
    address = (email || {}).address;
  }
  // make sure we have a valid address
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))
    throw new Error("No such email address for user.");


  var tokenRecord = {
    token: Random.id(),
    address: address,
    when: new Date()};
  Meteor.users.update(
    {_id: userId},
    {$push: {'services.email.verificationTokens': tokenRecord}});

  return Accounts.urls.verifyEmail(tokenRecord.token);
};


leaveGameUrl = function (userId, gameId) {
  var tokenRecord = verifyEmailTokenRecord(userId);
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  var game = Games.findOne(gameId);
  if (!game)
    throw new Error("Can't find game");
  // make sure the user is a player in the game
  if (!_.contains(_.pluck(game.players, 'userId'), userId))
    throw new Error("User is not a player in game.");


  tokenRecord.gameId = gameId;
  Meteor.users.update(
    {_id: userId},
    {$push: {'services.email.verificationTokens': tokenRecord}});

  return Accounts.urls.pushpickup.leaveGame(tokenRecord.token);
};

unsubscribeAllUrl = function (userId, gameId) {
  var tokenRecord = verifyEmailTokenRecord(userId);
  tokenRecord.unsubscribeAll = true;

  Meteor.users.update(
    {_id: userId},
    {$push: {'services.email.verificationTokens': tokenRecord}});

  return Accounts.urls.pushpickup.unsubscribeAll(tokenRecord.token);
};

// Return a new email with an `html` body that is a
// Markdown conversion of the input email's `text` body.
withHTMLbody = function (email) {
  var html = utils.converter.makeHtml(email.text);
  return _.extend({html: html}, _.omit(email, 'html'));
};

// Returns the email address from an email `To:` field.
// E.g., "Bob Example <bob@example.com>" -> "bob@example.com".
var getEmailAddress = function (toField) {
  // Uses RegExp of http://www.w3.org/TR/html-markup/input.email.html
  var result =  /[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*/.exec(toField);
  if (! result)
    throw new Error("toField contains no email address");
  return result[0];
};

var shouldOnboard = function (emailAddress) {
  var user = Meteor.users.findOne({'emails.address': emailAddress});
  if (!user)
    throw new Error("User not found");
  if (! user.onboarded) {
    Meteor.users.update(user._id, {$set: {onboarded: true}});
    return true;
  } else {
    return false;
  }
};

// Return a new email with an appended section explaining the service to the
// user. Use this for the first email sent to a user.
withOnboarding = function (email) {
  var text = email.text
        + "\n\n----\n\n"
        + "Welcome to Push Pickup. This service should help you make "
        + "your dreams come true, specifically your dreams about playing "
        + "and organizing pickup sports. We want to forget about whether "
        + "we're in the right \"groups\" or on the right email lists, about "
        + "being interrupted with updates for games we're not in, "
        + "and keeping track of head counts to see if a game is really on. "
        + "Let us know what you think (you can just reply to this email).\n"
        + "\n"
        + "Game on,\n"
        + "\n"
        + "Donny and Stewart\n";
  return _.extend({text: text}, _.omit(email, 'text'));
};

// Return a new email with an appended link to no longer receive any emails
// from Push Pickup. This function is meant to be composed with `withHTMLbody`
// as in the expression `withHTMLbody(withTotalUnsubscribe(email))`.
withTotalUnsubscribe = function (email) {
  var address = getEmailAddress(email.to);
  var user = Meteor.users.findOne({ 'emails.address': address });
  if (! user)
    throw new Error("No user with toField email address");
  var url = unsubscribeAllUrl(user._id, address);
  var text = email.text +
        "\n\n----\n\n[Unsubscribe]("+url+") from all emails from Push Pickup.";
  return _.extend({text: text}, _.omit(email, 'text'));
};


// Use instead of `Email.send` to ensure defaults such as a link at bottom
// to unsubscribe from all emails, and an html body derived from the text body.
sendEmail = function (email, options) {
  var address = getEmailAddress(email.to);
  options = _.extend({
    withTotalUnsubscribe: true,
    withOnboarding: shouldOnboard(address),
    withHTMLbody: ! Meteor.settings.DEVELOPMENT
  }, options);
  if (options.withOnboarding) {
    email = withOnboarding(email);
  }
  if (options.withTotalUnsubscribe) {
    email = withTotalUnsubscribe(email);
  }
  if (options.withHTMLbody) {
    email = withHTMLbody(email);
  }
  // Conceptually simplest but not best for performance:
  // Reads from user db for each request to send email, to check
  // for `doNotDisturb` flag. Could refactor this to poll an in-memory
  // object of size O(Meteor.users.count()).
  var user = Meteor.users.findOne({'emails.address': address});
  if (! user)
    throw new Error("Attempt to send email to non-user");

  !user.doNotDisturb && Email.send(email);
};


////
//  Email-sending procedures
////

// Basically identical to `Accounts.sendVerificationEmail`, but dispatches to
// our `sendEmail` function rather than the built-in `Email.send`.
sendVerificationEmail = function (userId, address) {

  // Make sure the user exists, and address is one of their addresses.
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first unverified address if we weren't passed an address.
  if (!address) {
    var email = _.find(user.emails || [],
                       function (e) { return !e.verified; });
    address = (email || {}).address;
  }
  // make sure we have a valid address
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))
    throw new Error("No such email address for user.");


  var tokenRecord = {
    token: Random.id(),
    address: address,
    when: new Date()};
  Meteor.users.update(
    {_id: userId},
    {$push: {'services.email.verificationTokens': tokenRecord}});

  var verifyEmailUrl = Accounts.urls.verifyEmail(tokenRecord.token);

  var options = {
    to: address,
    from: emailTemplates.from,
    subject: emailTemplates.verifyEmail.subject(user),
    text: emailTemplates.verifyEmail.text(user, verifyEmailUrl)
  };

  sendEmail(options);
};

// Basically identical to `Accounts.sendEnrollmentEmail`, but dispatches to
// our `sendEmail` function rather than the built-in `Email.send`.
sendEnrollmentEmail = function (userId, options) {
  check(userId, String);
  check(options, {
    thankYouFor: String,
    email: Match.Optional(String),
    gameId: Match.Optional(String)
  });
  var email = options.email;

  // Make sure the user exists, and email is in their addresses.
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first email if we weren't passed an email.
  if (!email && user.emails && user.emails[0])
    email = user.emails[0].address;
  // make sure we have a valid email
  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email))
    throw new Error("No such email for user.");


  var token = Random.id();
  var when = new Date();
  Meteor.users.update(userId, {$set: {
    "services.password.reset": {
      token: token,
      email: email,
      when: when
    }
  }});

  var enrollAccountUrl = Accounts.urls.enrollAccount(token);

  var emailOptions = {
    to: email,
    from: emailTemplates.from,
    subject: emailTemplates.enrollAccount.subject(user, options),
    text: emailTemplates.enrollAccount.text(user, enrollAccountUrl, options)
  };

  sendEmail(emailOptions);
};

// Notify organizer about players joining/leaving game.
notifyOrganizer = function (gameId, options) {
  check(gameId, String);
  check(options, Match.Where(function (options) {
    check(options, {
      joined: Match.Optional({
        userId: String,
        name: String,
        numFriends: Match.Optional(Number)
      }),
      left: Match.Optional({
        userId: String,
        name: String,
        numFriends: Match.Optional(Number)
      })
    });
    return options.joined || options.left;
  }));
  var game = Games.findOne(gameId);
  if (! game)
    throw new Error("Game not found");

  // Don't notify organizer about his own joining/leaving or friend-adding.
  if (options.joined && options.joined.userId === game.creator.userId ||
      options.left && options.left.userId === game.creator.userId) {
    return false;
  }

  var creator = Meteor.users.findOne(game.creator.userId);

  var email = {
    from: emailTemplates.from,
    to: creator.emails[0].address
  };
  var gameInfo = utils.displayTime(game) + " " + game.type;
  var text = "For your reference, [here]("
        + Meteor.absoluteUrl('g/'+gameId) + ")"
        + " is a link to your game.\n\n"
        + "Thanks for organizing.";
  var who;
  if (options.left) { // people left
    who = options.left.name;
    if (options.left.numFriends && options.left.numFriends > 0) {
      who += " and "+options.left.numFriends+" friend";
      if (options.left.numFriends > 1) {
        who+="s";
      }
    }
    sendEmail(_.extend({
      subject: who+" left your "+gameInfo+" game",
      text: text
    }, email));
  } else {
    // Player added self or added friends
    // If player did both at once, two emails will be sent
    who = options.joined.name;
    if (options.joined.numFriends && options.joined.numFriends > 0) {
      who += " added "+options.joined.numFriends+" friend";
      if (options.joined.numFriends > 1) {
        who += "s";
      }
      who += " to";
    } else {
      who += " joined";
    }
    sendEmail(_.extend({
      subject: who+" your "+gameInfo+" game",
      text: text
    }, email));
  }
  return true;
};

// Remind organizer to clarify if the game is "on" or not. Links in email
// trigger either a "game on" reminder to participants or a "game cancelled"
// notice.
// Called by a scheduled "cron" job (see server/cron.js).
remindOrganizer = function(gameId) {
  var game = Games.findOne(gameId);
  if (! game)
    throw new Error("Game not found");

  var creator = Meteor.users.findOne(game.creator.userId);

  // place a shared token and generate Urls
  var tokenRecord = verifyEmailTokenRecord(creator._id);
  tokenRecord.gameId = gameId;
  Meteor.users.update(
    {_id: creator._id},
    {$push: {'services.email.verificationTokens': tokenRecord}});
  var gameOnTrigger = Accounts.urls.pushpickup.gameOn(tokenRecord.token);
  var cancelGameTrigger = Accounts.urls.pushpickup
        .cancelGame(tokenRecord.token);

  var email = {
    from: emailTemplates.from,
    to: creator.emails[0].address
  };
  var gameInfo = utils.displayTime(game) + " " + game.type;
  _.extend(email, {
    subject: "Status of your " + gameInfo + " game?",
    text: "If your " + gameInfo + " game is on, [click here]("
        + gameOnTrigger +") to trigger an email to "
        + "all players, letting them know.\n"
        + "\n"
        + "If the game is *not* happening, please "
        + "[click here](" + cancelGameTrigger + ") to cancel the game "
        + "and notify the players.\n"
        + "\n"
        + "For your reference, [here]("
        + Meteor.absoluteUrl('g/'+gameId) + ")"
        + " is a link to your game.\n"
        + "\n"
        + "Thanks for organizing."
  });
  sendEmail(email);
};

notifyPlayers = function (gameId, options) {
  var game = Games.findOne(gameId);
  if (!game)
    throw new Error(404, "Game not found");
  check(options, Match.Where(function(o) {
    check(o, {changes: Object});
    return !_.isEmpty(o.changes);
  }));
  var changes = options.changes;

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

  var changesBullets = "";
  if (changes.type)
    changesBullets += "* Game type is now *"+changes.type+"*\n";
  if (changes.day)
    changesBullets += "* Game day is now *"+changes.day.format('dddd')+"*\n";
  if (changes.time)
    changesBullets += "* Game time is now *"+changes.time.format('h:mma')+"*\n";
  if (changes.location)
    changesBullets += "* Game location is now *"+changes.location.name+"*\n";
  if (changes.note) {
    changesBullets += "* The organizer's note is now this:\n\n"
      + changes.note + "\n";
  }


  _.each(players, function (player) {
    sendEmail({
      from: emailTemplates.from,
      to: player.address,
      subject: " Game *updated*: "+game.type+" at "
        + utils.displayTime(game),
      text: "Details for a game you're playing in have changed. "
        + "Here's a summary of the changes:\n"
        + "\n"
        + changesBullets
        + "\n"
        + "[Here](" + Meteor.absoluteUrl('g/'+gameId)
        + ") is a link to the game.\n"
        +"\n"
        + "Thanks for helping to push pickup."
    });
  });
};
