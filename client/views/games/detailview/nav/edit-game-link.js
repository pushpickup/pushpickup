Template.editGameLink.helpers({
  canEdit: function () {
    var user = Meteor.user();
    if (user) {
      return user._id === this.creator.userId || user.admin;
    } else {
      return false;
    }
  }
});