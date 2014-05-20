Template.comments.helpers({
  numComments: function () {
    return (this.comments.length === 0) ? "No" : this.comments.length;
  },
  comments: function () {
    var self = this;
    return _.map(self.comments, function (comment) {
      return _.extend({gameId: self._id}, comment);
    });
  }
});

Template.comments.events({
  "click .remove-comment": function (event, template) {
    var self = this;
    Meteor.call("removeComment", self);
  }
});