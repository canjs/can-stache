var canReflect = require("can-reflect");

function isVariable(scope) {
	return scope._meta.variable === true;
}

var letHelper = function(options){
	if(options.isSection){
		return options.fn( options.scope.addLetContext( options.hash ) );
	}
	var variableScope = options.scope.getScope(isVariable);
	if(!variableScope) {
		throw new Error("There is no variable scope!");
	}
	canReflect.assignMap(variableScope._context, options.hash);
	return document.createTextNode("");
};

module.exports = letHelper;
