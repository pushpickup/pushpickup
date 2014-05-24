Template.addComment.events({
  "submit form.add-comment": function (event, template) {
    event.preventDefault();
    var self = this;
    Alerts.clearSeen({where: "addComment"});
    var comment = template.find("input.comment").value;
    if (! Alerts.test(Alertables.comment(comment),
                      {type: "danger", where: "addComment"})) {
      return;
    }
    if (! Meteor.userId()) {
      Session.set("unauth-comment", comment);
    } else {
      Meteor.call("addComment", comment, self._id);
      $('input.comment').val('').blur();
    }
  }
});

Template.addComment.destroyed = function () {
  Session.set("unauth-comment", null);
};