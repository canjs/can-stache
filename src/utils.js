var Scope = require('can-view-scope');
var Observation = require('can-observation');

var isArrayLike = require('can-util/js/is-array-like/is-array-like');
	// ## can.view.Options
	//
	// This contains the local helpers, partials, and tags available to a template.
	/**
	 * @hide
	 * The Options scope.
	 */
var Options = Scope.Options; // jshint ignore:line

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
	convertToScopes: function(helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer){
		// overwrite fn and inverse to always convert to scopes
		if(truthyRenderer) {
			helperOptions.fn = this.makeRendererConvertScopes(truthyRenderer, scope, options, nodeList);
		}
		if(falseyRenderer) {
			helperOptions.inverse = this.makeRendererConvertScopes(falseyRenderer, scope, options, nodeList);
		}
	},
	// Returns a new renderer function that makes sure any data or helpers passed
	// to it are converted to a can.view.Scope and a can.view.Options.
	makeRendererConvertScopes: function (renderer, parentScope, parentOptions, nodeList) {
		var rendererWithScope = function(ctx, opts, parentNodeList){
			return renderer(ctx || parentScope, opts, parentNodeList);
		};
		return Observation.ignore(function (newScope, newOptions, parentNodeList) {
			// prevent binding on fn.
			// If a non-scope value is passed, add that to the parent scope.
			if (newScope !== undefined && !(newScope instanceof Scope)) {
				newScope = parentScope.add(newScope);
			}
			if (newOptions !== undefined && !(newOptions instanceof Options)) {
				newOptions = parentOptions.add(newOptions);
			}
			var result = rendererWithScope(newScope, newOptions || parentOptions, parentNodeList|| nodeList );
			return result;
		});
	},
	Options: Options
};
