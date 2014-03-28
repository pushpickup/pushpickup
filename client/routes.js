Router.configure({
  layoutTemplate: 'devLayout',
  notFoundTemplate: 'devMain',
  loadingTemplate: 'loading'
});

Router.load(function () {Session.set("waiting-on", null); });

Router.before(function() { Alerts.clearSeen(); });

var filters = {

  nProgressHook: function () {
    // we're done waiting on all subs
    if (this.ready()) {
      NProgress.done();
    } else {
      NProgress.start();
      this.stop(); // stop downstream funcs from running
    }
  },
  mustBeSignedIn: function () {
    if (!Meteor.user()) {
      // render the login template but keep the url in the browser the same
      this.render('signIn');
      // stop the rest of the before hooks and the action function
      this.stop();
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
      load: function () {
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
      load: function () {
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
      load: function () {
        Session.set("joined-game", null);
      },
      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },
      before: function () {
        Session.set("soloGame", this.params._id);
      },
      data: function () {
        return Games.findOne(this.params._id);
      },
      unload: function () {
        Session.set("soloGame", null);
      }
    });

    this.route('devAddGame', {
      path: '/addGame',
      template: 'devEditableGame',
      layoutTemplate: 'devLayout',
      load: function () {
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
      load: function () {
        Session.set("selectedLocationPoint", null);
      },
      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },
      before: [
        filters.mustBeSignedIn,
        function () {
          Session.set("soloGame", this.params._id);
        }
      ],
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
          self.render('home');
        }
      }
    });

  });
});
