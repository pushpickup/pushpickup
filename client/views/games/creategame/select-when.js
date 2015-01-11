Template.devSelectWhen.helpers({
  selectTime: function () {
    var self = this;
    var selfDayStart = self.startsAt &&
          moment(self.startsAt).startOf('day');
    var dayStart = moment(Session.get("newGameDay") ||
                          selfDayStart ||
                          moment().startOf('day'));

    var prevSelectedTime = Session.get("newGameTime");
    var dayMinutes = function (m) {
      return 60 * m.hours() + m.minutes();
    };
    var selectedMinutes =
          (prevSelectedTime && dayMinutes(moment(prevSelectedTime))) ||
          (self.startsAt && dayMinutes(moment(self.startsAt))) ||
          720; // noon is 720 minutes into day

    var them =  _.map(_.range(96), function (i) {
      var t = moment(dayStart).add(15 * i, 'minutes');
      return {
        value: +t,
        text: t.format('h:mmA'),
        selected: ((15 * i) === selectedMinutes)
      };
    });

    them = _.reject(them, function (t) {
      return t.value < +moment() || t.value > +moment().add(1, 'weeks');
    });
    return {label: 'Time', id: 'gameTime', containerClass: "game-time-container", options: them};
  },
  selectDay: function () {
    var self = this;
    var selfDayStart = self.startsAt &&
          moment(self.startsAt).startOf('day');
    var them =  _.map(_.range(7), function (i) {
      var dayStart = moment().startOf('day').add(i, 'days');
      return {
        value: dayStart.valueOf(),
        text: dayStart.format('dddd'),
        selected: (+dayStart === +selfDayStart)
      };
    });
    them[0].text = 'Today';
    them[1].text = 'Tomorrow';
    return {label: "When", 
            id: "gameDay", 
            containerClass: "game-day-container",
            options: them};
  }
});