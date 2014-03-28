Router.configure({
  layoutTemplate: 'devLayout',
  notFoundTemplate: 'devMain',
  loadingTemplate: 'loading'
});

Router.onRun(function () {Session.set("waiting-on", null); });
Router.onBeforeAction(function() { Alerts.clearSeen(); });

var filters = {
  nProgressHook: function () {
    // we're done waiting on all subs
    if (this.ready()) {
      NProgress.done();
    } else {
      NProgress.start();
      this.stop(); // stop downstream funcs from running
    }
  }
};

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
      path: '/g/:_id',
      layoutTemplate: 'devLayout',
      onRun: function () {
        Session.set("joined-game", null);
      },
      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },
      onBeforeAction: function (pause) {
        Session.set("soloGame", this.params._id);
        if (! this.ready()) {
          pause();
        }
      },
      data: function () {
        return Games.findOne(this.params._id);
      },
      action: function () {
        if (this.data()) {
          this.render();
        } else {
          Router.go('home');
          Alerts.throw({
            message: "Game not found",
            type: "warning", where: "top"
          });
        }
      },
      onStop: function () {
        Session.set("soloGame", null);
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
      },
      data: function () {
        return {
          action: 'add',
          title: 'Add game',
          submit: 'Add game'
        };
      }
    });

    this.route('devEditGame', {
      path: '/editGame/:_id',
      template: 'devEditableGame',
      layoutTemplate: 'devLayout',
      onRun: function () {
        Session.set("selectedLocationPoint", null);
      },
      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },
      onBeforeAction: function (pause) {
        Session.set("soloGame", this.params._id);
        if (! this.ready()) {
          pause();
        }
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

  });
});
