
Template.invitePreviousPlayers.events({
	"click .back-to-list" : function(evt,templ) {
		evt.preventDefault();
		Session.set("invite-previous-players", false);
	}
});