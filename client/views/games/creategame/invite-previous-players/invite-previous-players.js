Template.invitePreviousPlayers.helpers({

	fake: function() {
		if(RecentlyPlayed.find().count())
			return false;
		else
			return true;
	},

	previousPlayers : function() {
		if(RecentlyPlayed.find().count())
			playerList = RecentlyPlayed.find();
		else
			playerList = fakePlayerList;

		return playerList;

	}
});

Template.invitePreviousPlayers.created = function() {
	if (!RecentlyPlayed.find().count()) {
		fakePlayerList = [
			{
				checked : false,
				player: {
					name : "Jimmy Fallon",
					email : "jimmy@example.com"	
				}
			},
			{
				checked : false,
				player: {
					name : "Miche Capionelli",
					email : "miche.baller@example.com"
				}
			},
			{
				checked : false,
				player: {
					name : "Jason Pettetti",
					email : "jason@example.com"
				}
			},
			{
				checked : false,
				player: {
					name : "Laura Scheumaker",
					email : "l.scheumdizzle@example.com"
				}
			},
			{
				checked : false,
				player: {
					name : "Liz Lemon",
					email : "liz.lemon22@example.com"
				}
			},
			{
				checked : false,
				player: {
					name : "Jeremy Miller-Schneider",
					email : "jeremy-miller.schneider@example.com"
				}
			}
		];
	}
}

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
	$(window).scrollTop(0);
}