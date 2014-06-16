Template.devEditableGame.helpers({
  selectType: function () {
    var self = this;
    var them = GameOptions.find({option: "type"}).map(function (type) {
      return {
        value: type.value,
        text: type.value,
        checked: (type.value === self.type),
        name: 'gameTypeGroup'
      };
    });
    return {id: 'gameType', options: them};
  },

  playerInviteCount : function() {
    console.log(InviteList.find().count());
    return InviteList.find().count();
  },

  selectPlayersRequested: function () {
    var self = this;
    var numRequested = self.requested && self.requested.players || 10;
    var them =  _.map(_.range(2, 29, 2), function (i) {
      return { value: i, text: i, selected: (i === numRequested) };
    });
    return {includeLabel: true,
            label: "Players needed", id: "requestedNumPlayers", containerClass: "num-players-container",
            options: them};
  },
  editingGame: function () {
    return this.title === "Edit game";
  },
  addingGame: function() {
    return this.action === 'add';
  },
  atLeastOnePlayer: function () {
    return this.players && (! _.isEmpty(this.players));
  }
});

Template.devEditableGame.events({
  "change #gameDay": function (evt, templ) {
    Session.set("newGameDay", +evt.currentTarget.value);
    Deps.flush(); // update selectable game times immediately
  },
  "change #gameTime": function (evt, templ) {
    Session.set("newGameTime", +evt.currentTarget.value);
  },
  "click #invite-players-link": function (evt, templ) {
    evt.preventDefault();
    Session.set("invite-previous-players", true);
  },
  "submit #editGameForm": function (evt, templ) {
    var self = this;
    evt.preventDefault();
    var markedIds = $(templ.findAll(".gamePlayers input:checked"))
          .map(function () { return this.value; }).get();
    var remainingPlayers = _.reject(self.players, function (p) {
      return _.contains(markedIds, p.userId || (! p.userId) && p.friendId);
    });

    var game = {
      type: templ.find("#gameType input:checked").value,
      // status depends on (requested.players - players.length)
      startsAt: new Date(+templ.find("#gameTime").value),
      location: {
        name: Location.simplifyLocation(templ.find(".select-location input").value),
        geoJSON: Session.get("selectedLocationPoint")
          || Games.findOne(self._id).location.geoJSON
      },
      note: templ.find("#gameNote").value,
      players: remainingPlayers,

      // for now, no editing comments (simulate an email-list dynamic)
      comments: self.comments,

      requested: selectorValuesFromTemplate({
        players: ["#requestedNumPlayers", asNumber]
      }, templ)
    };

    var utc_offset = Session.get("selectedLocationUTCOffset")
          || Games.findOne(self._id).location.utc_offset;
    if (utc_offset) {
      game.location.utc_offset = utc_offset;
    }

    Meteor.call("editGame", self._id, game);
    Router.go('devDetail', {_id: self._id});
  },
  "keypress .select-location input": function (event, template) {
    if (event.which === 13) { // <RET> pressed
      // submit triggered from location field
      // event.stopImmediatePropagation() and event.preventDefault()
      return false;
    }
    return true;
  },
  "submit #addGameForm": function (event, template) {
    event.preventDefault();
    if (Session.equals("waiting-on", "add")) {
      return;
    } else {
      Session.set("waiting-on", "add");
    }
    Alerts.clearSeen({where: "editableGame"});
    var game = {
      type: template.find("#gameType input:checked").value,
      // status depends on requested.players
      startsAt: new Date(+template.find("#gameTime").value),
      location: {
        name: Location.simplifyLocation(template.find(".select-location input").value),
        geoJSON: Session.get("selectedLocationPoint")
      },
      note: template.find("#gameNote").value,
      players: [],
      comments: [],
      requested: selectorValuesFromTemplate({
        players: ["#requestedNumPlayers", asNumber]
      }, template)
    };
    if (game.requested.players === 0) {
      game.status = "on";
    } else {
      game.status = "proposed";
    }
    if (Session.get("selectedLocationUTCOffset")) {
      game.location.utc_offset = Session.get("selectedLocationUTCOffset");
    }
    try {
      check(game, ValidGame);
    } catch (e) {
      if (e instanceof Match.Error) {
        console.log(e.message);
        var result = /Match error: (.*) in field (.*)/.exec(e.message);
        if (result[2] === 'location.name') {
          Alerts.throw({
            message: "Your game location needs a name.",
            type: "danger", where: "editableGame"
          });
        } else if (result[2] === 'location.geoJSON') {
          Alerts.throw({
            message: "Your game needs a location. A map will appear when you've selected one.",
            type: "danger", where: "editableGame",
            autoremove: 5000
          });
        } else {
          Alerts.throw({
            message: e.message, type: "danger", where: "editableGame"
          });
        }
      } else {
        Alerts.throw({
          message: "Hmm, something went wrong. Try again?",
          type: "danger", where: "editableGame"
        });
      }
      // TODO: fold Session.set("waiting-on", null) calls into a single
      // Deps.autorun that nullifies "waiting-on" whenever there are
      // unseen Alerts because just-thrown Alerts implies error
      // or success of form action.
      Session.set("waiting-on", null);
      return;
    }

    var playing = !! template.find("input[type=checkbox].playing:checked");

    var addedAlert = {
      message: "Game added! Check your email and be sure to forward "
        + " the invitation to your friends.",
      type: "success"
      // add "where" when game _id is available
    };

    if (! Meteor.userId()) {
      var email = template.find("input.email").value;
      var fullNameInput = template.find("input.full-name");
      if (fullNameInput) { // new user
        var fullName = fullNameInput.value;
        if (! Alerts.test(Alertables.signUp(email, fullName),
                          {type: "danger", where: "editableGame"})) {
          Session.set("waiting-on", null);
          return;
        }
        Meteor.call("dev.unauth.addGame", email, fullName, game, function (error, result) {
          if (!error) {
            Meteor.loginWithPassword(email, result.password, function (error) {
              if (!error) {
                playing && Meteor.call("addSelf", {
                  gameId: result.gameId,
                  name: fullName
                }, function (err) {
                  if (!err) {
                    Session.set("joined-game", result.gameId);

                  }
                });
              }
            });
            Meteor.call("sendForwardableInvite", result.gameId);
            Alerts.throw(_.extend({where: result.gameId}, addedAlert));
            Session.set("strange-passwd", result.password);
            Router.go('devDetail', {_id: result.gameId});
            window.scrollTo(0,0);
          } else {
            // typical error: email in use
            console.log(error);
            if (error instanceof Meteor.Error) {
              Alerts.throw({
                message: error.reason,
                type: "danger", where: "editableGame"
              });
            } else {
              Alerts.throw({
                message: "Hmm, something went wrong. Try again?",
                type: "danger", where: "editableGame"
              });
            }
            Session.set("waiting-on", null);
          }
        });
      } else { // attempt to sign in, add game, and possibly invite friends
        var password = template.find("input.password").value;
        if (! Alerts.test(Alertables.signIn(email, password),
                          {type: "danger", where: "editableGame"})) {
          Session.set("waiting-on", null);
          return;
        }
        Meteor.loginWithPassword(email, password, function (error) {
          if (!error) {
            Meteor.call("addGame", game, function (error, result) {
              if (!error) {
                playing && Meteor.call("addSelf", {
                  gameId: result.gameId
                }, function (err) {
                  if (!err) {
                    Session.set("joined-game", result.gameId);
                    Alerts.throw({
                      message: "You've joined this game -- be sure to invite your friends!",
                      type: "success", where: game._id,
                      autoremove: 5000
                    });
                  }
                });
                Router.go('devDetail', {_id: result.gameId});
                Meteor.call("sendForwardableInvite", result.gameId);
                Alerts.throw(_.extend({where: result.gameId}, addedAlert));
                window.scrollTo(0,0);
              } else {
                console.log(error);
                Alerts.throw({
                  message: "Hmm, something went wrong: \""
                    + error.reason + "\". Try again?",
                  type: "danger",
                  where: "editableGame"
                });
                Session.set("waiting-on", null);
              }
            });
          } else {
            console.log(error);
            // typical error.reason: "User not found" or "Incorrect password"
            Alerts.throw({
              message: error.reason, type: "danger", where: "editableGame"
            });
            Session.set("waiting-on", null);
          }
        });
      }
    } else { // authenticated user
      Meteor.call("addGame", game, function (error, result) {
        if (!error) {
          playing && Meteor.call("addSelf", {
            gameId: result.gameId
          }, function (err) {
            if (!err) {
              Session.set("joined-game", result.gameId);
            }
          });
          Router.go('devDetail', {_id: result.gameId});
          Meteor.call("sendForwardableInvite", result.gameId);
          Alerts.throw(_.extend({where: result.gameId}, addedAlert));
          window.scrollTo(0,0);
        } else {
          console.log(error);
          Alerts.throw({
            message: "Hmm, something went wrong: \""+error.reason+"\". Try again?",
            type: "danger",
            where: "editableGame"
          });
          Session.set("waiting-on", null);
        }
      });
    }
  },
  "click .remove": function (evt, templ) {
    evt.preventDefault();
    if (confirm("Really cancel game? Players will be notified.")) {
      Meteor.call("cancelGame", this._id);
      Router.go('home');
    }
  }
});