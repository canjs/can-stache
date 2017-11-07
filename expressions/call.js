var Scope = require('can-view-scope');
var Hashes = require('./hashes');
var SetIdentifier = require("../src/set-identifier");
var Observation = require('can-observation');
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var assign = require('can-util/js/assign/assign');
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var expressionHelpers = require("../src/expression-helpers");
var sourceTextSymbol = canSymbol.for("can-stache.sourceText");
var SetterObservable = require("can-simple-observable/setter/setter");

// ### Call
// `new Call( new Lookup("method"), [new ScopeExpr("name")], {})`
// A call expression like `method(arg1, arg2)` that, by default,
// calls `method` with non compute values.
var Call = function(methodExpression, argExpressions){
	this.methodExpr = methodExpression;
	this.argExprs = argExpressions.map(expressionHelpers.convertToArgExpression);
};
Call.prototype.args = function(scope, helperOptions){
	var args = [];
	for(var i = 0, len = this.argExprs.length; i < len; i++) {
		var arg = this.argExprs[i];
		var value = arg.value.apply(arg, arguments);
		args.push({
			// always do getValue unless compute is false
			call: !arg.modifiers || !arg.modifiers.compute,
			value: value
		});
	}
	return function(){
		var finalArgs = [];
		for(var i = 0, len = args.length; i < len; i++) {
			finalArgs[i] = args[i].call ? canReflect.getValue( args[i].value ) : expressionHelpers.toCompute( args[i].value );
		}
		return finalArgs;
	};
};

Call.prototype.value = function(scope, helperScope, helperOptions){
	var method = this.methodExpr.value(scope, helperScope);
	// TODO: remove this hack
	var isHelper = this.isHelper = this.methodExpr.isHelper;

	var getArgs = this.args(scope, helperScope);

	var computeFn = function(newVal){
		var func = canReflect.getValue( method );

		if(typeof func === "function") {
			var args = getArgs();

			// if fn/inverse is needed, add after this

			if(isHelper && helperOptions) {
				args.push(helperOptions);
			}
			if(arguments.length) {
				args.unshift(new SetIdentifier(newVal));
			}

			return func.apply(null, args);
		}
	};
	//!steal-remove-start
	Object.defineProperty(computeFn, "name", {
		value: "{{" + this.sourceText() + "}}"
	});
	//!steal-remove-end

	var computeValue = new SetterObservable(computeFn, computeFn);
	Observation.temporarilyBind(computeValue);
	return computeValue;
};
//!steal-remove-start
Call.prototype.sourceText = function(){
	var args = this.argExprs.map(function(arg){
		return arg.sourceText();
	});
	return this.methodExpr.sourceText()+"("+args.join(",")+")";
}
Call.prototype.closingTag = function() {
	if(this.methodExpr[sourceTextSymbol]) {
		return this.methodExpr[sourceTextSymbol];
	}
	return this.methodExpr.key;
};
//!steal-remove-end

module.exports = Call;
