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

var Helper = function(methodExpression, argExpressions, hashExpressions){
	this.methodExpr = methodExpression;
	this.argExprs = argExpressions;
	this.hashExprs = hashExpressions;
	this.mode = null;
};
Helper.prototype.args = function(scope, helperOptions){
	var args = [];
	for(var i = 0, len = this.argExprs.length; i < len; i++) {
		var arg = this.argExprs[i];
		// TODO: once we know the helper, we should be able to avoid compute conversion
		args.push( expressionHelpers.toComputeOrValue( arg.value.apply(arg, arguments) ) );
	}
	return args;
};
Helper.prototype.hash = function(scope, helperOptions){
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
Helper.prototype.helperAndValue = function(scope, helperOptions){

	//{{foo bar}}
	var looksLikeAHelper = this.argExprs.length || !isEmptyObject(this.hashExprs),
		helper,
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

	// If the expression looks like a helper, try to get a helper right away.
	if (looksLikeAHelper) {
		// Try to find a registered helper.
		helper = mustacheHelpers.getHelper(methodKey, helperOptions);

	}
	if(!helper) {
		// Try to find a value or function
		computeData = expressionHelpers.getObservableValue_fromKey(methodKey, scope, {
			isArgument: true,

			//!steal-remove-start
			filename: filename
			//!steal-remove-end
		});
		// if it's a function ... we need another compute that represents
		// the call to that function
		// This handles functions in any of these forms:
		// {{#foo}}...{{/foo}}
		// {{^foo}}...{{/foo}}
		// {{foo bar}}
		// {{foo}}
		// {{{foo}}}
		//
		// it also handles when `bar` is a function in `foo.bar` in any of the above
		if(typeof computeData.initialValue === "function") {
			//!steal-remove-start
			if (filename) {
				dev.warn(
					filename + ': "' +
					methodKey + '" is being called as a function.\n' +
					'\tThis will not happen automatically in an upcoming release.\n' +
					'\tYou should call it explicitly using "' + methodKey + '()".\n\n'
				);
			} else {
				dev.warn(
					'"' + methodKey + '" is being called as a function.\n' +
					'\tThis will not happen automatically in an upcoming release.\n' +
					'\tYou should call it explicitly using "' + methodKey + '()".\n\n'
				);
			}
			//!steal-remove-end
			args = this.args(scope, helperOptions).map(expressionHelpers.toComputeOrValue);
			// TODO: this should be an observation.
			function observation(){
				return computeData.initialValue.apply(null, args);
			}
			//!steal-remove-start
			Object.defineProperty(observation, "name", {
				value: canReflect.getName(this),
			});
			//!steal-remove-end

			var functionResult = new Observation(observation);
			// TODO: probably don't need to bind
			Observation.temporarilyBind(functionResult);
			return {
				value: functionResult
			};
		}
		// if it's some other value ..
		else if(typeof computeData.initialValue !== "undefined") {
			// we will use that
			return {value: computeData};
		}

		// If it doesn't look like a helper and there is no value, check helpers
		// anyway. This is for when foo is a helper in `{{foo}}`.
		// {{#foo}}...{{/foo}}
		// {{^foo}}...{{/foo}}
		// {{foo}}
		// {{{foo}}}
		// {{& foo}}
		//
		// also `foo.bar` in any of the above if bar is any of the mentioned types
		// or foo is null or undefined
		if( !looksLikeAHelper && initialValue === undefined ) {
			helper = mustacheHelpers.getHelper(methodKey, helperOptions);
		}
	}

	//!steal-remove-start
	if ( !helper ) {
		if(looksLikeAHelper) {
			dev.warn('can-stache/expressions/helper.js: Unable to find helper "' + methodKey + '".');
		} else {
			dev.warn('can-stache/expressions/helper.js: Unable to find key or helper "' + methodKey + '".');
		}
	}
	//!steal-remove-end

	return {
		value: computeData,
		args: args,
		helper: helper && helper.fn
	};
};
Helper.prototype.evaluator = function(helper, scope, helperOptions, /*REMOVE*/readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly){

	var helperOptionArg = {
		stringOnly: stringOnly
	},
		context = scope.peek("."),
		args = this.args(scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly),
		hash = this.hash(scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);

	// Add additional data to be used by helper functions
	utils.convertToScopes(helperOptionArg, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);

	assign(helperOptionArg, {
		context: context,
		scope: scope,
		contexts: scope,
		hash: hash,
		nodeList: nodeList,
		exprData: this,
		helperOptions: helperOptions,
		helpers: helperOptions
	});

	args.push(helperOptionArg);
	// Call the helper.
	return function () {
		return helper.apply(context, args);
	};
};

Helper.prototype.value = function(scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly){

	var helperAndValue = this.helperAndValue(scope, helperOptions);

	var helper = helperAndValue.helper;
	// a method could have been called, resulting in a value
	if(!helper) {
		return helperAndValue.value;
	}

	var fn = this.evaluator(helper, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);

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
