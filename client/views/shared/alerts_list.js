// Rather than using the meteorAlerts template via `{{> meteorAlerts}}`,
// render and return it as another template's helper.
// For example:
//
// <template name="game">
//   {{{alerts}}}
// </template>
//
// Template.game.alerts = function () {
//   var self = this;
//   return Template.meteorAlerts({where: self._id});
// };
//
// You can use Notifications to highlight invalid inputs.
// For example:
//
// <template name="signIn">
//   <form role="form">
//     <div class="form-group {{error}}">
//       <input type="text" class="login form-control"
//              placeholder="Username or Email" required autofocus>
//       <input type="password" class="password form-control"
//              placeholder="Password" required>
//     </div>
//     {{{alerts}}}
//     <button class="btn btn-primary" type="submit">Sign in</button>
//   </form>
// </template>
//
// Template.signIn.error = function () {
//   return (Notifications.findOne({where: "signIn"})) ? "has-error": "";
// };
//
// You can tidy up after a template has been destroyed:
//
// Template.editablePlayer.destroyed = function () {
//   Notifications.remove({where: "editablePlayer"});
// };
//
// and tidy up whenever a new route is rendered, e.g. using iron-router:
//
// Router.before(function() { Alerts.clearSeen(); });
//
// To automatically remove an alert after N milliseconds, include
// `autoremove: N` as a property of the argument to Alert.throw()
//
// For form input validation, you can clear alerts on resubmission by
// including, for example, the following line at the top of a "submit form"
// event:
//
// Notifications.remove({where: "signIn", seen: true});

Template.meteorAlerts.helpers({
  alerts: function(where) {
    return Notifications.find({where: where});
  }
});

Template.meteorAlerts.events({
  'click button.close': function (event) {
    var self = this;
    Notifications.remove(self._id);
  }
});

// Markdown->HTML
var converter = new Showdown.converter();

Template.meteorAlert.helpers({
  message: function() {
    var self = this;
    var message = _.escape(self.message);
    return converter.makeHtml(message);
  }
});

Template.meteorAlert.rendered = function() {
  var alert = this.data;
  Meteor.defer(function() {
    Notifications.update(alert._id, {$set: {seen: true}});
    if (alert.autoremove) {
      Meteor.setTimeout(function () {
        Notifications.remove(alert._id);
      }, alert.autoremove);
    }
  });
};
