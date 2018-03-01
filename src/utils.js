var Scope = require('can-view-scope');
var ObservationRecorder = require('can-observation-recorder');
var observationReader = require('can-stache-key');
var canReflect = require('can-reflect');
var KeyObservable = require("./key-observable");
var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var isArrayLike = require('can-util/js/is-array-like/is-array-like');

// this creates a noop that marks that a renderer was called
// this is for situations where a helper function calls a renderer
// that was not provided such as
// {{#if false}} ... {{/if}}
// with no {{else}}
var createNoOpRenderer = function (metadata) {
	return function noop() {
		if (metadata) {
			metadata.rendered = true;
		}
	};
};

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
	createRenderers: function(helperOptions, scope, nodeList, truthyRenderer, falseyRenderer, isStringOnly){
		helperOptions.fn = truthyRenderer ? this.makeRendererConvertScopes(truthyRenderer, scope, nodeList, isStringOnly, helperOptions.metadata) : createNoOpRenderer(helperOptions.metadata);
		helperOptions.inverse = falseyRenderer ? this.makeRendererConvertScopes(falseyRenderer, scope, nodeList, isStringOnly, helperOptions.metadata) : createNoOpRenderer(helperOptions.metadata);
		helperOptions.isSection = !!(truthyRenderer || falseyRenderer);
	},
	// Returns a new renderer function that makes sure any data or helpers passed
	// to it are converted to a can.view.Scope and a can.view.Options.
	makeRendererConvertScopes: function (renderer, parentScope, nodeList, observeObservables, metadata) {
		var rendererWithScope = function(ctx, parentNodeList){
			if (metadata) {
				metadata.rendered = true;
			}
			return renderer(ctx || parentScope, parentNodeList);
		};
		var convertedRenderer = function (newScope, newOptions, parentNodeList) {
			// prevent binding on fn.
			// If a non-scope value is passed, add that to the parent scope.
			if (newScope !== undefined && !(newScope instanceof Scope)) {
				if (parentScope) {
					newScope = parentScope.add(newScope);
				}
				else {
					newScope = new Scope(newScope || {});
				}
			}

			var result = rendererWithScope(newScope, parentNodeList || nodeList );
			return result;
		};
		return observeObservables ? convertedRenderer :
			ObservationRecorder.ignore(convertedRenderer);
	},
	// Calls the truthy subsection for each item in a list and returning them in a string.
	getItemsStringContent: function(items, isObserveList, helperOptions){
		var txt = "",
			len = observationReader.get(items, 'length'),
			isObservable = canReflect.isObservableLike(items);

		for (var i = 0; i < len; i++) {
			var item = isObservable ? new KeyObservable(items, i) :items[i];
			txt += helperOptions.fn(item);
		}
		return txt;
	},
	// Calls the truthy subsection for each item in a list and returns them in a document Fragment.
	getItemsFragContent: function(items, helperOptions, scope) {
		var result = [],
			len = observationReader.get(items, 'length'),
			isObservable = canReflect.isObservableLike(items),
			hashExprs = helperOptions.exprData && helperOptions.exprData.hashExprs,
			hashOptions;

		// Check if using hash
		if (!isEmptyObject(hashExprs)) {
			hashOptions = {};
			canReflect.eachKey(hashExprs, function (exprs, key) {
				hashOptions[exprs.key] = key;
			});
		}

		for (var i = 0; i < len; i++) {
			var aliases = {};

			var item = isObservable ? new KeyObservable(items, i) :items[i];

			if (!isEmptyObject(hashOptions)) {
				if (hashOptions.value) {
					aliases[hashOptions.value] = item;
				}
				if (hashOptions.index) {
					aliases[hashOptions.index] = i;
				}
			}

			result.push(helperOptions.fn(
				scope
				.add(aliases, { notContext: true })
				.add({ index: i }, { special: true })
				.add(item))
			);
		}
		return result;
	}
};
