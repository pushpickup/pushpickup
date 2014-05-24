inputValue = function (element) { return element.value; };

inputValues = function (selector) {
  return _.map($(selector).get(), inputValue);
};

Deps.autorun(function () {
  // autorun Games subscription currently depends on Session 'gameTypes'
    Session.set("gameTypes", Session.get("game-types"));
});

ppConjunction = function (array) {
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

ppRegion = function (formatted_address) {
  return formatted_address;
};


whosPlayingHelpers = {
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