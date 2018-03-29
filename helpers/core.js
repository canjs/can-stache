var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var utils = require('../src/utils');
var getBaseURL = require('can-util/js/base-url/base-url');
var joinURIs = require('can-util/js/join-uris/join-uris');
var assign = require('can-assign');
var dev = require('can-log/dev/dev');
var canReflect = require("can-reflect");
var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var debuggerHelper = require('./-debugger').helper;
var KeyObservable = require("../src/key-observable");
var Observation = require("can-observation");
var TruthyObservable = require("../src/truthy-observable");
var observationRecorder = require("can-observation-recorder");
var helpers = require("can-stache-helpers");

var domData = require('can-dom-data');
var domDataState = require('can-dom-data-state');

var looksLikeOptions = function(options){
	return options && typeof options.fn === "function" && typeof options.inverse === "function";
};

var resolve = function (value) {
	if (value && canReflect.isValueLike(value)) {
		return canReflect.getValue(value);
	} else {
		return value;
	}
};

var resolveHash = function(hash){
	var params = {};
	for(var prop in hash) {
		params[prop] = resolve(hash[prop]);
	}
	return params;
};

var peek = observationRecorder.ignore(resolve);

var eachHelper = function(items) {
	var args = [].slice.call(arguments),
		options = args.pop(),
		hashExprs = options.exprData.hashExprs,
		resolved = peek(items),
		hashOptions,
		aliases;

	// Check if using hash
	if (!isEmptyObject(hashExprs)) {
		hashOptions = {};
		canReflect.eachKey(hashExprs, function (exprs, key) {
			hashOptions[exprs.key] = key;
		});
	}

	if ((
		canReflect.isObservableLike(resolved) && canReflect.isListLike(resolved) ||
			( utils.isArrayLike(resolved) && canReflect.isValueLike(items))
	) && !options.stringOnly) {
		return function(el){
			// make a child nodeList inside the can.view.live.html nodeList
			// so that if the html is re
			var nodeList = [el];
			nodeList.expression = "live.list";
			nodeLists.register(nodeList, null, options.nodeList, true);
			// runs nest replacements
			nodeLists.update(options.nodeList, [el]);

			var cb = function (item, index, parentNodeList) {
				var aliases = {};

				if (!isEmptyObject(hashOptions)) {
					if (hashOptions.value) {
						aliases[hashOptions.value] = item;
					}
					if (hashOptions.index) {
						aliases[hashOptions.index] = index;
					}
				}

				return options.fn(
					options.scope
					.add(aliases, { notContext: true })
					.add({ index: index }, { special: true })
					.add(item),
				options.options,
				parentNodeList
				);
			};

			live.list(el, items, cb, options.context, el.parentNode, nodeList, function(list, parentNodeList){
				return options.inverse(options.scope.add(list), options.options, parentNodeList);
			});
		};
	}

	var expr = resolve(items),
		result;

	if (!!expr && utils.isArrayLike(expr)) {
		result = utils.getItemsFragContent(expr, options, options.scope);
		return options.stringOnly ? result.join('') : result;
	} else if (canReflect.isObservableLike(expr) && canReflect.isMapLike(expr) || expr instanceof Object) {
		result = [];
		canReflect.each(expr, function(val, key){
			var value = new KeyObservable(expr, key);
			aliases = {};

			if (!isEmptyObject(hashOptions)) {
				if (hashOptions.value) {
					aliases[hashOptions.value] = value;
				}
				if (hashOptions.key) {
					aliases[hashOptions.key] = key;
				}
			}
			result.push(options.fn(
				options.scope
				.add(aliases, { notContext: true })
				.add({ key: key }, { special: true })
				.add(value)
			));
		});

		return options.stringOnly ? result.join('') : result;
	}
};
eachHelper.isLiveBound = true;
eachHelper.requiresOptionsArgument = true;
eachHelper.ignoreArgLookup = function ignoreArgLookup(index) {
	return index === 1;
};

var indexHelper = function(offset, options) {
	if (!options) {
		options = offset;
		offset = 0;
	}
	var index = options.scope.peek("scope.index");
	return ""+((typeof(index) === "function" ? index() : index) + offset);
};
indexHelper.requiresOptionsArgument = true;

var ifHelper = function (expr, options) {
	var value;
	// if it's a function, wrap its value in a compute
	// that will only change values from true to false
	if (expr && canReflect.isValueLike(expr)) {
		value = canReflect.getValue(new TruthyObservable(expr));
	} else {
		value = !! resolve(expr);
	}

	if (value) {
		return options.fn(options.scope || this);
	} else {
		return options.inverse(options.scope || this);
	}
};
ifHelper.requiresOptionsArgument = true;

var isHelper = function() {
	var lastValue, curValue,
		options = arguments[arguments.length - 1];

	if (arguments.length - 2 <= 0) {
		return options.inverse();
	}

	var args = arguments;
	var callFn = new Observation(function(){
		for (var i = 0; i < args.length - 1; i++) {
			curValue = resolve(args[i]);
			curValue = typeof curValue === "function" ? curValue() : curValue;

			if (i > 0) {
				if (curValue !== lastValue) {
					return false;
				}
			}
			lastValue = curValue;
		}
		return true;
	});

	return callFn.get() ? options.fn() : options.inverse();
};
isHelper.requiresOptionsArgument = true;

var unlessHelper = function (expr, options) {
	return ifHelper.apply(this, [expr, assign(assign({}, options), {
		fn: options.inverse,
		inverse: options.fn
	})]);
};
unlessHelper.requiresOptionsArgument = true;

