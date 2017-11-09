var helpers = require("./core");
var SetIdentifier = require("../src/set-identifier");
var makeArray = require("can-util/js/make-array/make-array")

helpers.registerConverter = function(name, getterSetter) {
	getterSetter = getterSetter || {};
	helpers.registerHelper(name, function(newVal, source) {
		var args = makeArray(arguments);
		if(newVal instanceof SetIdentifier) {
			return typeof getterSetter.set === "function" 
				? getterSetter.set.apply(this, [newVal.value].concat(args.slice(1))) 
				: source(newVal.value);
		} else {
			return typeof getterSetter.get === "function" 
				? getterSetter.get.apply(this, args)
				: args[0];
		}
	});
};

module.exports = helpers;
