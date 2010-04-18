var atndevrecom = {
  oldUri: null,
  today: null,
  events: {},
  
  //// firefox specific functions
  init: function() {
    gBrowser.addProgressListener(atndevrecom.urlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    atndevrecom.today = new Date();
  },

  uninit: function() {
    gBrowser.removeProgressListener(recommend.urlBarListener);
  },

  urlBarListener: {
    QueryInterface: function(aIID) {
      if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
          aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
          aIID.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },

    onLocationChange: function(aProgress, aRequest, aUri) {
      atndevrecom.processNewUrl(aUri);
    },

    onStateChange: function() {},
    onProgressChange: function() {},
    onStatusChange: function() {},
    onSecurityChange: function() {},
    onLinkIconAvailable: function() {}
  },

  processNewUrl: function(aUri) {
    if (aUri.spec == atndevrecom.oldUrl)
      return;
    atndevrecom.checkCurrentUri(gBrowser.selectedBrowser.contentDocument.location.href);
    atndevrecom.oldUrl = aUri.spec; 
  },

  show: function() {
    atndevrecom.clearPanel();
    var html = '<div id="atndevrecom-results" xmlns="http://www.w3.org/1999/xhtml">'
               + '<ul>';
    for (var i in atndevrecom.events)
      html += '<li><span onclick="atndevrecom.openNewTab(\'' + atndevrecom.events[i].event_url + '\')">'
        + atndevrecom.events[i].title + '</span></li>';
    html += '</ul></div>';
    var fragment = document.createRange().createContextualFragment(html);
    document.getElementById('atndevrecom-popup-div').appendChild(fragment);
    document.getElementById('atndevrecom-popup-panel').openPopup(document.getElementById('atndevrecom-icon'), 'before_end', -1, -1, false);
  },

  clearPanel: function() {
    var div = document.getElementById('atndevrecom-popup-div');
    while (div.firstChild)
      div.removeChild(div.firstChild);      
  },

  openNewTab: function(uri) {
    document.getElementById('atndevrecom-popup-panel').hidePopup();
    gBrowser.selectedTab = gBrowser.addTab(uri);
  },

  //// extension specific functions
  checkCurrentUri: function(currentUri) {
    atndevrecom.clearEventList();
    var res = currentUri.match(/^http:\/\/atnd\.org\/events\/([0-9]+)/i);
    if (res)
      atndevrecom.getUserList(res[1]);
  },

  getUserList: function(eventId) {
    var url = "http://api.atnd.org/events/users/?format=json&count=100&event_id=" + eventId;
    var xhr = new XMLHttpRequest();
    var users = [];
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var res = JSON.parse(xhr.responseText);
        for (var i=0; i<res.events[0].users.length; i++)
          users.push(res.events[0].users[i].user_id);
        atndevrecom.getEventList(users, eventId);
      }
    };
    xhr.open('GET', url, true);
    xhr.send(null);
  },

  getEventList: function(users, originalEventId) {
    var url = "http://api.atnd.org/events/?format=json&count=100&user_id=";
    for (var i=0; i<5; i++) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = onready(xhr, users[i]);
      xhr.open('GET', url + users[i], true);
      xhr.send(null); 
    }

    function onready(xhr, user) {
      return function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var res = JSON.parse(xhr.responseText);
          for (var j=0; j<res.events.length; j++) {
            var startDate = new Date(res.events[j].started_at);
            if (atndevrecom.today < startDate && res.events[j].event_id != originalEventId)
              if (atndevrecom.events[res.events[j].event_id]) {
                atndevrecom.events[res.events[j].event_id].count += 1;
              } else {
                atndevrecom.events[res.events[j].event_id] = res.events[j];
                atndevrecom.events[res.events[j].event_id].count = 1;
              }
          }
        }
      };
    };
  },

  clearEventList: function() {
    atndevrecom.events = {};
  }
};

window.addEventListener("load", atndevrecom.init, false);
