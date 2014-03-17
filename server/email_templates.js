emailTemplates = {
  from: "Push Pickup <support@pushpickup.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),

  // Send only immediately after creating an account for the added friend.
  addedAsFriend: {
    subject: function(user, options) {
      check(options, {gameId: String, adderId: String});
      var adder = Meteor.users.findOne(options.adderId);
      var game = Games.findOne(options.gameId);
      if (!adder || !game)
        throw new Error("Can't find user or game");
      return adder.profile.name + " added you to a "
        + game.displayTime() + " "
        + game.type + " game "
        + "on " + Accounts.emailTemplates.siteName;
    },
    text: function(user, url, options) {
      check(options, Match.ObjectIncluding({gameId: String}));
      var greeting = (user.profile && user.profile.name) ?
            ("Hello " + user.profile.name + ",") : "Hello,";
      return greeting + "\n"
        + "\n"
        + "An account has been created for you on "
        + Accounts.emailTemplates.siteName + ". "
        + "To verify your email and thus receive game updates, simply click the link below.\n"
        + "\n"
        + url + "\n"
        + "\n"
        + "For your reference, below is a link to the game.\n\n"
        + Meteor.absoluteUrl('g/'+options.gameId) + "\n"
        + "\n"
        + "Thanks.\n";
    }
  }
};
