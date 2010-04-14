atndevrecom.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ atndevrecom.showFirefoxContextMenu(e); }, false);
};

atndevrecom.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-atndevrecom").hidden = gContextMenu.onImage;
};

window.addEventListener("load", atndevrecom.onFirefoxLoad, false);
