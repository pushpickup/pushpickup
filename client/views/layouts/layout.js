Template.devLayout.created = function () {
  Session.set("dev-mode", true);
};

Template.layout.created = function () {
  Session.set("dev-mode", false);
  Session.set('dev-detail', false);
};