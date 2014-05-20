Template.loadMoreGames.events({
  "click a": function () {
    Session.set("num-games-requested",
                Session.get("num-games-requested") + 15);
  }
});

Template.loadMoreGames.helpers({
  noMoreGames: function () {
    return Session.get("num-games-requested") > Games.find().count();
  }
});