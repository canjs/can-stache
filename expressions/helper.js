var Literal = require('./literal');
var Hashes = require('./hashes');
var Observation = require('can-observation');
var assign = require('can-util/js/assign/assign');
var dev = require("can-util/js/dev/dev");
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var expressionHelpers = require("../src/expression-helpers");
var utils = require('../src/utils');
var mustacheHelpers = require('../helpers/core');
var canReflect = require('can-reflect');
var lookupValueOrHelper = require("../src/lookup-value-or-helper");
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
// looks up the name key in the scope
// returns a `helper` property if there is a helper for the key.
// returns a `value` property if the value is looked up.
Helper.prototype.helperAndValue = function(scope){

	//{{foo bar}}
	var helperOrValue,
		computeData,
		// If a literal, this means it should be treated as a key. But helpers work this way for some reason.
		// TODO: fix parsing so numbers will also be assumed to be keys.
		methodKey = this.methodExpr instanceof Literal ?
			""+this.methodExpr._value : this.methodExpr.key,
		initialValue,
		args;

	//!steal-remove-start
	var filename = scope.peek('scope.filename');
	//!steal-remove-end

	helperOrValue = lookupValueOrHelper(methodKey, scope);

	if (helperOrValue instanceof ScopeKeyData) {
		args = this.args(scope).map(expressionHelpers.toComputeOrValue);

		if(typeof helperOrValue.initialValue === "function") {
			function helperFn() {
				return helperOrValue.initialValue.apply(null, args);
			}
			//!steal-remove-start
			Object.defineProperty(helperFn, "name", {
				value: canReflect.getName(this),
			});
			//!steal-remove-end

			return {
				value: helperFn
			};
		}
		// if it's some other value ..
		else if(typeof helperOrValue.initialValue !== "undefined") {
			// we will use that
			return {value: helperOrValue};
		}
		//!steal-remove-start
		else {
			dev.warn('can-stache/expressions/helper.js: Unable to find key or helper "' + methodKey + '".');
		}
		//!steal-remove-end

		return {
			value: helperOrValue,
			args: args
		};
	}

	return {
		helper: helperOrValue && helperOrValue.fn
	};
};

Helper.prototype.evaluator = function(helper, scope, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly){

	var helperOptionArg = {
		stringOnly: stringOnly
	},
		context = scope.peek("."),
		args = this.args(scope),
		hash = this.hash(scope);

	// Add additional data to be used by helper functions
	utils.convertToScopes(helperOptionArg, scope, nodeList, truthyRenderer, falseyRenderer, stringOnly);

	assign(helperOptionArg, {
		context: context,
		scope: scope,
		contexts: scope,
		hash: hash,
		nodeList: nodeList,
		exprData: this
	});

	args.push(helperOptionArg);
	// Call the helper.
	return function () {
		return helper.apply(context, args);
	};
};

Helper.prototype.value = function(scope, nodeList, truthyRenderer, falseyRenderer, stringOnly){

	var helperAndValue = this.helperAndValue(scope);

	var helper = helperAndValue.helper;
	// a method could have been called, resulting in a value
	if(!helper) {
		return helperAndValue.value;
	}

	var fn = this.evaluator(helper, scope, nodeList, truthyRenderer, falseyRenderer, stringOnly);

	var computeValue = new Observation(fn);

	Observation.temporarilyBind(computeValue);

	if (!expressionHelpers.computeHasDependencies( computeValue ) ) {
		return computeValue();
	} else {
		return computeValue;
	}
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
