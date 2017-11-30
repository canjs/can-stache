var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var utils = require('../src/utils');
var isFunction = require('can-util/js/is-function/is-function');
var getBaseURL = require('can-util/js/base-url/base-url');
var joinURIs = require('can-util/js/join-uris/join-uris');
var each = require('can-util/js/each/each');
var assign = require('can-util/js/assign/assign');
var isIterable = require("can-util/js/is-iterable/is-iterable");
var dev = require('can-log/dev/dev');
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");
var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var Hashes = require("../expressions/hashes");
var debuggerHelper = require('./-debugger').helper;
var KeyObservable = require("../src/key-observable");
var Observation = require("can-observation");
var TruthyObservable = require("../src/truthy-observable");
var observationRecorder = require("can-observation-recorder");
var lookupPriorities = require("../src/lookup-priorities");

var domData = require('can-util/dom/data/data');

var looksLikeOptions = function(options){
	return options && typeof options.fn === "function" && typeof options.inverse === "function";
};

var getValueSymbol = canSymbol.for("can.getValue"),
	isValueLikeSymbol = canSymbol.for("can.isValueLike");

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

var helpers = {
	"each": {
		metadata: {
			isLiveBound: true
		},
		fn: function(items) {
			var args = [].slice.call(arguments),
				options = args.pop(),
				argsLen = args.length,
				argExprs = options.exprData.argExprs,
				hashExprs = options.exprData.hashExprs,
				resolved = peek(items),
				hashOptions,
				aliases,
				key;

			// Check if using hash
			if (!isEmptyObject(hashExprs)) {
				hashOptions = {};
				each(hashExprs, function (exprs, key) {
					hashOptions[exprs.key] = key;
				})
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
		}
	},
	"index": {
		fn: function(offset, options) {
			if (!options) {
				options = offset;
				offset = 0;
			}
			var index = options.scope.peek("scope.index");
			return ""+((isFunction(index) ? index() : index) + offset);
		}
	},
	'if': {
		fn: function (expr, options) {
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
		}
	},
	'is': {
		fn: function() {
			var lastValue, curValue,
				options = arguments[arguments.length - 1];

			if (arguments.length - 2 <= 0) {
				return options.inverse();
			}

			var args = arguments;
			var callFn = new Observation(function(){
				for (var i = 0; i < args.length - 1; i++) {
					curValue = resolve(args[i]);
					curValue = isFunction(curValue) ? curValue() : curValue;

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
		}
	},
	'eq': {
		fn: function() {
			return helpers.is.fn.apply(this, arguments);
		}
	},
	'unless': {
		fn: function (expr, options) {
			return helpers['if'].fn.apply(this, [expr, assign(assign({}, options), {
				fn: options.inverse,
				inverse: options.fn
			})]);
		}
	},
	'with': {
		fn: function (expr, options) {
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
		}
	},
	'log': {
		fn: function (options) {
			// go through the arguments
			var logs = [];
			each(arguments, function(val){
				if(!looksLikeOptions(val)) {
					logs.push(val);
				}
			});


			if (typeof console !== "undefined" && console.log) {
				if (!logs.length) {
					console.log(options.context);
				} else {
					console.log.apply(console, logs);
				}
			}
		}
	},
	'data': {
		fn: function(attr){
			// options will either be the second or third argument.
			// Get the argument before that.
			var data = arguments.length === 2 ? this : arguments[1];
			return function(el){
				domData.set.call( el, attr, data || this.context );
			};
		}
	},
	'switch': {
		fn: function(expression, options){
			resolve(expression);
			var found = false;
			var localHelpers = options.scope.templateContext.helpers;

			var caseHelper = function(value, options) {
				if(!found && resolve(expression) === resolve(value)) {
					found = true;
					return options.fn(options.scope || this);
				}
			};

			var defaultHelper = function(options) {
				if(!found) {
					return options.fn(options.scope || this);
				}
			};

			canReflect.setKeyValue(localHelpers, 'case', caseHelper);
			canReflect.setKeyValue(localHelpers, 'default', defaultHelper);

			return options.fn(options.scope, options);
		}
	},
	'joinBase': {
		fn: function(firstExpr/* , expr... */){
			var args = [].slice.call(arguments);
			var options = args.pop();

			var moduleReference = args.map( function(expr){
				var value = resolve(expr);
				return isFunction(value) ? value() : value;
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
		}
	}
};

helpers.eachOf = helpers.each;
helpers.debugger = { fn: debuggerHelper };

var registerHelper = function(name, callback, metadata){
	//!steal-remove-start
	if (helpers[name]) {
		dev.warn('The helper ' + name + ' has already been registered.');
	}
	//!steal-remove-end

	helpers[name] = {
		metadata: assign({ isHelper: true, priority: lookupPriorities.GLOBAL_HELPER }, metadata),
		fn: callback
	};
};

var makeSimpleHelper = function(fn) {
	return function() {
		var realArgs = [];
		each(arguments, function(val) {
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
		return registerHelper(name, callback, {
			isLiveBound: true
		});
	},

	getHelper: function(name, scope) {
		var helper = scope && canReflect.getKeyValue(scope.templateContext.helpers, name);

		if (helper) {
			helper = {
				fn: helper,
				metadata: {
					priority: lookupPriorities.LOCAL_HELPER,
				}
			};
		} else {
			helper = assign({}, helpers[name]);

			if (!isEmptyObject(helper)) {
				helper.metadata = assign({ priority: lookupPriorities.BUILT_IN_HELPER }, helper.metadata);
			}
		}

		if (!isEmptyObject(helper)) {
			helper.metadata = assign( helper.metadata, { isHelper: true });
			return helper;
		}
	},

	resolve: resolve,
	resolveHash: resolveHash,
	looksLikeOptions: looksLikeOptions
};