var withHelper = function (expr, options) {
	var ctx = expr;
	if(!options) {
		// hash-only case if no current context expression
		options = expr;
		expr = true;
		ctx = options.hash;
	} else {
		expr = resolve(expr);
		if(options.hash && !isEmptyObject(options.hash)) {
			// presumably rare case of both a context object AND hash keys
			// Leaving it undocumented for now, but no reason not to support it.
			ctx = options.scope.add(options.hash, { notContext: true }).add(ctx);
		}
	}
	return options.fn(ctx || {});
};
withHelper.requiresOptionsArgument = true;

var dataHelper = function(attr, value) {
	var data = (looksLikeOptions(value) ? value.context : value) || this;
	return function setData(el) {
		//!steal-remove-start
		dev.warn('The {{data}} helper has been deprecated; use {{domData}} instead: https://canjs.com/doc/can-stache.helpers.domData.html');
		//!steal-remove-end
		domDataState.set.call( el, attr, data );
	};
};

var domDataHelper = function(attr, value) {
	var data = (looksLikeOptions(value) ? value.context : value) || this;
	return function setDomData(el) {
		domData.set( el, attr, data );
	};
};

var switchHelper = function(expression, options){
	resolve(expression);
	var found = false;

	var caseHelper = function(value, options) {
		if(!found && resolve(expression) === resolve(value)) {
			found = true;
			return options.fn(options.scope.peek('this') || this);
		}
	};
	caseHelper.requiresOptionsArgument = true;

	// create default helper as a value-like function
	// so that either {{#default}} or {{#default()}} will work
	var defaultHelper = function(options) {
		if (!found) {
			return options ? options.scope.peek('this') : true;
		}
	};
	defaultHelper.requiresOptionsArgument = true;
	canReflect.assignSymbols(defaultHelper, {
		"can.isValueLike": true,
		"can.isFunctionLike": false,
		"can.getValue": function() {
			// pass the helperOptions passed to {{#switch}}
			return this(options);
		}
	});

	var newScope = options.scope.add({
		case: caseHelper,
		default: defaultHelper
	}, { notContext: true });

	return options.fn(newScope, options);
};
switchHelper.requiresOptionsArgument = true;

var joinBaseHelper = function(firstExpr/* , expr... */){
	var args = [].slice.call(arguments);
	var options = args.pop();

	var moduleReference = args.map( function(expr){
		var value = resolve(expr);
		return typeof value === "function" ? value() : value;
	}).join("");

	var templateModule = canReflect.getKeyValue(options.scope.templateContext.helpers, 'module');
	var parentAddress = templateModule ? templateModule.uri: undefined;

	var isRelative = moduleReference[0] === ".";

	if(isRelative && parentAddress) {
		return joinURIs(parentAddress, moduleReference);
	} else {
		var baseURL = (typeof System !== "undefined" &&
			(System.renderingBaseURL || System.baseURL)) ||	getBaseURL();

		// Make sure one of them has a needed /
		if(moduleReference[0] !== "/" && baseURL[baseURL.length - 1] !== "/") {
			baseURL += "/";
		}

		return joinURIs(baseURL, moduleReference);
	}
};
joinBaseHelper.requiresOptionsArgument = true;

var builtInHelpers = {
	'debugger': debuggerHelper,
	each: eachHelper,
	eachOf: eachHelper,
	index: indexHelper,
	'if': ifHelper,
	is: isHelper,
	eq: isHelper,
	unless: unlessHelper,
	'with': withHelper,
	console: console,
	data: dataHelper,
	domData: domDataHelper,
	'switch': switchHelper,
	joinBase: joinBaseHelper,

};

var addBuiltInHelpers = function() {
	canReflect.each(builtInHelpers, function(helper, helperName) {
		helpers[helperName] = helper;
	});
};

// add all the built-in helpers when stache is loaded
addBuiltInHelpers();

var registerHelper = function(name, callback){
	//!steal-remove-start
	if (helpers[name]) {
		dev.warn('The helper ' + name + ' has already been registered.');
	}
	//!steal-remove-end

	// mark passed in helper so it will be automatically passed
	// helperOptions (.fn, .inverse, etc) when called as Call Expressions
	callback.requiresOptionsArgument = true;

	// store on global helpers list
	helpers[name] = callback;
};

var makeSimpleHelper = function(fn) {
	return function() {
		var realArgs = [];
		canReflect.eachIndex(arguments, function(val) {
			while (val && val.isComputed) {
				val = val();
			}
			realArgs.push(val);
		});
		return fn.apply(this, realArgs);
	};
};

module.exports = {
	registerHelper: registerHelper,

	addHelper: function(name, callback) {
		return registerHelper(name, makeSimpleHelper(callback));
	},

	// add helpers that set up their own internal live-binding
	// these helpers will not be wrapped in computes and will
	// receive observable arguments when called with Call Expressions
	addLiveHelper: function(name, callback) {
		callback.isLiveBound = true;
		return registerHelper(name, callback);
	},

	getHelper: function(name, scope) {
		var helper = scope && scope.getHelper(name);

		if (!helper) {
			helper = helpers[name];
		}

		return helper;
	},

	resolve: resolve,
	resolveHash: resolveHash,
	looksLikeOptions: looksLikeOptions,
	__resetHelpers: function() {
		// remove all helpers from can-stache-helpers object
		for (var helper in helpers) {
			delete helpers[helper];
		}

		addBuiltInHelpers();
	}
};
