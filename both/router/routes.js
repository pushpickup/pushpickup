/*****************************************************************************/
/* Client and Server Routes */
/*****************************************************************************/
// TODO: use these as per the Event Mind CLI tool.
//Router.configure({
//  templateNameConverter: 'upperCamelCase',
//  routeControllerNameConverter: 'upperCamelCase'
//});

Router.configure({
    layoutTemplate: 'devLayout',
    notFoundTemplate: 'devMain',
    loadingTemplate: 'loading'
});

Router.onRun(function () {Session.set("waiting-on", null);this.next(); });
Router.onBeforeAction(function() { Alerts.clearSeen();this.next(); });

var filters = {
    nProgressHook: function () {
        // we're done waiting on all subs
        if (this.ready()) {
            NProgress.done();
            this.next();
        } else {
            NProgress.start();
        }
    }
};

Router.onBeforeAction(filters.nProgressHook);

Meteor.startup(function () {
    Router.map(function () {
        this.route('loading');

        // reset password urls use hash fragments instead of url paths/query
        // strings so that the reset password token is not sent over the wire
        // on the http request

        this.route('reset-password', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            onRun: function () {
                var token = this.params.hash;
                Meteor.logout(function () {
                    Session.set("viewing-settings", true);
                    Session.set("set-password-token", token);
                    Session.set("settings-set-password", true);
                    // Session.set("enrolling", true) // do something special?
                });

                this.next();
            }
        });

        this.route('verify-email', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            action: function () {
                var self = this;
                var token = self.params.hash;
                Accounts.verifyEmail(token, function (err) {
                    if (!err) {
                        Alerts.throw({
                            message: "Your email address is now verified!",
                            type: "success", where: "main",
                            autoremove: 3000
                        });
                        Router.go('home');
                    } else {
                        Alerts.throw({
                            message: "Hmm, something went wrong: \""+err.reason +
                                "\". Try again?",
                            type: "danger", where: "main"
                        });
                        Session.set("viewing-settings", true);
                        Router.go('home');
                    }
                });
            }
        });

        this.route('leave-game', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            action: function () {
                var self = this;
                var token = self.params.hash;
                Meteor.call("leaveGameViaToken", token, function (err, res) {
                    if (!err) {
                        // Idempotently verify user's email,
                        // since they got the token via email.
                        Accounts.verifyEmail(token);
                        if (res.error) {
                            // e.g. "Leave-game link is for unknown game"
                            Alerts.throw({
                                message: res.error.reason, type: "danger", where: "main"
                            });
                            Router.go("home");
                        } else {
                            Alerts.throw({
                                message: "OK, you are no longer in this game.",
                                type: "success", where: res.gameId
                            });
                            Router.go("devDetail", {_id: res.gameId});
                        }
                    } else {
                        Alerts.throw({
                            message: "Hmm, something went wrong: \""+err.reason + "\".",
                            type: "danger", where: "main"
                        });
                        Router.go("home");
                    }
                });
            }
        });

        this.route('game-on', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            action: function () {
                var self = this;
                var token = self.params.hash;
                Meteor.call("gameOnViaToken", token, function (err, res) {
                  if (err || (res && res.error)) {
                    errorMessage = err ? "Hmm, something went wrong: \"" + err.reason + "\"." : res.error.reason;

                    Alerts.throw({
                      message: errorMessage, type: "danger", where: "main"
                    });

                    Router.go("home");
                  } else {
                    Alerts.throw({
                      message: "Woohoo! Players will be notified.",
                      type: "success", where: res.gameId
                    });

                    Router.go("devDetail", {_id: res.gameId, token: token });
                  }
                });
            }
        });

        this.route('cancel-game', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            action: function () {
                var self = this;
                var token = self.params.hash;
                Meteor.call("cancelGameViaToken", token, function (err, res) {
                    if (!err) {
                        Accounts.verifyEmail(token);
                        if (res.error) {
                            Alerts.throw({
                                message: res.error.reason, type: "danger", where: "main"
                            });
                            Router.go("home");
                        } else {
                            Alerts.throw({
                                message: "OK, your game is now cancelled, and players "
                                    + "will be notified.",
                                type: "success", where: "main"
                            });
                            Router.go("home");
                        }
                    } else {
                        Alerts.throw({
                            message: "Hmm, something went wrong: \""+err.reason + "\".",
                            type: "danger", where: "main"
                        });
                        Router.go("home");
                    }
                });
            }
        });

        // quite similar to 'leave-game' route
        this.route('unsubscribe-all', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            action: function () {
                var self = this;
                var token = self.params.hash;
                Meteor.call("unsubscribeAllViaToken", token, function (err, res) {
                    if (!err) {
                        // Idempotently verify user's email,
                        // since they got the token via email.
                        Accounts.verifyEmail(token);
                        if (res.error) {
                            // e.g. "Token provided in link is not an unsubscribe-all token"
                            Alerts.throw({
                                message: res.error.reason, type: "danger", where: "main"
                            });
                            Router.go("home");
                        } else {
                            Alerts.throw({
                                message: "OK, you will no longer receive emails "
                                    + "from Push Pickup.",
                                type: "success", where: "main"
                            });
                            Router.go("home");
                        }
                    } else {
                        Alerts.throw({
                            message: "Hmm, something went wrong: \""+err.reason + "\".",
                            type: "danger", where: "main"
                        });
                        Router.go("home");
                    }
                });
            }
        });

        this.route('enroll-account', {
            template: 'devMain',
            layoutTemplate: 'devLayout',
            onRun: function () {
                var token = this.params.hash;
                Meteor.logout(function () {
                    Session.set("viewing-settings", true);
                    Session.set("set-password-token", token);
                    Session.set("settings-set-password", true);
                    // Session.set("enrolling", true) // do something special?
                });

                this.next();
            }
        });

        // the home page. listing and searching for games
        this.route('home', {
            path: '/',
            template: 'devMain',
            layoutTemplate: 'devLayout'
        });

        // typical user interaction with a single game
        this.route('devDetail', {
            path: '/g/:_id/:token?',
            layoutTemplate: 'devLayout',
            onRun: function () {
                Session.set("joined-game", null);
                this.next();
            },
            waitOn: function () {
                return Meteor.subscribe('game', this.params._id);
            },
            onBeforeAction: function (pause) {
                Session.set("soloGame", this.params._id);
                this.next();
            },
            data: function () {
              var game = Games.findOne(this.params._id);

              if (game) {
                Session.set("gameExists", true);
              }

              return game;
            },
            action: function () {
              var token = this.params.token;

              if (Session.get("gameExists")) {
                this.render();

              } else {
                Router.go('home');

                Alerts.throw({
                  message: "Game not found",
                  type: "warning", where: "top"
                });
              }

              if (token) {
                Meteor.call("sendReminderEmailsViaToken", token, function (err, res) {
                  var errorMessage;

                  Accounts.verifyEmail(token);

                  if (err || (res && res.error)) {
                    errorMessage = err ? "Hmm, something went wrong: \"" + err.reason + "\"." : res.error.reason;

                    Alerts.throw({
                      message: errorMessage, type: "danger", where: "main"
                    });

                    Router.go("home");
                  }
                });
              }
            },
            onStop: function () {
              Session.set("soloGame", null);
              Session.set("gameExists", null);
            }
        });

        this.route('devAddGame', {
            path: '/addGame',
            template: 'devEditableGame',
            layoutTemplate: 'devLayout',
            onRun: function () {
                Session.set("selectedLocationPoint", null);
                Session.set("newGameDay", null);
                Session.set("newGameTime", null);
                InviteList.remove({});
                this.next();
            },
            waitOn: function() {
                Meteor.subscribe('recently-played');
            },
            data: function () {
                return {
                    action: 'add',
                    title: 'Add game',
                    submit: 'Add game'
                };
            }
        });

        this.route('invitePreviousPlayers', {
            path: 'invitePlayers',
            template: 'invitePreviousPlayers',
            layoutTemplate: 'devLayout'
        });

        this.route('devEditGame', {
            path: '/editGame/:_id',
            template: 'devEditableGame',
            layoutTemplate: 'devLayout',
            onRun: function () {
                Session.set("selectedLocationPoint", null);
                this.next();
            },
            waitOn: function () {
                return Meteor.subscribe('game', this.params._id);
            },
            onBeforeAction: function (pause) {
                Session.set("soloGame", this.params._id);
                this.next();
            },
            data: function () {
                return _.extend({
                    action: 'edit',
                    title: 'Edit game',
                    submit: 'Update game'
                }, Games.findOne(this.params._id));
            },
            action: function () {
                var self = this;
                var user = Meteor.user();
                var game = self.data();
                if (user && user._id === game.creator.userId ||
                    user && user.admin) {
                    self.render();
                } else {
                    Router.go('home');
                }
            }
        });

        this.route('adminView', {
            path: '/admin',
            onBeforeAction: function () {
                var user = Meteor.user();
                if (!user || !user.admin) {
                    this.render('home');
                }
                else {
                    this.next();
                }
            }
        });

    });
});