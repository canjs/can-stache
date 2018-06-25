var canReflect = require("can-reflect");
var viewCallbacks = require("can-view-callbacks");

module.exports = function(bindingsMap) {
	canReflect.eachKey(bindingsMap, function(callback, exp){
		viewCallbacks.attr(exp, callback);
	});
};
