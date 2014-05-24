Template.devHelpAndFeedback.events({
  "submit form": function (event, template) {
    event.preventDefault();
    Meteor.call("sendFeedback", {
      type: template.find("input[type=radio]:checked").value,
      message: template.find("textarea").value
    });
  }
});