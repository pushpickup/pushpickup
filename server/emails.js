// Extend the functionality of `accounts-password` package
// to send custom emails

emailTemplates = {
  from: "Push Pickup <support@pushpickup.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '')
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

// Return a new email with an `html` body that is a
// Markdown conversion of the input email's `text` body.
withHTMLbody = function (email) {
  var html = utils.converter.makeHtml(email.text);
  return _.extend({html: html}, _.omit(email, 'html'));
};

// Return a new email with an appended link to no longer receive any emails
// from Push Pickup. This function is meant to be composed with `withHTMLbody`
// as in the expression `withHTMLbody(withTotalUnsubscribe(email))`.
withTotalUnsubscribe = function (email) {
  var link = Meteor.absoluteUrl('totally-unsubscribe');
  var text = email.text +
        "\n\n===\n[Unsubscribe]("+link+") from all emails from Push Pickup.";
  return _.extend({text: text}, _.omit(email, 'text'));
};


// Use instead of `Email.send` to ensure defaults such as a link at bottom
// to unsubscribe from all emails, and an html body derived from the text body.
sendEmail = function (email, options) {
  options = _.extend({
    withHTMLbody: ! Meteor.settings.DEVELOPMENT,
    withTotalUnsubscribe: true
  }, options);
  if (options.withTotalUnsubscribe) {
    email = withTotalUnsubscribe(email);
  }
  if (options.withHTMLbody) {
    email = withHTMLbody(email);
  }
  Email.send(email);
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
};
