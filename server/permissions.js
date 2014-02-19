UserSubs.allow({
  remove: function (userId, doc) {
    return userId === doc.userId;
  }
});
