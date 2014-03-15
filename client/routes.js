Router.configure({
  layoutTemplate: 'layout',
  notFoundTemplate: 'home',
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

    this.route('get-reset-link', {
      template: 'sendResetPasswordEmail'
    });

    this.route('change-password', {
      template: 'changePassword'
    });

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
            Router.go('dev');
          } else {
            Alerts.throw({
              message: "Hmm, something went wrong: \""+err.reason +
                "\". Try again?",
              type: "danger", where: "main"
            });
            Session.set("viewing-settings", true);
            Router.go('dev');
          }
        });
      }
    });

    this.route('get-verify-link', {
      template: 'sendVerificationEmail'
    });

    this.route('manage-subscriptions', {
      template: 'manageUserSubs',

      waitOn: function () {
        return Meteor.subscribe('user_subs');
      },

      data: function () {
        return {
          subsCount: UserSubs.find().count(),
          hasSubs: UserSubs.find().count() > 0
        };
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

    this.route('home', {
      path: '/',

      load: function () {
        // TODO: load Session "gameTypes" and "gameDays"
        // from user profile
        Session.set("need_location_set", undefined);
      },

      unload: function () {
      }
    });

    this.route('about');
    this.route('help');

    this.route('signIn', {
      action: function () {
        if (Meteor.userId()) {
          this.render('home');
        } else {
          this.render();
        }
      }
    });

    this.route('signOut', {
      action: function () {
        Meteor.logout();
        this.render('home');
        Router.go('home'); // o/w, refreshes/hot-code pushes log users out (!)
      }
    });

    this.route('addGame', {
      path: '/games/add',
      template: 'editableGame',

      load: function () {
        Session.set("newGameDay", null);
        Session.set("newGameTime", null);
        Session.set("addingGame", true);
        // if (!google) Session.set("selectedLocationPoint", {
        //   type: "Point",
        //   coordinates: [-122.272301, 37.856386]
        // }); // Grove Park, Berkeley, CA
      },

      data: function () {
        return _.extend({
          id: 'addGame',
          title: 'Add a game',
          submit: 'Add'
        }, Games.findOne(this.params._id));
      },

      unload: function () {
        Session.set("addingGame", false);
        Session.set("selectedLocationPoint", null);
      }
    });

    this.route('oneGame', {
      path: '/games/:_id',


      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },

      before: [
        function () {
          // may not correspond to a legit game id
          Session.set("soloGame", this.params._id);
          Session.set("selectedGame", this.params._id);
        }
      ],

      data: function () {
        return Games.findOne(this.params._id);
      },

      unload: function () {
        Session.set("soloGame", null);
        Session.set("selectedGame", null);
        // crufty. don't do this for a 'back' link
        Session.set("pageNum", 0);
      }
    });

    this.route('editGame', {
      path: '/games/:_id/edit',
      template: 'editableGame',

      load: function () {
        Session.set("newGameDay", null);
        Session.set("newGameTime", null);
        Session.set("editingGame", true);
      },

      waitOn: function () {
        return Meteor.subscribe('game', this.params._id);
      },

      before: [
        filters.mustBeSignedIn,
        function () {
          // may not correspond to a legit game id
          Session.set("soloGame", this.params._id);
          Session.set("selectedGame", this.params._id);
        }
      ],

      data: function () {
        return _.extend({
          id: 'editGame',
          title: 'Edit game',
          submit: 'Submit changes'
        }, Games.findOne(this.params._id));
      },

      action: function () {
        var self = this;
        if (Meteor.userId() === self.getData().creator.userId) {
          self.render();
        } else {
          Meteor.call("getDonnyId", function (error, result) {
            if (!error && Meteor.userId() === result) {
              self.render();
            } else {
              self.render('home');
            }
          });
        }
      },

      after: function () {
      },

      unload: function () {
        Session.set("soloGame", null);
        Session.set("selectedGame", null);
        // crufty. don't do this for a 'back' link
        Session.set("pageNum", 0);
        Session.set("editingGame", false);
        Session.set("selectedLocationPoint", null);
      }
    });

    //// 'dev' routes
    //
    // Routes for the next beta release of the site,
    // accessible via '/dev'

    // the home page. listing and searching for games
    this.route('dev', {
      template: 'devMain',
      layoutTemplate: 'devLayout'
    });

    // typical user interaction with a single game
    this.route('devDetail', {
      path: '/dev/g/:_id',
      layoutTemplate: 'devLayout',
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
      path: '/dev/addGame',
      template: 'devEditableGame',
      layoutTemplate: 'devLayout',
      load: function () {
        Session.set("selectedLocationPoint", null);
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
      path: '/dev/editGame/:_id',
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
        if (Meteor.userId() === self.getData().creator.userId) {
          self.render();
        } else {
          Meteor.call("getDonnyId", function (error, result) {
            if (!error && Meteor.userId() === result) {
              self.render();
            } else {
              self.render('home');
            }
          });
        }
      }
    });

  });
});
