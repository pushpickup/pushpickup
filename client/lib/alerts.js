Alerts = {
  // Local (client-only) collection
  collection: new Meteor.Collection(null),

  throw: function(obj) {
    check(obj, {
      message: String,
      type: String,
      where: String,
      autoremove: Match.Optional(Number)
    });
    return Alerts.collection.insert({
      message: obj.message, type: obj.type,
      where: obj.where, seen: false,
      autoremove: obj.autoremove
    });
  },
  clearSeen: function() {
    Alerts.collection.remove({seen: true});
  }
};
