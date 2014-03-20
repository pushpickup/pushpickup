# Push Pickup

A passion project by [Donny Winston](http://www.linkedin.com/pub/donny-winston/8/951/552) and Stewart McCoy [@stewartmccoy](http://twitter.com/stewartmccoy).

Stewart would love if you emailed him at mccoy dot stewart at gmail dot com.

For more background on the motivation for this project, read: [A better way to organize pickup sports](http://stewartmccoy.com/a-better-way-to-organize-pickup-sports/)

For my original thinking on app design, check out: [PlayMakers Pickup Sports App](http://stewartmccoy.com/playmakers-pickup-sports-app/)

## Development

This project uses [Meteor](http://www.meteor.com) and [Meteorite](http://oortcloud.github.io/meteorite/). To start hacking,

    curl https://install.meteor.com/ | sh
    # fork this repo if you want to contribute commits, but you can also just...
    git clone https://github.com/dwinston/pushpickup.git
    cd pushpickup
    # Install nodejs first if `which npm` returns nothing
    npm install -g meteorite # or `sudo -H npm install -g meteorite` if permissions error
    mrt install # Meteorite installs third-party smart packages
    meteor --settings settings.json.example # load example data for development

Load `http://localhost:3000/` in your browser and play around.

The `devel` branch is the "stable" edge, from which feature branches (such as `new-mobile-rough`) are created and merged, and corresponds to what is (or should be) up at [pushpickup.meteor.com](http://pushpickup.meteor.com)

The `master` branch corresponds to what is (or should be) up at [pushpickup.com](http://pushpickup.com).

If you have an issue with the code, please [let us know](https://github.com/dwinston/pushpickup/issues/new). :)
