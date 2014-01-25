sendGameAddedNotification = (user, gameId, game) ->
  # may need to wrap the _.find in _.chain below, or similar
  email = _.find(user.emails, (e) -> e.verified)?.address
  if email then Email.send
    from: "support@pushpickup.com"
    to: "#{user.profile.name} <#{email}>"
    subject: "Game #{game.status}: #{game.type} " +
      "#{moment(game.startsAt).format('dddd h:mmA')} at " +
      "#{game.location.name}"
    text: "#{user.profile.name},\n" +
      "Want to join in? Below is a link to the game.\n\n" +
      "#{Meteor.absoluteUrl('games/'+gameId)}\nThanks for helping to push pickup."

userSubQuery = (game) ->
  types: game.type
  days: moment(game.startsAt).day()
  region: {$geoIntersects: {$geometry: game.location.geoJSON}}


observers.gameAddedNotifier = ->
  Games.find(notificationsSent: $exists: false).observeChanges
    added: (id, fields) ->
      console.log "game added. preparing notifications..."
      subs = UserSubs.find(userSubQuery(fields),
        {fields: {userId: 1}}).fetch()
      userIds = _.uniq(_.pluck(subs, 'userId'))
      users = _.map userIds, (id) -> Meteor.users.findOne(id)
      console.log "notifying users: #{_.map users, (u) -> u.profile.name}"
      _.forEach users, (user) ->
        if user then sendGameAddedNotification(user, id, fields)
      Games.update id, $set: notificationsSent: true
