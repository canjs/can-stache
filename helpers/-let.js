var helpers = require("can-stache-helpers");

function isVariable(scope) {
	return scope._meta.variable === true;
}

helpers["let"] = function(options){
	var variableScope = options.scope.getScope(isVariable);
	if(!variableScope) {
		throw new Error("There is no variable scope!");
	}

	variableScope._context.attr(options.hash);
	return document.createTextNode("");
};
