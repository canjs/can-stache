var helpers = require("can-stache-helpers");
var canReflect = require("can-reflect");

function isVariable(scope) {
	return scope._meta.variable === true;
}

helpers["let"] = function(options){
	var variableScope = options.scope.getScope(isVariable);
	if(!variableScope) {
		throw new Error("There is no variable scope!");
	}
	canReflect.assignMap(variableScope._context, options.hash);
	return document.createTextNode("");
};
