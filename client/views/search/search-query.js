Template.searchQuery.helpers({
  games: function(){
    var gameTypes = Session.get('game-types')
    gameTypes = gameTypes.sort()
    var len = gameTypes.length
    var game = gameTypes[0]
    var l = game.length;
    
    game = game[0].toUpperCase() + game.slice(1,l)
    if (game == 'Ultimate') game = 'Ultimate Frisbee'

    if (len > 2) {
      for (var i=1; i < len; i++) {
        var gameType = gameTypes[i]
        l = gameType.length
        gameType = gameType[0].toUpperCase() + gameType.slice(1,l)

        if (gameType == 'Ultimate')
          gameType = 'Ultimate Frisbee'

        if (i == len - 1)
          game = game + ', and ' + gameType
        else
          game = game + ', ' + gameType
      }
    }

    if (len == 2) {
      var gameType = gameTypes[1]
      l = gameType.length
      gameType = gameType[0].toUpperCase() + gameType.slice(1,l)

      if (gameType == 'Ultimate')
          gameType = 'Ultimate Frisbee'

      game = game + ' and ' + gameType
    }
    return game
  },
  city: function() {
    var location = Session.get('userSelectedLocation');
    var city = location.split(",")[0]
    if (!city) city = "this region"
    return city
  }
});