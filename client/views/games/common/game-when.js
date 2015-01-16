Template.gameWhen.helpers({
  fromNow: function () {
    return moment(this.startsAt).fromNow();
  },
  displayDay: function () {
    var m = utils.startsAtMomentWithOffset(this);
    var day = m.format('ddd');
    if (m.isSame(moment(), 'day')) {
      day = "Today";
    } else if (m.isSame(moment().add(1, 'days'), 'day')) {
      day = "Tomorrow";
    }
    return day;
  },
  displayTime: function () {
    var m = utils.startsAtMomentWithOffset(this);
    return m.format('h:mma');
  }
});