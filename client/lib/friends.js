Friends = {};

// Return friends as [{name: XXX, email: XXX}, {name: YYY}, ...]
// `email` is optional
// Ignore inputs where both `name` and `email` are empty
Friends.makeFriends = function (nameInputs, emailInputs) {
  var friends = {};
  _.forEach(nameInputs, function (input) {
    friends[input.id] = {};
    friends[input.id].name = input.value;
  });
  _.forEach(emailInputs, function (input) {
    if (! _.isEmpty(input.value))
      friends[input.id].email = input.value;
  });
  return _.reject(_.values(friends), function (friend) {
    return _.isEmpty(friend.name) && _.isEmpty(friend.email);
  });
};