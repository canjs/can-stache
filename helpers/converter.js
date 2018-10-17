"use strict";
var helpers = require("./core");
var SetIdentifier = require("../src/set-identifier");
var canReflect = require("can-reflect");


function makeConverter(getterSetter){
	getterSetter = getterSetter || {};
	return function(newVal, source) {
		var args = canReflect.toArray(arguments);
		if(newVal instanceof SetIdentifier) {
			return typeof getterSetter.set === "function" ?
				getterSetter.set.apply(this, [newVal.value].concat(args.slice(1))) :
				source(newVal.value);
		} else {
			return typeof getterSetter.get === "function" ?
				getterSetter.get.apply(this, args) :
				args[0];
		}
	};
}

var converterPackages = new WeakMap();
helpers.addConverter = function(name, getterSetter) {
	if(typeof name === "object") {
		if(!converterPackages.has(name)) {
			converterPackages.set(name, true);
			canReflect.eachKey(name, function(getterSetter, name) {
				helpers.addConverter(name, getterSetter);
			});
		}
		return;
	}

	var helper = makeConverter(getterSetter);
	helper.isLiveBound = true;
	helpers.registerHelper(name, helper );
};

helpers.registerConverter = function(name, getterSetter) {
	helpers.registerHelper(name, makeConverter(getterSetter) );
};

var converterHelpers = {
	"not": {
		get: function(obs, options){
			if(helpers.looksLikeOptions(options)) {
				return canReflect.getValue(obs) ? options.inverse() : options.fn();
			} else {
				return !canReflect.getValue(obs);
			}

		},
		set: function(newVal, obs){
			canReflect.setValue(obs, !newVal);
		}
	}
};

helpers.addConverter(converterHelpers);

module.exports = helpers;
