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

Helper.prototype.value = function(scope, helperOptions){
	// If a literal, this means it should be treated as a key. But helpers work this way for some reason.
	// TODO: fix parsing so numbers will also be assumed to be keys.
	var methodKey = this.methodExpr instanceof Literal ?
		"" + this.methodExpr._value :
		this.methodExpr.key,
		helperInstance = this,
		// proxyMethods must be false so that the `requiresOptionsArgument` and any
		// other flags stored on the function are preserved
		helperFn = expressionHelpers.getObservableValue_fromKey(methodKey, scope, { proxyMethods: false }),
		initialValue = helperFn && helperFn.initialValue,
		thisArg = helperFn && helperFn.thisArg;

	if (typeof initialValue === "function") {
		helperFn = function helperFn() {
			var args = helperInstance.args(scope),
				helperOptionArg = assign(assign({}, helperOptions), {
					hash: helperInstance.hash(scope),
					exprData: helperInstance
				});

			args.push(helperOptionArg);

			return initialValue.apply(thisArg || scope.peek("this"), args);
		};
		//!steal-remove-start
		Object.defineProperty(helperFn, "name", {
			value: canReflect.getName(this)
		});
		//!steal-remove-end
	}
	//!steal-remove-start
	else {
		dev.warn('can-stache/expressions/helper.js: Unable to find helper "' + methodKey + '".');
	}
	//!steal-remove-end

	return  helperFn;
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
