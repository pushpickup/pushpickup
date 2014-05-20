var addSelfToGame = function (gameId) {
  if (! gameId) { return; }
  var path = Router.current().path;
  var inviteeId = path.split('?')[1]

  Meteor.call("addSelf", {
    gameId: gameId,
    name: Meteor.user().profile.name
  }, function (err) {
    if (!err) {
      Session.set("joined-game", gameId);
      Session.set("unauth-join", null);
      Alerts.throw({
        message: "You've joined this game -- be sure to invite your friends!",
        type: "success", where: gameId,
        autoremove: 5000
      });

      var fullName = Meteor.user().profile.name;
      var email = Meteor.user().emails[0].address;

      if (inviteeId) {
        Meteor.call(
          "dev.notifyInviter", gameId, email, fullName, inviteeId,
          function (error, result) {
            if (error) {
              console.log(error);
            }
          });
      }
    } else {
      console.log(err);
      Alerts.throw({
        message: "Hmm, something went wrong: \""+err.reason+"\". Try again?",
        type: "danger",
        where: gameId
      });
    }
  });
};


var inputValue = function (element) { return element.value; };

var inputValues = function (selector) {
  return _.map($(selector).get(), inputValue);
};

Deps.autorun(function () {
  // autorun Games subscription currently depends on Session 'gameTypes'
    Session.set("gameTypes", Session.get("game-types"));
});

var ppConjunction = function (array) {
  var out = "";
  for (var i=0, l=array.length; i<l; i++) {
    out = out + array[i];
    if (i === l-2 && l === 2) {
      out = out + " and ";
    } else if (i === l-2) {
      out = out + ", and ";
    } else if (i < l-2) {
      out = out + ", ";
    }
  }
  return out;
};

var ppRegion = function (formatted_address) {
  return formatted_address;
};


var whosPlayingHelpers = {
  userPlayers: function () {
    var isUser = function (player) { return !! player.userId; };
    return _.select(this.players, isUser);
  },
  friends: function (players) {
    var self = this;
    return _.select(players, function (p) {
      return (! p.userId) && p.friendId === self.userId;
    });
  },
  numFriends: function () {
    return this.length;
  }
};
Template.whosPlayingSummary.helpers(whosPlayingHelpers);
Template.whosPlayingEditable.helpers(whosPlayingHelpers);

// selector is either a String, e.g. "#name", or a [String, function] that
// takes the value and then feeds it to the (one-argument) function for
// a final value
selectorValuesFromTemplate = function (selectors, templ) {
  var result = {};
  _.each(selectors, function (selector, key) {
    if (typeof selector === "string") {
      result[key] = templ.find(selector).value;
    } else {
      result[key] = (selector[1])(templ.find(selector[0]).value);
    }
  });
  return result;
};

asNumber = function (str) { return +str; };

// Set several Template.settings.events of the form:
//
// "click .sign-in.trigger": function () {
//   Session.toggle("settings-sign-in");
// }
sessionToggler = function (action) {
  return function () {
    Session.toggle("settings-"+action);
  };
};
_.each([
  'sign-in', 'sign-up', 'forgot-password', 'set-password',
  'subscriptions', 'change-email-address', 'change-password',
  'change-location', 'help-and-feedback'
], function (action) {
  var key =  "click ."+action+".trigger";
  var eventMap = {};
  eventMap[key] = sessionToggler(action);
  Template.settings.events(eventMap);
});

