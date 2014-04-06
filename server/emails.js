// Extend the functionality of `accounts-password` package
// to send custom emails

emailTemplates = {
  from: "PushPickup <support@pushpickup.com>",
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
        + "We wish you many good games!\n";
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
        + "We wish you many good games!\n";
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
        + "Welcome! PushPickup is an app that's better than email lists "
        + "for organizing pickup games for soccer, basketball, and "
        + "ultimate frisbee. Soon, you will also be able to find and be "
        + "notified of games happening around you. "
        + "Please let us know what you think (you can just reply to this email).\n"
        + "\n"
        + "Thanks for playing,\n"
        + "\n"
        + "Donny Winston and Stewart McCoy\n";
  return _.extend({text: text}, _.omit(email, 'text'));
};

// Return a new email with an appended link to no longer receive any emails
// from Push Pickup. This function is meant to be composed with `withHTMLbody`
// as in the expression `withHTMLbody(withTotalUnsubscribe(email))`.
withTotalUnsubscribe = function (email) {
  var link = Meteor.absoluteUrl('totally-unsubscribe');
  var text = email.text +
        "\n\n----\n\n[Unsubscribe]("+link+") from all emails from PushPickup.";
  return _.extend({text: text}, _.omit(email, 'text'));
};


// Use instead of `Email.send` to ensure defaults such as a link at bottom
// to unsubscribe from all emails, and an html body derived from the text body.
sendEmail = function (email, options) {
  options = _.extend({
    withTotalUnsubscribe: true,
    withOnboarding: shouldOnboard(getEmailAddress(email.to)),
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
  Email.send(email);
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
  var text = "View [your game details]("
        + Meteor.absoluteUrl('g/'+gameId) + ")"
        + " to see the latest list of who has joined.\n\n"
        + "Thanks for organizing!";
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
