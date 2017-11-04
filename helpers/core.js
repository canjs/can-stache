var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var compute = require('can-compute');
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

var domData = require('can-util/dom/data/data');

var looksLikeOptions = function(options){
	return options && typeof options.fn === "function" && typeof options.inverse === "function";
};

var resolve = function (value) {
	if (value && value[canSymbol.for("can.isValueLike")] && value[canSymbol.for("can.getValue")]) {
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


var helpers = {
	"each": function(items) {
		var args = [].slice.call(arguments),
			options = args.pop(),
			argsLen = args.length,
			argExprs = options.exprData.argExprs,
			hashExprs = options.exprData.hashExprs,
			resolved = resolve(items),
			asVariable,
			hashOptions,
			aliases,
			key;

		if ((argsLen === 2 && !(argExprs[1].expr instanceof Hashes)) || (argsLen === 3 && argExprs[1].key === 'as')) {
			asVariable = args[argsLen - 1];

			if (typeof asVariable !== 'string') {
				asVariable = argExprs[argsLen - 1].key;
			}
			//!steal-remove-start
			dev.warn('can-stache: Using the `as` keyword is deprecated in favor of hash expressions. https://canjs.com/doc/can-stache.helpers.each.html');
			dev.warn('can-stache: Do not use `{{#' + options.nodeList.expression + '}}`, instead use `{{#' + options.nodeList.expression.split(' ')[0] + ' ' + options.nodeList.expression.split(' ')[1] + ' ' + asVariable + '=value}}`');
			//!steal-remove-end
		}

		// Check if using hash
		if (!isEmptyObject(hashExprs)) {
			hashOptions = {};
			each(hashExprs, function (exprs, key) {
				hashOptions[exprs.key] = key;
			})
		}

		if ((
				canReflect.isObservableLike(resolved) && canReflect.isListLike(resolved) ||
				( utils.isArrayLike(resolved) && items.isComputed )
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
					var aliases = {
						"%index": index,
						"@index": index
					};

					//!steal-remove-start
					Object.defineProperty(aliases, '%index', {
						get: function() {
							var filename = options.scope.peek('scope.filename');
							var lineNumber = options.scope.peek('scope.lineNumber');
							dev.warn(
								(filename ? filename + ':' : '') +
								(lineNumber ? lineNumber + ': ' : '') +
								'%index is deprecated. Use scope.index instead.'
							);
							return index;
						}
					});

					Object.defineProperty(aliases, '@index', {
						get: function() {
							var filename = options.scope.peek('scope.filename');
							var lineNumber = options.scope.peek('scope.lineNumber');
							dev.warn(
								(filename ? filename + ':' : '') +
								(lineNumber ? lineNumber + ': ' : '') +
								'@index is deprecated. Use scope.index instead.'
							);
							return index;
						}
					});
					//!steal-remove-end

					if (asVariable) {
						aliases[asVariable] = item;
					}

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
							.add(item)
							.add({ index: index }, { special: true }),
						options.options, parentNodeList
					);
				};

				live.list(el, items, cb, options.context, el.parentNode, nodeList, function(list, parentNodeList){
					return options.inverse(options.scope.add(list), options.options, parentNodeList);
				});
			};
		}

		var expr = resolved,
			result;
		if (canReflect.isObservableLike(expr) && canReflect.isMapLike(expr)) {
			result = [];
			(expr.forEach || expr.each).call(expr, function(val, key){
				var value = compute(expr, key);

				aliases = {
					"%key": key,
					"@key": key
				};

				//!steal-remove-start
				Object.defineProperty(aliases, '%key', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'%key is deprecated. Use scope.key instead.'
						);
						return key;
					}
				});

				Object.defineProperty(aliases, '@key', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'@key is deprecated. Use scope.key instead.'
						);
						return key;
					}
				});
				//!steal-remove-end

				if (asVariable) {
					aliases[asVariable] = value;
				}
				if (!isEmptyObject(hashOptions)) {
					if (hashOptions.value) {
						aliases[hashOptions.value] = value;
					}
					if (hashOptions.key) {
						aliases[hashOptions.key] = key;
					}
				}
				result.push(options.fn(options.scope.add(aliases, { notContext: true }).add(value)));
			});

			return options.stringOnly ? result.join('') : result;
		} else if(Array.isArray(expr)) {
			result = [];
			each(expr, function(value, index){

				aliases = {
					"%index": index,
					"@index": index
				};

				//!steal-remove-start
				Object.defineProperty(aliases, '%index', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'%index is deprecated. Use scope.index instead.'
						);
						return index;
					}
				});

				Object.defineProperty(aliases, '@index', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'@index is deprecated. Use scope.index instead.'
						);
						return index;
					}
				});
				//!steal-remove-end

				if (asVariable) {
					aliases[asVariable] = value;
				}

				if (!isEmptyObject(hashOptions)) {
					if (hashOptions.value) {
						aliases[hashOptions.value] = value;
					}
					if (hashOptions.index) {
						aliases[hashOptions.index] = index;
					}
				}
				result.push(options.fn(options.scope.add(aliases, { notContext: true }).add(value)));
			});
			return options.stringOnly ? result.join('') : result;
		} else if(expr instanceof Object) {
			result = [];
			each(expr, function(value, key){

				aliases = {
					"%key": key,
					"@key": key
				};

				//!steal-remove-start
				Object.defineProperty(aliases, '%key', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'%key is deprecated. Use scope.key instead.'
						);
						return key;
					}
				});

				Object.defineProperty(aliases, '@key', {
					get: function() {
						var filename = options.scope.peek('scope.filename');
						var lineNumber = options.scope.peek('scope.lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							'@key is deprecated. Use scope.key instead.'
						);
						return key;
					}
				});
				//!steal-remove-end

				if (asVariable) {
					aliases[asVariable] = value;
				}

				if (!isEmptyObject(hashOptions)) {
					if (hashOptions.value) {
						aliases[hashOptions.value] = value;
					}
					if (hashOptions.key) {
						aliases[hashOptions.key] = key;
					}
				}
				result.push(options.fn(options.scope.add(aliases, { notContext: true }).add(value)));
			});
			return options.stringOnly ? result.join('') : result;
		}
	},
	"@index": function(offset, options) {
		if (!options) {
			options = offset;
			offset = 0;
		}
		var index = options.scope.peek("@index");
		return ""+((isFunction(index) ? index() : index) + offset);
	},
	'if': function (expr, options) {
		var value;
		// if it's a function, wrap its value in a compute
		// that will only change values from true to false
		if (expr && expr.isComputed) {
			value = compute.truthy(expr)();
		} else {
			value = !! resolve(expr);
		}

		if (value) {
			return options.fn(options.scope || this);
		} else {
			return options.inverse(options.scope || this);
		}
	},
	'is': function() {
		var lastValue, curValue,
		options = arguments[arguments.length - 1];

		if (arguments.length - 2 <= 0) {
			return options.inverse();
		}

		var args = arguments;
		var callFn = compute(function(){
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

		return callFn() ? options.fn() : options.inverse();
	},
	'eq': function() {
		return helpers.is.apply(this, arguments);
	},
	'unless': function (expr, options) {
		return helpers['if'].apply(this, [expr, assign(assign({}, options), {
			fn: options.inverse,
			inverse: options.fn
		})]);
	},
	'with': function (expr, options) {
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
				ctx = options.scope.add(options.hash).add(ctx);
			}
		}
		return options.fn(ctx || {});
	},
	'log': function (options) {
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
	},
	'data': function(attr){
		// options will either be the second or third argument.
		// Get the argument before that.
		var data = arguments.length === 2 ? this : arguments[1];
		return function(el){
			domData.set.call( el, attr, data || this.context );
		};
	},
	'switch': function(expression, options){
		resolve(expression);
		var found = false;
		var newOptions = options.helpers.add({
			"case": function(value, options){
				if(!found && resolve(expression) === resolve(value)) {
					found = true;
					return options.fn(options.scope || this);
				}
			},
			"default": function(options){
				if(!found) {
					return options.fn(options.scope || this);
				}
			}
		});
		return options.fn(options.scope, newOptions);
	},
	'joinBase': function(firstExpr/* , expr... */){
		var args = [].slice.call(arguments);
		var options = args.pop();

		var moduleReference = args.map( function(expr){
			var value = resolve(expr);
			return isFunction(value) ? value() : value;
		}).join("");

		var templateModule = options.helpers.peek("helpers.module");
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
};

helpers.eachOf = helpers.each;
helpers.debugger = debuggerHelper;

var registerHelper = function(name, callback){
	//!steal-remove-start
	if (helpers[name]) {
		dev.warn('The helper ' + name + ' has already been registered.');
	}
	//!steal-remove-end

	helpers[name] = callback;
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
	registerSimpleHelper: function(name, callback) {
		registerHelper(name, makeSimpleHelper(callback));
	},
	getHelper: function(name, options){

		var helper = options && options.get && options.get("helpers." + name,{proxyMethods: false});
		if(!helper) {
			helper = helpers[name];
		}
		if(helper) {
			return {fn: helper};
		}
	},
	resolve: resolve,
	resolveHash: resolveHash,
	looksLikeOptions: looksLikeOptions,
	helpers: assign({}, helpers)
};
