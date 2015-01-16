Template.previousPlayerListItem.helpers({
	isChecked: function() {
		if(InviteList.find({email : this.email}).count() === 0)
      checkedValue = "";
    else
      checkedValue = "checked";

		return checkedValue;
	}
})

Template.previousPlayerListItem.events({
  'click .playerCheckbox' : function(e,t) {
    if($(t.find('.playerCheckbox')).is(':checked'))
    {
      if(InviteList.find({email : t.data.email}).count() === 0)
        InviteList.insert(t.data);
    } else {
      InviteList.remove({email : t.data.email});
    }
  }
})