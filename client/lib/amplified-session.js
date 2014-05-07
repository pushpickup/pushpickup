AmplifiedSession = _.extend({}, Session, {
    keys: _.object(_.map(amplify.store(), function (value, key) {
        return [key, JSON.stringify(value)];
    })),
    set: function (key, value) {
        Session.set.apply(this, arguments);
        amplify.store(key, value);
    }
});