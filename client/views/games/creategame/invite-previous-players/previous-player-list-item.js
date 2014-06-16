Template.previousPlayerListItem.helpers({
	isChecked: function() {
		checkedValue = this.checked? "checked" : "";
    console.log(checkedValue);
		return checkedValue;
	}
})

Template.previousPlayerListItem.events({
  'click .playerCheckbox' : function(e,t) {
    if($(t.find('.playerCheckbox')).is(':checked'))
    {
      console.log('player checked: ' + t.data.name);
      if(InviteList.find({email : t.data.email}).count() === 0)
        InviteList.insert(t.data);
    } else {
      console.log('player unchecked: ' + t.data.name);
      InviteList.remove({email : t.data.email});
    }
  }
})