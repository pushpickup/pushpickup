Template.devChangeLocation.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Session.set('get-user-location', 'get');
  }
});