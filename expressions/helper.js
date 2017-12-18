var Literal = require('./literal');
var Hashes = require('./hashes');
var Observation = require('can-observation');
var assign = require('can-assign');
var dev = require("can-log/dev/dev");
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var expressionHelpers = require("../src/expression-helpers");
var utils = require('../src/utils');
var mustacheHelpers = require('../helpers/core');
var canReflect = require('can-reflect');
var ScopeKeyData = require("can-view-scope/scope-key-data");

var Helper = function(methodExpression, argExpressions, hashExpressions){
	this.methodExpr = methodExpression;
	this.argExprs = argExpressions;
	this.hashExprs = hashExpressions;
	this.mode = null;
};
Helper.prototype.args = function(scope){
	var args = [];
	for(var i = 0, len = this.argExprs.length; i < len; i++) {
		var arg = this.argExprs[i];
		// TODO: once we know the helper, we should be able to avoid compute conversion
		args.push( expressionHelpers.toComputeOrValue( arg.value.apply(arg, arguments) ) );
	}
	return args;
};
Helper.prototype.hash = function(scope){
	var hash = {};
	for(var prop in this.hashExprs) {
		var val = this.hashExprs[prop];
		// TODO: once we know the helper, we should be able to avoid compute conversion
		hash[prop] = expressionHelpers.toComputeOrValue( val.value.apply(val, arguments) );
	}
	return hash;
};

// looks up the name key in the scope and return it
Helper.prototype.helperValue = function(scope, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly) {
	// If a literal, this means it should be treated as a key. But helpers work this way for some reason.
	// TODO: fix parsing so numbers will also be assumed to be keys.
	var methodKey = this.methodExpr instanceof Literal ?
		"" + this.methodExpr._value :
		this.methodExpr.key,
		helperInstance = this,
		helperValue = expressionHelpers.getObservableValue_fromKey(methodKey, scope, { proxyMethods: false }),
		initialValue = helperValue && helperValue.initialValue,
		isHelper = initialValue && initialValue.isHelper;

	if (typeof initialValue === "function") {
		helperValue = function helperFn() {
			var helperOptionArg = { stringOnly: stringOnly },
				context = scope.peek("this"),
				args = helperInstance.args(scope),
				hash = helperInstance.hash(scope);

			// Add additional data to be used by helper functions
			utils.convertToScopes(helperOptionArg, scope, nodeList, truthyRenderer, falseyRenderer, stringOnly);

			assign(helperOptionArg, {
				context: context,
				scope: scope,
				hash: hash,
				nodeList: nodeList,
				exprData: helperInstance
			});

			args.push(helperOptionArg);

			return initialValue.apply(context, args);
		};
		helperValue.isHelper = isHelper;
		//!steal-remove-start
		Object.defineProperty(helperValue, "name", {
			value: canReflect.getName(this)
		});
		//!steal-remove-end
	}
	//!steal-remove-start
	else {
		dev.warn('can-stache/expressions/helper.js: Unable to find helper "' + methodKey + '".');
	}
	//!steal-remove-end

	return  helperValue;
};

Helper.prototype.evaluator = function(helper, scope) {
	return function () {
		return helper.apply(scope.peek("this"), arguments);
	};
};

Helper.prototype.value = function(scope, nodeList, truthyRenderer, falseyRenderer, stringOnly){
	var helperValue = this.helperValue(scope);

	// a method could have been called, resulting in a value
	if(!helperValue.isHelper) {
		return helperValue;
	}

	var fn = this.evaluator(helper, scope, nodeList, truthyRenderer, falseyRenderer, stringOnly);

	var computeValue = new Observation(fn);

	Observation.temporarilyBind(computeValue);

	return computeValue;
};

Helper.prototype.closingTag = function() {
	return this.methodExpr.key;
};

//!steal-remove-start
Helper.prototype.sourceText = function(){
	var text = [this.methodExpr.sourceText()];
	if(this.argExprs.length) {
		text.push( this.argExprs.map(function(arg){
			return arg.sourceText();
		}).join(" ") );
	}
	if(!isEmptyObject(this.hashExprs)){
		text.push( Hashes.prototype.sourceText.call(this) );
	}
	return text.join(" ");
};
//!steal-remove-end
canReflect.assignSymbols(Helper.prototype,{
	"can.getName": function() {
		return canReflect.getName(this.constructor) + "{{" + (this.sourceText()) + "}}";
	}
});
//!steal-remove-end

module.exports = Helper;
