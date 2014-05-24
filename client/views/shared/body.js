Template.devBody.rendered = function() {
  Session.set('dev-detail', false);
  Session.set('dev-mode', true);
  // getUserLocation();
};

Template.devBody.events({
  "click": function() {
    if(Session.equals("viewing-settings", true)) {
      Session.set("viewing-settings", false);
    } 
  }
});