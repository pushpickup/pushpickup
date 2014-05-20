// Set several Template.settings.events of the form:
//
// "click .sign-in.trigger": function () {
//   Session.toggle("settings-sign-in");
// }

sessionToggler = function (action) {
  return function () {
    Session.toggle("settings-"+action);
  };
};

