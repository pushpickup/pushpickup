Template.invitePreviousPlayers.helpers({
	
	isFakeData: function() {
		return true;
	},

	previousPlayers : function() {
		prevPlayers = [
			{
				checked : false,
				name : "Jimmy Fallon",
				email : "jimmy@example.com"
			},
			{
				checked : false,
				name : "Miche Capionelli",
				email : "miche.baller@example.com"
			},
			{
				checked : false,
				name : "Jason Pettetti",
				email : "jason@example.com"
			},
			{
				checked : false,
				name : "Laura Scheumaker",
				email : "l.scheumdizzle@example.com"
			},
			{
				checked : false,
				name : "Liz Lemon",
				email : "liz.lemon22@example.com"
			},
			{
				checked : false,
				name : "Jeremy Miller-Schneider",
				email : "jeremy-miller.schneider@example.com"
			}
		];
		return prevPlayers;
	}
});

Template.invitePreviousPlayers.events({
	"click .back-to-list" : function(evt,tmpl) {
		evt.preventDefault();
		Session.set("invite-previous-players", false);
	},
	"click #invite-all-checkbox" : function(evt, tmpl) {
		
		// check invite all
		if($('#invite-all-checkbox').is(":checked")) {

			console.log(tmpl);

		} else // invite all unchecked
		{



		}


	}
});

Template.invitePreviousPlayers.rendered = function() {
}