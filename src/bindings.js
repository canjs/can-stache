"use strict";
var canReflect = require("can-reflect");
var canSymbol = require('can-symbol');
var viewCallbacks = require("can-view-callbacks");

var bindingsSymbol = canSymbol.for('can.stacheBindings');
var bindingsAdded = new WeakMap();

module.exports = function(bindingsMap) {
	var map = canReflect.getKeyValue(bindingsMap, bindingsSymbol) || bindingsMap;

	// Only add bindings once.
	if(bindingsAdded.has(map)) {
		return;
	} else {
		// Would prefer to use WeakSet but IE11 doesn't support it.
		bindingsAdded.set(map, true);
	}

	canReflect.eachKey(map, function(callback, exp){
		viewCallbacks.attr(exp, callback);
	});
};
