utils = {
  startsAtMomentWithOffset: function (game) {
    var offset = game.location.utc_offset;
    if (! Match.test(offset, UTCOffset)) {
      offset: -8; // Default to California
    }
    // UTC offsets returned by Google Places API,
    // which is the source of game.location.utc_offset,
    // differ in sign from what is expected by moment.js
    return moment(game.startsAt).zone(-offset);
  },
  displayTime: function (game) {
    return utils.startsAtMomentWithOffset(game).format('ddd h:mma');
  },
  // Same-day-ness depends on the known timezone of the game,
  // not the timezone of the system executing this function.
  isToday: function (game) {
    var gameWhen = utils.startsAtMomentWithOffset(game);
    var now = utils.startsAtMomentWithOffset(
      // clone of game that starts now
      _.extend({startsAt: new Date()}, _.omit(game, 'startsAt'))
    );
    return gameWhen.isSame(now, 'day');
  },
  // Markdown->HTML
  converter: new Showdown.converter()
};
