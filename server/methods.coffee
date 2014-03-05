# populated at server startup
adverbs = []
leader_words = []
things = []
adjectives = []

strange =
  username: (name) ->
    tries = 0
    loop
      noun = if name
        _.string.slugify(name)
      else
        Random.choice(leader_words)
      uname = _.string.join "-",
        Random.choice(adverbs), Random.choice(adjectives), noun
      break unless Meteor.users.findOne username: uname
      tries += 1
      console.log "#{tries} tries for strange.username!" if tries > 10
    uname
  password: () ->
    _.string.join "-", _.random(10,99),
      Random.choice(adverbs), Random.choice(adjectives), Random.choice(things)

tentativeUserInfo = (username, password) ->
  "Your username is #{username} and your password is #{password}."

alertWithin = (gameId, message) ->
  console.log message

Meteor.methods
  "unauthenticated.addGame": (game) ->
    [username, password] = [strange.username(), strange.password()]
    userId = Accounts.createUser username: username, password: password
    gameId = Games.insert _.extend(game,
      creator: {name: username, userId: userId})
    username: username, password: password, gameId: gameId
  "unauthenticated.addPlayer": (gameId, name) ->
    [username, password] = [strange.username(name), strange.password()]
    userId = Accounts.createUser
      username: username
      password: password
      profile: name: name
    Games.update gameId,
        $push: players: name: name, userId: userId, rsvp: "in"
    maybeMakeGameOn gameId
    username: username, password: password
  "addUserEmail": (email) ->
    self = this
    emailOwner = Meteor.users.findOne({'emails.address': email})
    if _.find(emailOwner?.emails, (e) -> (e.address is email) and e.verified)
      throw new Meteor.Error 403,
        "Someone has already added and verified that email address"
    else
      # email is in system but unverified. remove it before proceeding.
      Meteor.users.update emailOwner?._id,
        $pull: emails: address: email
      Meteor.users.update self.userId,
        $push: emails: address: email, verified: false
      Accounts.sendVerificationEmail self.userId, email
      "ok"
  "dev.addSelf.addFriends": (friends, gameId) ->
    Meteor.call "addPlayer", gameId
    Meteor.call "dev.addFriends", friends, this.userId, gameId
    "ok"
  "dev.unauth.addPlayers": (gameId, email, name, friends) ->
    adder = Meteor.call "dev.unauth.addPlayer", gameId, email, name
    Meteor.call "dev.addFriends", friends, adder.userId, gameId
    adder # client may want adder.password to loginWithPassword

  # This method, which sends no verification email, is intended to compose
  # with another method that *will* send a verification email
  "dev.addUser": (email, name) ->
    check(email, ValidEmail)
    check(name, NonEmptyString)
    emailOwner = Meteor.users.findOne({'emails.address': email})
    if _.find(emailOwner?.emails, (e) -> (e.address is email) and e.verified)
      throw new Meteor.Error 403,
        "Someone has already added and verified that email address"
    if emailOwner
      # email is in system but unverified. remove it before proceeding.
      Meteor.users.update emailOwner?._id,
        $pull: emails: address: email
    password = strange.password()
    userId = Accounts.createUser
      email: email
      password: password
      profile: name: name
    userId: userId, password: password

  "dev.signUp": (email, name, password) ->
    check(email, ValidEmail)
    check(name, NonEmptyString)
    check(password, ValidPassword)
    emailOwner = Meteor.users.findOne({'emails.address': email})
    if _.find(emailOwner?.emails, (e) -> (e.address is email) and e.verified)
      throw new Meteor.Error 403,
        "Someone has already added and verified that email address"
    if emailOwner
      # email is in system but unverified. remove it before proceeding.
      Meteor.users.update emailOwner?._id,
        $pull: emails: address: email
    userId = Accounts.createUser
      email: email
      password: password
      profile: name: name
    Accounts.sendVerificationEmail userId, email
    "ok"
  "dev.unauth.addGame": (email, name, game) ->
    newUser = Meteor.call "dev.addUser", email, name
    this.setUserId(newUser.userId)
    game = Meteor.call "addGame", game
    # TODO: email thanks user for adding game
    Accounts.sendEnrollmentEmail newUser.userId, email
    _.extend(newUser, game) # {userId, password, gameId}
  "dev.unauth.addPlayer": (gameId, email, name) ->
    newUser = Meteor.call "dev.addUser", email, name
    Games.update gameId,
      $push: players: name: name, userId: newUser.userId, rsvp: "in"
    maybeMakeGameOn gameId
    # TODO: indicate in enrollment email that either they or a friend
    # may have added them to a game
    Accounts.sendEnrollmentEmail newUser.userId, email
    newUser
  "dev.unauth.addCommenter": (gameId, email, name, comment) ->
    newUser = Meteor.call "dev.addUser", email, name
    this.setUserId(newUser.userId)
    Meteor.call "addComment", comment, gameId
    # TODO: indicate in enrollment email that either they or a friend
    # may have added them to a game
    Accounts.sendEnrollmentEmail newUser.userId, email
    newUser
  "dev.unauth.addUserSub": (email, name, types, days, region) ->
    newUser = Meteor.call "dev.addUser", email, name
    this.setUserId(newUser.userId)
    Meteor.call "addUserSub", types, days, region
    # TODO convert below to Meteor method that uses this.unblock()
    Accounts.sendEnrollmentEmail newUser.userId, email
    newUser
  "dev.addFriends": (friends, userId, gameId) ->
    for friend in friends
      Meteor.call "dev.addFriend", friend, userId, gameId
    "ok"
  "dev.addFriend": (friend, userId, gameId) ->
    if _.isEmpty friend.email
      Games.update gameId,
        $push: players: name: friend.name, friendId: userId, rsvp: "in"
    else
      emailOwner = Meteor.users.findOne({'emails.address': friend.email});
      if emailOwner
        unless Games.findOne({_id: gameId, 'players.userId': emailOwner._id})
          Games.update gameId,
            $push: players:
              name: friend.name
              friendId: userId
              userId: emailOwner._id
              rsvp: "in"
      else
        newUserId = Accounts.createUser
          email: friend.email
          profile: name: friend.name
        Games.update gameId,
          $push: players:
            name: friend.name
            friendId: userId
            userId: newUserId
            rsvp: "in"
        sendEnrollmentEmail newUserId, friend.email, "addedAsFriend",
          gameId: gameId, adderId: userId
    maybeMakeGameOn gameId
  "addUserSub": (types, days, region) ->
    self = this
    user = Meteor.users.findOne(self.userId)
    # `sendGameAddedNotification` sends only to verified email addresses,
    # so don't need to check for verified email address here.
    return false if not user
    check types, [GameType]
    check days, [Day]
    check region, GeoJSONPolygon
    days = [0,1,2,3,4,5,6] if _.isEmpty days
    types = _.pluck(GameOptions.find(option: "type").fetch(), 'value') if _.isEmpty types
    UserSubs.insert
      userId: self.userId
      types: types
      days: days
      region: region
  # Email game participants who wish to be notified of each new comment
  # Takes a game _id and the timestamp of the new comment
  "notifyCommentListeners": (gameId, cTimestamp) ->
    this.unblock() # sending email can take a while
    # For now, just notify the game creator
    game = Games.findOne(gameId)
    comment = _.find(game?.comments, (c) -> +c.timestamp is +cTimestamp)
    return false if not game or not comment
    return false if comment.userId is game.creator.userId
    creator = Meteor.users.findOne(game.creator.userId)
    Email.send
      from: "support@pushpickup.com"
      to: "#{creator.profile.name} <#{creator.emails[0].address}>"
      subject: "New comment/question on your " +
        moment(game.startsAt).format('ddd h:mma') +
        " #{game.type} game"
      text: "#{comment.userName} just said: \"#{comment.message}\".\n" +
        "For your reference, below is a link to your game.\n\n" +
        "#{Meteor.absoluteUrl('dev/g/'+gameId)}\nThanks for organizing."

Meteor.startup ->
  adverbs = _.string.lines(Assets.getText("positive-adverbs-that-are-adjectives-without-ly.txt"))
  leader_words = _.string.lines Assets.getText "leader-synonyms.txt"
  things = _.string.lines Assets.getText "things-plurals.txt"
  adjectives = _.map adverbs, (adv) -> adv.slice(0,-2)

  console.log "blank things!" if _.any things, _.string.isBlank
  console.log "blank adverb!" if _.any adverbs, _.string.isBlank
  console.log "blank noun!" if _.any leader_words, _.string.isBlank


