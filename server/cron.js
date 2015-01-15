// Veeeeeeery simple cron job singleton
// ticks every 1 minute, set a job to go every X ticks.
// Extended from Tom Coleman's `cron-tick` package to include job removal
// by job id.

var Cron = function(interval) {
    var self = this;

    interval = interval || 60 * 1000;

    self._jobs = [];
    self._schedules = [];

    Meteor.setInterval(function() {
        self.tick();
    }, interval);
};

_.extend(Cron.prototype, {
    addJob: function(every_x_ticks, fn, id) {
        id = id || Random.id();
        this._jobs.push({id: id, fn: fn, every: every_x_ticks, count: 0});
        return id;
    },

    removeJob: function(id) {
        var self = this;
        var hasId = function (job) { return job.id === id; };
        self._jobs = _.reject(self._jobs, hasId);
    },

    addScheduleJob: function(unix_time, fn, id) {
        id = id || Random.id();
        this._schedules.push({id: id, fn: fn, unix_time: unix_time});
        return id;
    },

    removeScheduleJob: function(id) {
        var self = this;
        var hasId = function (job) { return job.id === id; };
        self._schedules = _.reject(self._schedules, hasId);
    },

    tick: function() {
        var self = this;

        _.each(self._jobs, function(job) {
            job.count += 1;
            if (job.count === job.every) {
                job.fn();
                job.count = 0;
            }
        });

        _.each(self._schedules, function(job, index) {
            var ts = Math.round((new Date()).getTime() / 1000);

            if (ts >= job.unix_time) {
                job.fn();
                delete self._schedules[index];
            }
        });
    }
});

////
// Application code using the above singleton
////


var cron = new Cron(/* ticks every 1 second by default */);

gameReminders = new GameReminders(cron);

Meteor.startup(function () {
    Games.find({startsAt: {$gt: moment().add(3, 'hours').toDate()}})
        .forEach(function (game) {
            gameReminders.scheduleReminderForOrganizer(game._id);
        });
});