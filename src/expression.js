var compute = require('can-compute');
var observeReader = require('can-stache-key');

var utils = require('./utils');
var mustacheHelpers = require('../helpers/core');

var each = require('can-util/js/each/each');
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var dev = require('can-log/dev/dev');
var assign = require('can-util/js/assign/assign');
var last = require('can-util/js/last/last');
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");

//!steal-remove-start
// warn on keys like {{foo}} if foo is not in the current scope
// don't warn on things like {{./foo}} or {{../foo}} or {{foo.bar}} or {{%index}} or {{this}}
function displayScopeWalkingWarning(key, computeData, filename) {
	if (key.indexOf(".") < 0 && key !== "this") {
		// if scope that value was found in (`scope`) is not the starting scope,
		// we must have walked up the scope to find the value
		var scopeWasWalked = computeData.scope && (computeData.scope !== computeData.startingScope);

		// values read from non-contexts, such as aliases created for #each and #with
		// should not warn
		var readFromNonContext = computeData && computeData.scope &&
			computeData.scope._meta && computeData.scope._meta.notContext;

		// if scope was walked and value isn't an alias, display dev warning
		if (scopeWasWalked && !readFromNonContext) {
			if (filename) {
				dev.warn(
					filename + ': "' + key + '" ' +
					'is not in the current scope, so it is being read from the parent scope.\n' +
					'This will not happen automatically in an upcoming release. See https://canjs.com/doc/can-stache.scopeAndContext.html#PreventingScopeWalking.\n\n'
				);
			} else {
				dev.warn(
					'"' + key + '" ' +
					'is not in the current scope, so it is being read from the parent scope.\n' +
					'This will not happen automatically in an upcoming release. See https://canjs.com/doc/can-stache.scopeAndContext.html#PreventingScopeWalking.\n\n'
				);
			}
		}
	}
}
//!steal-remove-end

// ## Helpers
// Helper for getting a bound compute in the scope.
var getObservableValue_fromKey = function (key, scope, readOptions) {
		var data = scope.computeData(key, readOptions);
		compute.temporarilyBind(data);

		//!steal-remove-start
		// this must happen after `temporarilyBind`ing computeData
		// so that we know where the value was found
		displayScopeWalkingWarning(key, data, readOptions && readOptions.filename);
		//!steal-remove-end

		return data;
	},
	computeHasDependencies = function(compute){
		return compute[canSymbol.for("can.valueHasDependencies")] ?
			canReflect.valueHasDependencies(compute) : compute.computeInstance.hasDependencies;
	},
	// Looks up a value in the scope, and if it is `undefined`, looks up
	// the value as a helper.
	lookupValueOrHelper = function(key, scope, helperOptions, readOptions){
		var scopeKeyData = getObservableValue_fromKey(key, scope, readOptions);

		var result = {value: scopeKeyData};
		// If it doesn't look like a helper and there is no value, check helpers
		// anyway. This is for when foo is a helper in `{{foo}}`.
		if( scopeKeyData.initialValue === undefined ) {
			if(key.charAt(0) === "@" && key !== "@index") {
				key = key.substr(1);
			}
			var helper = mustacheHelpers.getHelper(key, helperOptions);
			result.helper = helper && helper.fn;
		}
		return result;
	},
	getObservableValue_fromDynamicKey_fromObservable = function (key, root, helperOptions, readOptions) {
		var computeValue = compute(function(newVal) {
			var keyValue = canReflect.getValue(key);
			var rootValue = canReflect.getValue(root);
			// Convert possibly numeric key to string, because observeReader.get will do a charAt test on it.
			// also escape `.` so that things like ["bar.baz"] will work correctly
			keyValue = ("" + keyValue).replace(".", "\\.");

			if (arguments.length) {
				observeReader.write(rootValue, observeReader.reads(keyValue), newVal);
			} else {
				return observeReader.get(rootValue, keyValue);
			}
		});
		compute.temporarilyBind(computeValue);
		return computeValue;
	},
	// If not a Literal or an Arg, convert to an arg for caching.
	convertToArgExpression = function(expr){
		if(!(expr instanceof Arg) && !(expr instanceof Literal)) {
			return new Arg(expr);
		} else {
			return expr;
		}

	},
	toComputeOrValue = function(value) {
		// convert to non observable value
		if(canReflect.isObservableLike(value)) {
			// we only want to do this for things that `should` have dependencies, but dont.

			if(canReflect.valueHasDependencies(value) === false) {
				return canReflect.getValue(value);
			}
			// if compute data
			if(value.compute) {
				return value.compute;
			}
		}
		return value;
	},
	// try to make it a compute no matter what.  This is useful for
	// ~ operator.
	toCompute = function(value) {
		if(value) {

			if(value.isComputed) {
				return value;
			}
			if(value.compute) {
				return value.compute;
			}
		}
		return value;
	};

