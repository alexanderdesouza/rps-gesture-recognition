/*
    optionsmenu.js
    This file provides the main JavaScript functionality for the togglable
    options menu that appears at the bottom of main.html. It consists of an
    effective Menu class declaration, with an association of relevant functions
    that build and destroy the menu, and enable all of the associated
    functionality (e.g., that it's collapsable).

    @author   Wholesale Banking Advanced Analytics
    @updated  03.11.2016
 */



var options = {}
    options["yAxis"] = "BASpread";
    options["ING"] = "unchecked";
    options["BBG"] = "unchecked";
    options["RFQperiod"] = 30;

// extend Function Definition :
function extend(a, b) {
  for(var key in b) {
    if(b.hasOwnProperty(key)) {
      a[key] = b[key];
    }
  }
  return a;
}

// each Function Definition :
// ...a helper...
function each(collection, callback) {
  for (var i = 0; i < collection.length; i++) {
    var item = collection[i];
    callback(item);
  }
}

// Menu Constructor :
function Menu(opt) {
  this.opt = extend({}, this.opt);
  extend(this.opt, opt);
  this._init();
}

// Menu class variables :
Menu.prototype.opt = {
  wrapper: "#optionsMenuWrapper",    // Content wrapper
  menuOpenerClass: ".optionsButton", // Menu opener class names (i.e., the buttons)
  maskId: "#optionsMask"             // Mask ID
};

// _init Function Definition :
//
Menu.prototype._init = function() {
  this.body = document.body;
  this.isOpen = false;
  this.wrapper = document.querySelector(this.opt.wrapper);
  this.mask = document.querySelector(this.opt.maskId);
  this.menu = document.querySelector("#optionsMenu");
  this.menuOpeners = document.querySelectorAll(this.opt.menuOpenerClass);
  this._initEvents();
};

// _initEvents Function Definition :
//
Menu.prototype._initEvents = function() {
  // Mask to catch clicks on screen :
  this.mask.addEventListener("click", function(e) {
    e.preventDefault();
    this.close();
  }.bind(this));
};

// enableMenuOpener Function Definition :
//
Menu.prototype.enableMenuOpeners = function() {
  each(this.menuOpeners, function(item) {
    item.disabled = false;
  });
};

// disableMenuOpener Function Definition :
//
Menu.prototype.disableMenuOpeners = function() {
  each(this.menuOpeners, function(item) {
    item.disabled = true;
  });
};

// openMenu Function Definition :
Menu.prototype.open = function() {
  this.body.classList.add("has-active-menu");
  this.menu.classList.add("is-active");
  this.mask.classList.add("is-active");
  this.disableMenuOpeners();
};

// closeMenu Function Definition :
Menu.prototype.close = function() {
  this.body.classList.remove("has-active-menu");
  this.menu.classList.remove("is-active");
  this.mask.classList.remove("is-active");
  this.enableMenuOpeners();
};

