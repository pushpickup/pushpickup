Template.settingsItem.helpers({
  title: function () {
    return _.string.titleize(_.string.humanize(this.name))
      .replace('And','&');
  },
  isSetting: function () {
    return Session.get("settings-" + this.name);
  },
  action: function () {
    return Template[_.string.camelize("dev-"+this.name)];
  }
});