// ## Expression Types
//
// These expression types return a value. They are assembled by `expression.parse`.

// ### Bracket
// For accessing properties using bracket notation like `foo[bar]`
var Bracket = function (key, root) {
	this.root = root;
	this.key = key;
};
Bracket.prototype.value = function (scope, helpers) {
	var root = this.root ? this.root.value(scope, helpers) : scope.peek('.');
	return getObservableValue_fromDynamicKey_fromObservable(this.key.value(scope, helpers), root, scope, helpers, {});
};

// ### Literal
// For inline static values like `{{"Hello World"}}`
var Literal = function(value){
	this._value = value;
};
Literal.prototype.value = function(){
	return this._value;
};

// ### Lookup
// `new Lookup(String, [Expression])`
// Finds a value in the scope or a helper.
var Lookup = function(key, root) {
	this.key = key;
	this.rootExpr = root;
};
Lookup.prototype.value = function(scope, helperOptions){

	if (this.rootExpr) {
		return getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
	} else {
		// TODO: remove this.  This is hacky.
		var result = lookupValueOrHelper(this.key, scope, helperOptions);
		this.isHelper = result.helper && !result.helper.callAsMethod;
		return result.helper || result.value;
	}
};

// ### ScopeLookup
// Looks up a value in the scope, returns a compute for the value it finds.
// If passed an expression, that is used to lookup data
var ScopeLookup = function(key, root) {
	Lookup.apply(this, arguments);
};
ScopeLookup.prototype.value = function(scope, helperOptions){
	if (this.rootExpr) {
		return getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
	}

	return getObservableValue_fromKey(this.key, scope, helperOptions);
};

// ### Arg
// `new Arg(Expression [,modifierOptions] )`
// Used to identify an expression that should return a value.
var Arg = function(expression, modifiers){
	this.expr = expression;
	this.modifiers = modifiers || {};
	this.isCompute = false;
};
Arg.prototype.value = function(){
	return this.expr.value.apply(this.expr, arguments);
};

// ### Hash
// A placeholder. This isn't actually used.
var Hash = function(){ }; // jshint ignore:line

var Hashes = function(hashes){
	this.hashExprs = hashes;
};
Hashes.prototype.value = function(scope, helperOptions){
	var hash = {};
	for(var prop in this.hashExprs) {
		var val = convertToArgExpression(this.hashExprs[prop]),
			value = val.value.apply(val, arguments);

		hash[prop] = {
			call: !val.modifiers || !val.modifiers.compute,
			value: value
		};
	}
	// TODO: replace with Compute
	return compute(function(){
		var finalHash = {};
		for(var prop in hash) {
			finalHash[prop] = hash[prop].call ? canReflect.getValue( hash[prop].value ) : toComputeOrValue( hash[prop].value );
		}
		return finalHash;
	});
};
// ### Call
// `new Call( new Lookup("method"), [new ScopeExpr("name")], {})`
// A call expression like `method(arg1, arg2)` that, by default,
// calls `method` with non compute values.
var Call = function(methodExpression, argExpressions){
	this.methodExpr = methodExpression;
	this.argExprs = argExpressions.map(convertToArgExpression);
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
			finalArgs[i] = args[i].call ? canReflect.getValue( args[i].value ) : toCompute( args[i].value );
		}
		return finalArgs;
	};
};

