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
    gameId = Games.insert _.extend(game, createdBy: userId)
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
  "dev.unauth.addPlayer": (gameId, email, name) ->
    emailOwner = Meteor.users.findOne({'emails.address': email})
    if _.find(emailOwner?.emails, (e) -> (e.address is email) and e.verified)
      throw new Meteor.Error 403,
        "Someone has already added and verified that email address"
    else
      if emailOwner
        # email is in system but unverified. remove it before proceeding.
        Meteor.users.update emailOwner?._id,
          $pull: emails: address: email
      password = strange.password()
      userId = Accounts.createUser
        email: email
        password: password
        profile: name: name
      Games.update gameId,
        $push: players: name: name, userId: userId, rsvp: "in"
      maybeMakeGameOn gameId
      # TODO send a combined verification and password reset email
      Accounts.sendVerificationEmail userId, email
      password: password
  "addUserSub": (types, days, region) ->
    self = this
    user = Meteor.users.findOne(self.userId)
    unless _.find(user?.emails, (e) -> e.verified?)
      throw new Meteor.Error 401,
        "You must add an email address to your account and verify it."
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

Meteor.startup ->
  adverbs = _.string.lines(Assets.getText("positive-adverbs-that-are-adjectives-without-ly.txt"))
  leader_words = _.string.lines Assets.getText "leader-synonyms.txt"
  things = _.string.lines Assets.getText "things-plurals.txt"
  adjectives = _.map adverbs, (adv) -> adv.slice(0,-2)

  console.log "blank things!" if _.any things, _.string.isBlank
  console.log "blank adverb!" if _.any adverbs, _.string.isBlank
  console.log "blank noun!" if _.any leader_words, _.string.isBlank


