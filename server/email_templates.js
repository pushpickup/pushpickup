emailTemplates = {
  from: "Push Pickup <support@pushpickup.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),

  // DEPRECATED - superseded by Meteor.call("notifyAddedFriend", ...)
  newUserAddedAsFriend: {
    subject: function(user, options) {
      check(options, {gameId: String, adderId: String});
      var adder = Meteor.users.findOne(options.adderId);
      var game = Games.findOne(options.gameId);
      if (!adder || !game)
        throw new Error("Can't find user or game");
      return adder.profile.name + " added you to a "
        + utils.displayTime(game) + " "
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
        + Accounts.emailTemplates.siteName + ". Please [click here](" + url
        + ") to verify your email and thus receive game updates.\n"
        + "\n"
        + "For your reference, [here]("
        + Meteor.absoluteUrl('g/'+options.gameId)
        + ") is a link to the game.\n"
        + "\n"
        + "Thanks.";
    }
  }
};