Call.prototype.value = function(scope, helperScope, helperOptions){

	var method = this.methodExpr.value(scope, helperScope);
	// TODO: remove this hack
	var isHelper = this.isHelper = this.methodExpr.isHelper;

	var getArgs = this.args(scope, helperScope);

	var computeValue = compute(function(newVal){
		var func = canReflect.getValue( method );

		if(typeof func === "function") {
			var args = getArgs();

			// if fn/inverse is needed, add after this

			if(isHelper && helperOptions) {
				args.push(helperOptions);
			}
			if(arguments.length) {
				args.unshift(new expression.SetIdentifier(newVal));
			}

			return func.apply(null, args);
		}

	});
	compute.temporarilyBind(computeValue);
	return computeValue;
};

Call.prototype.closingTag = function() {
	//!steal-remove-start
	if(this.methodExpr[canSymbol.for('can-stache.originalKey')]) {
		return this.methodExpr[canSymbol.for('can-stache.originalKey')];
	}
	//!steal-remove-end
	return this.methodExpr.key;
};

// ### HelperLookup
// An expression that looks up a value in the helper or scope.
// Any functions found prior to the last one are called with
// the context and scope.
var HelperLookup = function(){
	Lookup.apply(this, arguments);
};
HelperLookup.prototype.value = function(scope, helperOptions){
	var result = lookupValueOrHelper(this.key, scope, helperOptions, {isArgument: true, args: [scope.peek('.'), scope]});
	return result.helper || result.value;
};

