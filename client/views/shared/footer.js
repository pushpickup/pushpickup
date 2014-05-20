Template.devFooter.helpers({
  omit: function () {
    var self = this;
    // Use data contexts supplied by add-game and edit-game routes
    // to omit footer (i.e., Privacy Policy) for those views.
    return (self.action && self.action === 'edit') ||
      (self.action && self.action === 'add');
  }
});