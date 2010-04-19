var atndevrecom = {
  oldUri: null,
  events: {},
  sortingArray: [],
  isActive: false,

  // cache
  today: null,
  statusbar: null,
  activeIconImage: null,
  inactiveIconImage: null,
  loadingImage: null,
    
  //// firefox specific functions
  init: function() {
    gBrowser.addProgressListener(atndevrecom.urlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    atndevrecom.today = new Date();
    atndevrecom.statusbar = document.getElementById('status-bar');
    atndevrecom.activeIconImage = atndevrecom.constructIconImage('chrome://atndevrecom/skin/images/icon16.png');
    atndevrecom.inactiveIconImage = atndevrecom.constructIconImage('chrome://atndevrecom/skin/images/icon16_inactive.png');
    atndevrecom.loadingImage = atndevrecom.constructIconImage('chrome://atndevrecom/skin/images/loading.gif');
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
    if (!atndevrecom.isActive) return;
    document.getElementById('atndevrecom-popup-panel').openPopup(document.getElementById('atndevrecom-icon'), 'before_end', -1, -1, false);
  },

  constructPanel: function() {
    atndevrecom.clearPanel();
    atndevrecom.sortingArray.sort(atndevrecom.cmp);
    var html = '<div id="atndevrecom-results" xmlns="http://www.w3.org/1999/xhtml"><ul>';
    for (var i=0; i<atndevrecom.sortingArray.length; i++) {
      var index = atndevrecom.sortingArray[i].event_id;
      html += '<li><span onclick="atndevrecom.openNewTab(\'' + atndevrecom.events[index].event_url + '\')">'
        + atndevrecom.escapeChars(atndevrecom.events[index].title) + '</span></li>';
    }
    html += '</ul></div>';
    var fragment = document.createRange().createContextualFragment(html);
    document.getElementById('atndevrecom-popup-div').appendChild(fragment);
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

  activate: function() {
    atndevrecom.isActive = true;
    atndevrecom.removeIcon();
    atndevrecom.statusbar.appendChild(atndevrecom.activeIconImage);
  },

  deactivate: function() {
    atndevrecom.isActive = false;
    atndevrecom.removeIcon();
    atndevrecom.statusbar.appendChild(atndevrecom.inactiveIconImage);
  },

  drawLoading: function() {
    atndevrecom.isActive = false;
    atndevrecom.removeIcon();
    atndevrecom.statusbar.appendChild(atndevrecom.loadingImage);
  },

  constructIconImage: function(src) {
    var iconImage = document.createElement('image');
    iconImage.setAttribute('src', src);
    iconImage.setAttribute('id', 'atndevrecom-icon');
    iconImage.setAttribute('onclick', "atndevrecom.show()");
    iconImage.setAttribute('tooltiptext', 'fix me later');
    return iconImage;
  },

  removeIcon: function() {
    var statusbarIconImage = document.getElementById('atndevrecom-icon');
    if (statusbarIconImage) {
      atndevrecom.statusbar.removeChild(statusbarIconImage);
    }
  },

  //// extension specific functions
  checkCurrentUri: function(currentUri) {
    atndevrecom.clearEventList();
    atndevrecom.clearPanel();
    var res = currentUri.match(/^http:\/\/atnd\.org\/events\/([0-9]+)/i);
    if (res) {
      atndevrecom.getUserList(res[1]);
      atndevrecom.activate();
    } else {
      atndevrecom.deactivate();
    }
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
    var userNum = users.length;

    atndevrecom.drawLoading();

    for (var i=0; i<userNum; i++) {
      var xhr = new XMLHttpRequest();
      xhr.onload= onload(xhr, users[i]);
      xhr.open('GET', url + users[i], true);
      xhr.send(null); 
    }

    function onload(xhr, user) {
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
                atndevrecom.sortingArray.push({'date': startDate, 'event_id': res.events[j].event_id});
              }
          }
        }
        if (--userNum == 0) {
          atndevrecom.activate();
          atndevrecom.constructPanel();
        }
      };
    };
  },

  clearEventList: function() {
    atndevrecom.events = {};
    atndevrecom.sortingArray = [];
  },

  escapeChars: function(html) {
    var map = {"<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", "\"":"&quot;"};
    var replaceStr = function(s){ return map[s]; };
    return html.replace(/<|>|&|'|"/g, replaceStr);
  },

  cmp: function(a, b) {
    return a.date > b.date;
  }
};

window.addEventListener("load", atndevrecom.init, false);