// ### HelperScopeLookup
// An expression that looks up a value in the scope.
// Any functions found prior to the last one are called with
// the context and scope.
var HelperScopeLookup = function(){
	Lookup.apply(this, arguments);
};
HelperScopeLookup.prototype.value = function(scope, helperOptions){
	return getObservableValue_fromKey(this.key, scope, {callMethodsOnObservables: true, isArgument: true, args: [scope.peek('.'), scope]});
};

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
		args.push( toComputeOrValue( arg.value.apply(arg, arguments) ) );
	}
	return args;
};
Helper.prototype.hash = function(scope, helperOptions){
	var hash = {};
	for(var prop in this.hashExprs) {
		var val = this.hashExprs[prop];
		// TODO: once we know the helper, we should be able to avoid compute conversion
		hash[prop] = toComputeOrValue( val.value.apply(val, arguments) );
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
		var filename = helperOptions && helperOptions._meta && helperOptions._meta.filename;
		//!steal-remove-end

	// If the expression looks like a helper, try to get a helper right away.
	if (looksLikeAHelper) {
		// Try to find a registered helper.
		helper = mustacheHelpers.getHelper(methodKey, helperOptions);

	}
	if(!helper) {
		// Try to find a value or function
		computeData = getObservableValue_fromKey(methodKey, scope, {
			isArgument: true

			//!steal-remove-start
			, filename: filename
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

			args = this.args(scope, helperOptions).map(toComputeOrValue);
			// TODO: this should be an observation.
			var functionResult = compute(function(){
				return computeData.initialValue.apply(null, args);
			});
			// TODO: probably don't need to bind
			compute.temporarilyBind(functionResult);
			return {
				value: functionResult
			};
		}
		// if it's some other value ..
		else if(typeof computeData.initialValue !== "undefined") {
			// we will use that
			return {value: computeData};
		}

		// If it doesn't look like a helper and there is no value, check helpers anyway.
		// This handles helper functions, arrays, lists, computes, or primitives in:
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
			dev.warn('can-stache/src/expression.js: Unable to find helper "' + methodKey + '".');
		} else {
			dev.warn('can-stache/src/expression.js: Unable to find key or helper "' + methodKey + '".');
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

	var computeValue = compute(fn);

	compute.temporarilyBind(computeValue);

	if (!computeHasDependencies( computeValue ) ) {
		return computeValue();
	} else {
		return computeValue;
	}
};

Helper.prototype.closingTag = function() {
	return this.methodExpr.key;
};


// NAME - \w
// KEY - foo, foo.bar, foo@bar, %foo (special), &foo (references), ../foo, ./foo
// ARG - ~KEY, KEY, CALLEXPRESSION, PRIMITIVE
// CALLEXPRESSION = KEY(ARG,ARG, NAME=ARG)
// HELPEREXPRESSION = KEY ARG ARG NAME=ARG
// DOT .NAME
// AT @NAME
//
var keyRegExp = /[\w\.\\\-_@\/\&%]+/,
	tokensRegExp = /('.*?'|".*?"|=|[\w\.\\\-_@\/*%\$]+|[\(\)]|,|\~|\[|\]\s*|\s*(?=\[))/g,
	bracketSpaceRegExp = /\]\s+/,
	literalRegExp = /^('.*?'|".*?"|[0-9]+\.?[0-9]*|true|false|null|undefined)$/;

var isTokenKey = function(token){
	return keyRegExp.test(token);
};

var testDot = /^[\.@]\w/;
var isAddingToExpression = function(token) {

	return isTokenKey(token) && testDot.test(token);
};

var ensureChildren = function(type) {
	if(!type.children) {
		type.children = [];
	}
	return type;
};

var Stack = function(){

	this.root = {children: [], type: "Root"};
	this.current = this.root;
	this.stack = [this.root];
};
assign(Stack.prototype,{
	top: function(){
		return last(this.stack);
	},
	isRootTop: function(){
		return this.top() === this.root;
	},
	popTo: function(types){
		this.popUntil(types);
		this.pop();
	},
	pop: function() {
		if(!this.isRootTop()) {
			this.stack.pop();
		}
	},
	first: function(types){
		var curIndex = this.stack.length - 1;
		while( curIndex > 0 && types.indexOf(this.stack[curIndex].type) === -1 ) {
			curIndex--;
		}
		return this.stack[curIndex];
	},
	firstParent: function(types){
		var curIndex = this.stack.length - 2;
		while( curIndex > 0 && types.indexOf(this.stack[curIndex].type) === -1 ) {
			curIndex--;
		}
		return this.stack[curIndex];
	},
	popUntil: function(types){
		while( types.indexOf(this.top().type) === -1 && !this.isRootTop() ) {
			this.stack.pop();
		}
		return this.top();
	},
	addTo: function(types, type){
		var cur = this.popUntil(types);
		ensureChildren(cur).children.push(type);
	},
	addToAndPush: function(types, type){
		this.addTo(types, type);
		this.stack.push(type);
	},
	push: function(type) {
		this.stack.push(type);
	},
	topLastChild: function(){
		return last(this.top().children);
	},
	replaceTopLastChild: function(type){
		var children = ensureChildren(this.top()).children;
		children.pop();
		children.push(type);
		return type;
	},
	replaceTopLastChildAndPush: function(type) {
		this.replaceTopLastChild(type);
		this.stack.push(type);
	},
	replaceTopAndPush: function(type){
		var children;
		if(this.top() === this.root) {
			children = ensureChildren(this.top()).children;
		} else {
			this.stack.pop();
			// get parent and clean
			children = ensureChildren(this.top()).children;
		}

		children.pop();
		children.push(type);
		this.stack.push(type);
		return type;
	}
});

// converts
// - "../foo" -> "../@foo",
// - "foo" -> "@foo",
// - ".foo" -> "@foo",
// - "./foo" -> "./@foo"
// - "foo.bar" -> "foo@bar"
var convertKeyToLookup = function(key){
	var lastPath = key.lastIndexOf("./");
	var lastDot = key.lastIndexOf(".");
	if(lastDot > lastPath) {
		return key.substr(0, lastDot)+"@"+key.substr(lastDot+1);
	}
	var firstNonPathCharIndex = lastPath === -1 ? 0 : lastPath+2;
	var firstNonPathChar = key.charAt(firstNonPathCharIndex);
	if(firstNonPathChar === "." || firstNonPathChar === "@" ) {
		return key.substr(0, firstNonPathCharIndex)+"@"+key.substr(firstNonPathCharIndex+1);
	} else {
		return key.substr(0, firstNonPathCharIndex)+"@"+key.substr(firstNonPathCharIndex);
	}
};
var convertToAtLookup = function(ast){
	if(ast.type === "Lookup") {
		ast.key = convertKeyToLookup(ast.key);
	}
	return ast;
};

var convertToHelperIfTopIsLookup = function(stack){
	var top = stack.top();
	// if two scopes, that means a helper
	if(top && top.type === "Lookup") {

		var base = stack.stack[stack.stack.length - 2];
		// That lookup shouldn't be part of a Helper already or
		if(base.type !== "Helper" && base) {
			stack.replaceTopAndPush({
				type: "Helper",
				method: top
			});
		}
	}
};

var expression = {
	toComputeOrValue: toComputeOrValue,
	convertKeyToLookup: convertKeyToLookup,
	Literal: Literal,
	Lookup: Lookup,
	ScopeLookup: ScopeLookup,

	Arg: Arg,
	Hash: Hash,
	Hashes: Hashes,
	Call: Call,
	Helper: Helper,
	HelperLookup: HelperLookup,
	HelperScopeLookup: HelperScopeLookup,
	Bracket: Bracket,

	SetIdentifier: function(value){ this.value = value; },
	tokenize: function(expression){
		var tokens = [];
		(expression.trim() + ' ').replace(tokensRegExp, function (whole, arg) {
			if (bracketSpaceRegExp.test(arg)) {
				tokens.push(arg[0]);
				tokens.push(arg.slice(1));
			} else {
				tokens.push(arg);
			}
		});
		return tokens;
	},
	lookupRules: {
		"default": function(ast, methodType, isArg){
			var name = (methodType === "Helper" && !ast.root ? "Helper" : "")+(isArg ? "Scope" : "")+"Lookup";
			return expression[name];
		},
		"method": function(ast, methodType, isArg){
			return ScopeLookup;
		}
	},
	methodRules: {
		"default": function(ast){

			return ast.type === "Call" ? Call : Helper;
		},
		"call": function(ast){
			return Call;
		}
	},
	// ## expression.parse
	//
	// - {String} expressionString - A stache expression like "abc foo()"
	// - {Object} options
	//   - baseMethodType - Treat this like a Helper or Call.  Default to "Helper"
	//   - lookupRule - "default" or "method"
	//   - methodRule - "default" or "call"
	parse: function(expressionString, options){
		options =  options || {};
		var ast = this.ast(expressionString);

		if(!options.lookupRule) {
			options.lookupRule = "default";
		}
		if(typeof options.lookupRule === "string") {
			options.lookupRule = expression.lookupRules[options.lookupRule];
		}
		if(!options.methodRule) {
			options.methodRule = "default";
		}
		if(typeof options.methodRule === "string") {
			options.methodRule = expression.methodRules[options.methodRule];
		}

		var expr = this.hydrateAst(ast, options, options.baseMethodType || "Helper");

		return expr;
	},
	hydrateAst: function(ast, options, methodType, isArg){
		var hashes;
		if(ast.type === "Lookup") {
			var lookup = new (options.lookupRule(ast, methodType, isArg))(ast.key, ast.root && this.hydrateAst(ast.root, options, methodType) );
			//!steal-remove-start
			canReflect.setKeyValue(lookup, canSymbol.for("can-stache.originalKey"), ast[canSymbol.for("can-stache.originalKey")]);
			//!steal-remove-end
			return lookup;
		}
		else if(ast.type === "Literal") {
			return new Literal(ast.value);
		}
		else if(ast.type === "Arg") {
			return new Arg(this.hydrateAst(ast.children[0], options, methodType, isArg),{compute: true});
		}
		else if(ast.type === "Hash") {
			throw new Error("");
		}
		else if(ast.type === "Hashes") {
			hashes = {};
			each(ast.children, function(hash){
				hashes[hash.prop] = this.hydrateAst( hash.children[0], options, methodType, true );
			}, this);
			return new Hashes(hashes);
		}
		else if(ast.type === "Call" || ast.type === "Helper") {
			//get all arguments and hashes
			hashes = {};
			var args = [],
				children = ast.children,
				ExpressionType = options.methodRule(ast);
			if(children) {
				for(var i = 0 ; i <children.length; i++) {
					var child = children[i];
					if(child.type === "Hashes" && ast.type === "Helper" &&
						(ExpressionType !== Call)) {

						each(child.children, function(hash){
							hashes[hash.prop] = this.hydrateAst( hash.children[0], options, ast.type, true );
						}, this);

					} else {
						args.push( this.hydrateAst(child, options, ast.type, true) );
					}
				}
			}


			return new ExpressionType(this.hydrateAst(ast.method, options, ast.type),
																args, hashes);
		} else if (ast.type === "Bracket") {
			return new Bracket(
				this.hydrateAst(ast.children[0], options),
				ast.root ? this.hydrateAst(ast.root, options) : undefined
			);
		}
	},
	ast: function(expression){
		var tokens = this.tokenize(expression);
		return this.parseAst(tokens, {
			index: 0
		});
	},
	parseAst: function(tokens, cursor) {
		var stack = new Stack(),
			top,
			firstParent,
			lastToken;

		while(cursor.index < tokens.length) {
			var token = tokens[cursor.index],
				nextToken = tokens[cursor.index+1];

			cursor.index++;

			// Hash
			if(nextToken === "=") {
				//convertToHelperIfTopIsLookup(stack);
				top = stack.top();

				// If top is a Lookup, we might need to convert to a helper.
				if(top && top.type === "Lookup") {
					// Check if current Lookup is part of a Call, Helper, or Hash
					// If it happens to be first within a Call or Root, that means
					// this is helper syntax.
					firstParent = stack.firstParent(["Call","Helper","Hash"]);
					if(firstParent.type === "Call" || firstParent.type === "Root") {

						stack.popUntil(["Call"]);
						top = stack.top();
						stack.replaceTopAndPush({
							type: "Helper",
							method: top.type === "Root" ? last(top.children) : top
						});

					}
				}
				firstParent = stack.firstParent(["Call","Helper","Hashes"]);
				// makes sure we are adding to Hashes if there already is one
				// otherwise we create one.
				var hash = {type: "Hash", prop: token};
				if(firstParent.type === "Hashes") {
					stack.addToAndPush(["Hashes"], hash);
				} else {
					stack.addToAndPush(["Helper", "Call"], {
						type: "Hashes",
						children: [hash]
					});
					stack.push(hash);
				}
				cursor.index++;

			}
			// Literal
			else if(literalRegExp.test( token )) {
				convertToHelperIfTopIsLookup(stack);
				// only add to hash if there's not already a child.
				firstParent = stack.first(["Helper", "Call", "Hash", "Bracket"]);
				if(firstParent.type === "Hash" && (firstParent.children && firstParent.children.length > 0)) {
					stack.addTo(["Helper", "Call", "Bracket"], {type: "Literal", value: utils.jsonParse( token )});
				} else if(firstParent.type === "Bracket" && (firstParent.children && firstParent.children.length > 0)) {
					stack.addTo(["Helper", "Call", "Hash"], {type: "Literal", value: utils.jsonParse( token )});
				} else {
					stack.addTo(["Helper", "Call", "Hash", "Bracket"], {type: "Literal", value: utils.jsonParse( token )});
				}

			}
			// Lookup
			else if(keyRegExp.test(token)) {
				lastToken = stack.topLastChild();
				firstParent = stack.first(["Helper", "Call", "Hash", "Bracket"]);

				// if we had `foo().bar`, we need to change to a Lookup that looks up from lastToken.
				if(lastToken && (lastToken.type === "Call" || lastToken.type === "Bracket" ) && isAddingToExpression(token)) {
					stack.replaceTopLastChildAndPush({
						type: "Lookup",
						root: lastToken,
						key: token.slice(1) // remove leading `.`
					});
				}
				else if(firstParent.type === 'Bracket') {
					// a Bracket expression without children means we have
					// parsed `foo[` of an expression like `foo[bar]`
					// so we know to add the Lookup as a child of the Bracket expression
					if (!(firstParent.children && firstParent.children.length > 0)) {
						stack.addToAndPush(["Bracket"], {type: "Lookup", key: token});
					} else {
						// check if we are adding to a helper like `eq foo[bar] baz`
						// but not at the `.baz` of `eq foo[bar].baz xyz`
						if(stack.first(["Helper", "Call", "Hash", "Arg"]).type === 'Helper' && token[0] !== '.') {
							stack.addToAndPush(["Helper"], {type: "Lookup", key: token});
						} else {
							// otherwise, handle the `.baz` in expressions like `foo[bar].baz`
							stack.replaceTopAndPush({
								type: "Lookup",
								key: token.slice(1),
								root: firstParent
							});
						}
					}
				}
				else {
					// if two scopes, that means a helper
					convertToHelperIfTopIsLookup(stack);

					stack.addToAndPush(["Helper", "Call", "Hash", "Arg", "Bracket"], {type: "Lookup", key: token});
				}

			}
			// Arg
			else if(token === "~") {
				convertToHelperIfTopIsLookup(stack);
				stack.addToAndPush(["Helper", "Call", "Hash"], {type: "Arg", key: token});
			}
			// Call
			// foo[bar()]
			else if(token === "(") {
				top = stack.top();
				if(top.type === "Lookup") {
					//!steal-remove-start
					//This line is just for matching stache magic tags elsewhere,
					// because convertToAtLookup modifies the original key
					canReflect.setKeyValue(top, canSymbol.for("can-stache.originalKey"), top.key);
					//!steal-remove-end
					stack.replaceTopAndPush({
						type: "Call",
						method: convertToAtLookup(top)
					});
				} else {
					throw new Error("Unable to understand expression "+tokens.join(''));
				}
			}
			// End Call
			else if(token === ")") {
				stack.popTo(["Call"]);
			}
			// End Call argument
			else if(token === ",") {
				stack.popUntil(["Call"]);
			}
			// Bracket
			else if(token === "[") {
				top = stack.top();
				lastToken = stack.topLastChild();

				if (lastToken && (lastToken.type === "Call" || lastToken.type === "Bracket"  )  ) {
					stack.replaceTopAndPush({type: "Bracket", root: lastToken});
				} else if (top.type === "Lookup" || top.type === "Bracket") {
					stack.replaceTopAndPush({type: "Bracket", root: top});
				} else if (top.type === "Call") {
					stack.addToAndPush(["Call"], { type: "Bracket" });
				} else if (top === " ") {
					stack.popUntil(["Lookup"]);
					convertToHelperIfTopIsLookup(stack);
					stack.addToAndPush(["Helper", "Call", "Hash"], {type: "Bracket"});
				} else {
					stack.replaceTopAndPush({type: "Bracket"});
				}
			}
			// End Bracket
			else if(token === "]") {
				stack.pop();
			}
			else if(token === " ") {
				stack.push(token);
			}
		}
		return stack.root.children[0];
	}
};

module.exports = expression;
