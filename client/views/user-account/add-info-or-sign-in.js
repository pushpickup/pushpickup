Template.addInfoOrSignIn.helpers({
  email: function () { return Session.get("sign-in.email"); }
});

Template.addInfoOrSignIn.events({
  "click .sign-in": function (evt, templ) {
    Session.set("sign-in.email", templ.find("input.email").value);
    Session.set("sign-in", true);
  },
  "click .add-info": function (evt, templ) {
    Session.set("sign-in.email", templ.find("input.email").value);
    Session.set("sign-in", false);
  }
});

Template.addInfoOrSignIn.destroyed = function () {
  Session.set("sign-in.email", undefined);
  Session.set("sign-in", false);
};