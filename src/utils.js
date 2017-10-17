var Scope = require('can-view-scope');
var Observation = require('can-observation');
var observationReader = require('can-stache-key');
var canReflect = require('can-reflect');
var KeyObservable = require("./key-observable");

var isArrayLike = require('can-util/js/is-array-like/is-array-like');
	// ## can.view.Options
	//
	// This contains the local helpers, partials, and tags available to a template.

var Options = Scope.Options; // jshint ignore:line
var noop = function () {};

module.exports = {
	// Returns if something looks like an array.  This works for can.List
	isArrayLike: isArrayLike,
	// A generic empty function
	emptyHandler: function(){},
	// Converts a string like "1" into 1. "null" into null, etc.
	// This doesn't have to do full JSON, so removing eval would be good.
	jsonParse: function(str){
		// if it starts with a quote, assume a string.
		if(str[0] === "'") {
			return str.substr(1, str.length -2);
		} else if(str === "undefined") {
			return undefined;
		} else {
			return JSON.parse(str);
		}
	},
	mixins: {
		last: function(){
			return this.stack[this.stack.length - 1];
		},
		add: function(chars){
			this.last().add(chars);
		},
		subSectionDepth: function(){
			return this.stack.length - 1;
		}
	},
	// Sets .fn and .inverse on a helperOptions object and makes sure
	// they can reference the current scope and options.
	convertToScopes: function(helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer, isStringOnly){
		helperOptions.fn = truthyRenderer ? this.makeRendererConvertScopes(truthyRenderer, scope, options, nodeList, isStringOnly) : noop;
		helperOptions.inverse = falseyRenderer ? this.makeRendererConvertScopes(falseyRenderer, scope, options, nodeList, isStringOnly) : noop;
		helperOptions.isSection = !!(truthyRenderer || falseyRenderer);
	},
	// Returns a new renderer function that makes sure any data or helpers passed
	// to it are converted to a can.view.Scope and a can.view.Options.
	makeRendererConvertScopes: function (renderer, parentScope, parentOptions, nodeList, observeObservables) {
		var rendererWithScope = function(ctx, opts, parentNodeList){
			return renderer(ctx || parentScope, opts, parentNodeList);
		};
		var convertedRenderer = function (newScope, newOptions, parentNodeList) {
			// prevent binding on fn.
			// If a non-scope value is passed, add that to the parent scope.
			if (newScope !== undefined && !(newScope instanceof Scope)) {
				if (parentScope) {
					newScope = parentScope.add(newScope);
				}
				else {
					newScope = Scope.refsScope().add(newScope || {});
				}
			}
			if (newOptions !== undefined && !(newOptions instanceof Options)) {
				newOptions = parentOptions.add(newOptions);
			}
			var result = rendererWithScope(newScope, newOptions || parentOptions, parentNodeList || nodeList );
			return result;
		};
		return observeObservables ? convertedRenderer : Observation.ignore(convertedRenderer);
	},
	// Calls the truthy subsection for each item in a list and returning them in a string.
	getItemsStringContent: function(items, isObserveList, helperOptions, options){
		var txt = "",
			len = observationReader.get(items, 'length'),
			isObservable = canReflect.isObservableLike(items);

		for (var i = 0; i < len; i++) {
			var item = isObservable ? new KeyObservable(items, i) :items[i];
			txt += helperOptions.fn(item, options);
		}
		return txt;
	},
	// Calls the truthy subsection for each item in a list and returns them in a document Fragment.
	getItemsFragContent: function(items, helperOptions, scope, asVariable) {
		var result = [],
			len = observationReader.get(items, 'length'),
			isObservable = canReflect.isObservableLike(items);

		for (var i = 0; i < len; i++) {
			var aliases = {
				"%index": i
			};
			var item = isObservable ? new KeyObservable(items, i) :items[i];

			if (asVariable) {
				aliases[asVariable] = item;
			}
			result.push(helperOptions.fn(scope.add(aliases, { notContext: true }).add(item)));
		}
		return result;
	},
	Options: Options
};
