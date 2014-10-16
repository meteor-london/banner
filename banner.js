/*
   _____   _________________________________________   __________
  /     \  \_   _____/\__    ___/\_   _____/\_____  \  \______   \
 /  \ /  \  |    __)_   |    |    |    __)_  /   |   \  |       _/
/    Y    \ |        \  |    |    |        \/    |    \ |    |   \
\____|__  //_______  /  |____|   /_______  /\_______  / |____|_  /
        \/         \/                    \/         \/         \/

   _____   _________________________________ ____ ___ __________
  /     \  \_   _____/\_   _____/\__    ___/|    |   \\______   \
 /  \ /  \  |    __)_  |    __)_   |    |   |    |   / |     ___/
/    Y    \ |        \ |        \  |    |   |    |  /  |    |
\____|__  //_______  //_______  /  |____|   |______/   |____|
        \/         \/         \/

__________    _____    _______    _______   _____________________
\______   \  /  _  \   \      \   \      \  \_   _____/\______   \
 |    |  _/ /  /_\  \  /   |   \  /   |   \  |    __)_  |       _/
 |    |   \/    |    \/    |    \/    |    \ |        \ |    |   \
 |______  /\____|__  /\____|__  /\____|__  //_______  / |____|_  /
        \/         \/         \/         \/         \/         \/

*/

Banners = new Mongo.Collection('banners')

Banners.allow({
  insert: function () { return true },

  update: function (userId, doc, fieldNames, modifier) {
    if (fieldNames.length != 2) return false
    if (fieldNames.some(function(item){ return item === 'count'}) &&
      fieldNames.some(function(item){ return item === 'updatedAt'})) {
        return true
      }
      return false
  }
})

if (Meteor.isClient) {

  Session.setDefault('strapline', '')
  Session.setDefault('logo', false)

  var logo = new Image()
  logo.src = '/img/meteor-logo-light.png'
  logo.onload = function(){
    //TODO: Force a re-render one the image has loaded
    Session.set('logo', true)
  }

  Template.bannerEditor.events({
    'keydown input': debounce(function (evt, tpl) {
      var strapline = tpl.find('.strapline-input').value
      Session.set('strapline', strapline)
      // console.log('keydown', strapline, tpl.find('.strapline-input'))
    }, 250),

    'submit': function (evt) {
      evt.preventDefault()
      // force people to press the button, otherwise it's too easy to spam
    },

    'click .btn-meteor': function (evt, tpl) {
      if (!Session.get('strapline')) return;

      var bannerDoc = Banners.findOne({strapline: Session.get('strapline')})

      if (bannerDoc) {
        Banners.update(bannerDoc._id, {$set: {'updatedAt': Date.now()}, $inc: { count: 1 } })
      } else {
          bannerDoc = {
            strapline:Session.get('strapline'),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            count:1
          }
          Banners.insert(bannerDoc)
      }
    }
  })

  Template.bannerEditor.helpers({
    dataUri: function(){
      return drawBanner(Session.get('strapline'), Session.get('logo'))
    },
    filename: function () {
      return 'meteor-' + Session.get('strapline').toLowerCase() + '-banner.png'
    }
  })

  Template.recent.helpers({
    banners: function () {
      return Banners.find({}, {sort: [['updatedAt', 'desc']]})
    },
    dataUri: function (strapline) {
      return drawBanner(strapline, Session.get('logo'))
    }
  })

  function drawBanner (strapline, logoReady) {

    var canvas = document.getElementById('banner-canvas')
    if(!canvas) return
    var ctx = canvas.getContext('2d')

    // draw a black box
    ctx.fillStyle = '#000000'
    ctx.fillRect(0,0,canvas.width, canvas.height)

    //  Add the logo
    ctx.drawImage(logo, (canvas.width / 2) - 121,  20)

    // Add the custom strapline
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#3C5471'
    ctx.font = '400 30px Roboto, sans-serif'
    ctx.fillText(strapline, (canvas.width / 2) + 8, 89);

    // console.log('drawBanner', strapline)
    return canvas.toDataURL('image/png')
  }

  // https://remysharp.com/2010/07/21/throttling-function-calls
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    }
  }

  Meteor.subscribe('banners', 3)
}

if (Meteor.isServer) {
  Meteor.publish('banners', function (limit) {
    check(limit, Number)

    return Banners.find({}, {limit: limit, sort: [['updatedAt', 'desc']]})
  })
}
