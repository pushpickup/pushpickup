/**
 * A game reminder manager.
 * @constructor
 */
GameReminders = function(cron) {
    //check(cron, Cron); // Add this check if we make Cron global.

    this.cron = cron;
}

/**
 * Schedules a reminder for the game with the given id.
 * @param gameId
 */
_.extend(GameReminders.prototype, {
    scheduleReminderForOrganizer: function (gameId) {
        this.cron.removeScheduleJob(gameId); // no effect if no such job

        var game = Games.findOne(gameId);

        // In development, can add game 3-4 hours away and get email in ~1 minute
        var numHours = Meteor.settings.DEVELOPMENT ? 4 : 3;

        this.cron.addScheduleJob(
            moment(game.startsAt).subtract('hours', numHours).unix(),
            function () {
                remindOrganizer(gameId);
            },
            gameId);
    },

    cancelReminderFromOrganizer: function (gameId) {
        this.cron.removeScheduleJob(gameId);
    }
});