Template.devDetail.rendered = function() {
  Session.set('dev-detail', true)
};

Template.devDetail.events({
  "click .share-game-link a": function () {
    Session.set("copy-game-link", this._id);
  },
  "click .copy-game-link input": function () {
    var copyGameLink = document.getElementById("copyGameLink");
    copyGameLink.selectionStart = 0;
    copyGameLink.selectionEnd = 999;
    copyGameLink.readOnly = true;
  },
  "click .copy-game-link .close": function () {
    Session.set("copy-game-link", null);
  },
  "click .subscribe-after-joined .close": function () {
    Session.set("joined-game", null);
  }
});