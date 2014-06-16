Template.invitePreviousPlayers.helpers({
});

Template.invitePreviousPlayers.created = function() {

	if (!RecentlyPlayed.find().count()) {
		playerList = [
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
		this.data.fake = true;
	} else {

		playerList = RecentlyPlayed.find()

		this.data.fake = false;
	}

	this.data.previousPlayers = playerList;
}

Template.invitePreviousPlayers.events({
	"click .back-to-list" : function(evt,tmpl) {
		evt.preventDefault();
		Session.set("invite-previous-players", false);
	},
	"click #invite-all-checkbox" : function(evt, tmpl) {
		// check invite all
		if($('#invite-all-checkbox').is(":checked")) {
			console.log('invite all checked');
			tmpl.data.previousPlayers[0].player.checked = true;
			console.log(tmpl.data.previousPlayers);

		} else // invite all unchecked
		{
			console.log('invite all unchecked');
		}
	}
});

Template.invitePreviousPlayers.rendered = function() {
	$(window).scrollTop(0);
}