UserSubs.allow
  remove: (userId, doc) ->
    userId is doc.userId
