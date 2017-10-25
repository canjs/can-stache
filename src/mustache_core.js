//
// This provides helper utilities for Mustache processing. Currently,
// only stache uses these helpers.  Ideally, these utilities could be used
// in other libraries implementing Mustache-like features.
var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var compute = require('can-compute');
var Observation = require('can-observation');
var utils = require('./utils');
var expression = require('./expression');
var frag = require("can-util/dom/frag/frag");
var attr = require("can-util/dom/attr/attr");
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");
var dev = require("can-log/dev/dev");


// ## Types

// A lookup is an object that is used to identify a lookup in the scope.
/**
 * @hide
 * @typedef {{get: String}} can.stache.Lookup
 * @option {String} get A value in the scope to look up.
 */


// ## Helpers

var mustacheLineBreakRegExp = /(?:(^|\r?\n)(\s*)(\{\{([\s\S]*)\}\}\}?)([^\S\n\r]*)($|\r?\n))|(\{\{([\s\S]*)\}\}\}?)/g,
	mustacheWhitespaceRegExp = /(\s*)(\{\{\{?)(-?)([\s\S]*?)(-?)(\}\}\}?)(\s*)/g,
	k = function(){};


var core = {
	expression: expression,
	// ## mustacheCore.makeEvaluator
	// Given a scope and expression, returns a function that evaluates that expression in the scope.
	//
	// This function first reads lookup values in the args and hash.  Then it tries to figure out
	// if a helper is being called or a value is being read.  Finally, depending on
	// if it's a helper, or not, and which mode the expression is in, it returns
	// a function that can quickly evaluate the expression.
	/**
	 * @hide
	 * Given a mode and expresion data, returns a function that evaluates that expression.
	 * @param {can-view-scope} The scope in which the expression is evaluated.
	 * @param {can.view.Options} The option helpers in which the expression is evaluated.
	 * @param {String} mode Either null, #, ^. > is handled elsewhere
	 * @param {Object} exprData Data about what was in the mustache expression
	 * @param {renderer} [truthyRenderer] Used to render a subsection
	 * @param {renderer} [falseyRenderer] Used to render the inverse subsection
	 * @param {String} [stringOnly] A flag to indicate that only strings will be returned by subsections.
	 * @return {Function} An 'evaluator' function that evaluates the expression.
	 */
	makeEvaluator: function (scope, helperOptions, nodeList, mode, exprData, truthyRenderer, falseyRenderer, stringOnly) {

		if(mode === "^") {
			var temp = truthyRenderer;
			truthyRenderer = falseyRenderer;
			falseyRenderer = temp;
		}

		var value,
			helperOptionArg;

		if(exprData instanceof expression.Call) {
			helperOptionArg =  {
				context: scope.peek("."),
				scope: scope,
				nodeList: nodeList,
				exprData: exprData,
				helpersScope: helperOptions
			};
			utils.convertToScopes(helperOptionArg, scope,helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);

			value = exprData.value(scope, helperOptions, helperOptionArg);
			if(exprData.isHelper) {
				return value;
			}
		} else if (exprData instanceof expression.Bracket) {
			value = exprData.value(scope);
			if(exprData.isHelper) {
				return value;
			}
		} else if (exprData instanceof expression.Lookup) {
			value = exprData.value(scope);
			if(exprData.isHelper) {
				return value;
			}
		} else if (exprData instanceof expression.Helper && exprData.methodExpr instanceof expression.Bracket) {
			// Brackets get wrapped in Helpers when used in attributes
			// like `<p class="{{ foo[bar] }}" />`
			value = exprData.methodExpr.value(scope);
			if(exprData.isHelper) {
				return value;
			}
		} else {
			var readOptions = {
				// will return a function instead of calling it.
				// allowing it to be turned into a compute if necessary.
				isArgument: true,
				args: [scope.peek('.'), scope],
				asCompute: true
			};
			var helperAndValue = exprData.helperAndValue(scope, helperOptions, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
			var helper = helperAndValue.helper;
			value = helperAndValue.value;

			if(helper) {
				return exprData.evaluator(helper, scope, helperOptions, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
			}
		}

		// Return evaluators for no mode.
		if(!mode) {
			// If it's computed, return a function that just reads the compute.
			return value;
		} else if( mode === "#" || mode === "^" ) {
			// Setup renderers.
			helperOptionArg = {};
			utils.convertToScopes(helperOptionArg, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
			return function(){
				// Get the value
				var finalValue = canReflect.getValue(value);

				if(typeof finalValue === "function") {
					return finalValue;
				}
				// If it's an array, render.
				else if ( typeof finalValue !== "string" && utils.isArrayLike(finalValue) ) {
					var isObserveList = canReflect.isObservableLike(finalValue) &&
						canReflect.isListLike(finalValue);

					if(isObserveList ? finalValue.attr("length") : finalValue.length) {
						if (stringOnly) {
							return utils.getItemsStringContent(finalValue, isObserveList, helperOptionArg, helperOptions);
						} else {
							return frag(utils.getItemsFragContent(finalValue, helperOptionArg, scope));
						}
					} else {
						return helperOptionArg.inverse(scope, helperOptions);
					}
				}
				// If truthy, render fn, otherwise, inverse.
				else {
					return finalValue ? helperOptionArg.fn(finalValue || scope, helperOptions) : helperOptionArg.inverse(scope, helperOptions);
				}
			};
		} else {
			// not supported!
		}
	},
	// ## mustacheCore.makeLiveBindingPartialRenderer
	// Returns a renderer function that live binds a partial.
	/**
	 * @hide
	 * Returns a renderer function that live binds a partial.
	 * @param {String} expressionString
	 * @param {Object} state The html state of where the expression was found.
	 * @return {function(this:HTMLElement,can-view-scope,can.view.Options)} A renderer function
	 * live binds a partial.
	 */
	makeLiveBindingPartialRenderer: function(expressionString, state){
		expressionString = expressionString.trim();
		var exprData,
				partialName = expressionString.split(/\s+/).shift();

		if(partialName !== expressionString) {
			exprData = core.expression.parse(expressionString);
		}

		return function(scope, options, parentSectionNodeList){
			var nodeList = [this];
			nodeList.expression = ">" + partialName;
			nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);

			var partialFrag = compute(function(){
				var localPartialName = partialName;
				// If the second parameter of a partial is a custom context
				if(exprData && exprData.argExprs.length === 1) {
					var newContext = canReflect.getValue( exprData.argExprs[0].value(scope, options) );
					if(typeof newContext === "undefined") {
						//!steal-remove-start
						dev.warn('The context ('+ exprData.argExprs[0].key +') you passed into the' +
							'partial ('+ partialName +') is not defined in the scope!');
						//!steal-remove-end
					}else{
						scope = scope.add(newContext);
					}
				}
				// Look up partials in options first.
				var partial = options.peek("partials." + localPartialName);
				partial = partial || ( options.inlinePartials && options.inlinePartials[ localPartialName ] );
				var renderer;
				if (partial) {
					renderer = function() {
						return partial.render ? partial.render(scope, options, nodeList)
							: partial(scope, options);
					};
				}
				// Use can.view to get and render the partial.
				else {
					var scopePartialName = scope.read(localPartialName, {
						isArgument: true
					}).value;

					if (scopePartialName === null || !scopePartialName && localPartialName[0] === '*') {
						return frag("");
					}
					if (scopePartialName) {
						localPartialName = scopePartialName;
					}

					renderer = function() {
						if(typeof localPartialName === "function"){
							return localPartialName(scope, options, nodeList);
						} else {
							return core.getTemplateById(localPartialName)(scope, options, nodeList);
						}

					};
				}
				var res = Observation.ignore(renderer)();
				return frag(res);
			});

			partialFrag.computeInstance.setPrimaryDepth(nodeList.nesting);

			live.html(this, partialFrag, this.parentNode, nodeList);
		};
	},
	// ## mustacheCore.makeStringBranchRenderer
	// Return a renderer function that evalutes to a string and caches
	// the evaluator on the scope.
	/**
	 * @hide
	 * Return a renderer function that evaluates to a string.
	 * @param {String} mode
	 * @param {can.stache.Expression} expression
	 * @return {function(can.view.Scope,can.view.Options, can-stache.renderer, can.view.renderer)}
	 */
	makeStringBranchRenderer: function(mode, expressionString){
		var exprData = core.expression.parse(expressionString),
			// Use the full mustache expression as the cache key.
			fullExpression = mode+expressionString;

		// convert a lookup like `{{value}}` to still be called as a helper if necessary.
		if(!(exprData instanceof expression.Helper) && !(exprData instanceof expression.Call)) {
			exprData = new expression.Helper(exprData,[],{});
		}

		// A branching renderer takes truthy and falsey renderer.
		var branchRenderer = function branchRenderer(scope, options, truthyRenderer, falseyRenderer){
			// Check the scope's cache if the evaluator already exists for performance.
			var evaluator = scope.__cache[fullExpression];
			if(mode || !evaluator) {
				evaluator = makeEvaluator( scope, options, null, mode, exprData, truthyRenderer, falseyRenderer, true);
				if(!mode) {
					scope.__cache[fullExpression] = evaluator;
				}
			}
			var gotObservableValue = evaluator[canSymbol.for("can.onValue")],
				res;

			// Run the evaluator and return the result.
			if(gotObservableValue) {
				res = canReflect.getValue(evaluator);
			} else {
				res = evaluator();
			}


			return res == null ? "" : ""+res;
		};

		branchRenderer.exprData = exprData;

		return branchRenderer;
	},
	// ## mustacheCore.makeLiveBindingBranchRenderer
	// Return a renderer function that evaluates the mustache expression and
	// sets up live binding if a compute with dependencies is found. Otherwise,
	// the element's value is set.
	//
	// This function works by creating a `can.compute` from the mustache expression.
	// If the compute has dependent observables, it passes the compute to `can.view.live`; otherwise,
	// it updates the element's property based on the compute's value.
	/**
	 * @hide
	 * Returns a renderer function that evaluates the mustache expression.
	 * @param {String} mode
	 * @param {can.stache.Expression} expression
	 * @param {Object} state The html state of where the expression was found.
	 */
	makeLiveBindingBranchRenderer: function(mode, expressionString, state){

		// Pre-process the expression.
		var exprData = core.expression.parse(expressionString);
		if(!(exprData instanceof expression.Helper) && !(exprData instanceof expression.Call) && !(exprData instanceof expression.Bracket) && !(exprData instanceof expression.Lookup)) {
			exprData = new expression.Helper(exprData,[],{});
		}
		// A branching renderer takes truthy and falsey renderer.
		var branchRenderer = function branchRenderer(scope, options, parentSectionNodeList, truthyRenderer, falseyRenderer){

			var nodeList = [this];
			nodeList.expression = expressionString;
			// register this nodeList.
			// Regsiter it with its parent ONLY if this is directly nested.  Otherwise, it's unencessary.
			nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);


			// Get the evaluator. This does not need to be cached (probably) because if there
			// an observable value, it will be handled by `can.view.live`.
			var evaluator = makeEvaluator( scope, options, nodeList, mode, exprData, truthyRenderer, falseyRenderer,
				// If this is within a tag, make sure we only get string values.
				state.tag );

			// Create a compute that can not be observed by other
			// comptues. This is important because this renderer is likely called by
			// parent expresions.  If this value changes, the parent expressions should
			// not re-evaluate. We prevent that by making sure this compute is ignored by
			// everyone else.
			//var compute = can.compute(evaluator, null, false);
			var gotObservableValue = evaluator[canSymbol.for("can.onValue")];
			var observable;
			if(gotObservableValue) {
				observable = evaluator;
			} else {
				observable = new Observation(evaluator,null,{isObservable: false});
			}



			if(observable instanceof Observation) {
				observable.compute._primaryDepth = nodeList.nesting;
			} else if(observable.computeInstance) {
				observable.computeInstance.setPrimaryDepth(nodeList.nesting);
			} else if(observable.observation) {
				observable.observation.compute._primaryDepth = nodeList.nesting;
			}

			// Bind on the computeValue to set the cached value. This helps performance
			// so live binding can read a cached value instead of re-calculating.
			canReflect.onValue(observable, k);

			var value = canReflect.getValue(observable);

			// If value is a function, it's a helper that returned a function.
			if(typeof value === "function") {

				// A helper function should do it's own binding.  Similar to how
				// we prevented this function's compute from being noticed by parent expressions,
				// we hide any observables read in the function by saving any observables that
				// have been read and then setting them back which overwrites any `can.__observe` calls
				// performed in value.
				Observation.ignore(value)(this);

			}
			// If the computeValue has observable dependencies, setup live binding.
			else if( canReflect.valueHasDependencies(observable) ) {

				// Depending on where the template is, setup live-binding differently.
				if(state.attr) {
					live.attr(this, state.attr, observable);
				}
				else if( state.tag )  {
					live.attrs( this, observable );
				}
				else if(state.text && typeof value !== "object"){
					live.text(this, observable, this.parentNode, nodeList);
				}
				else {
					live.html(this, observable, this.parentNode, nodeList);
				}
			}
			// If the computeValue has no observable dependencies, just set the value on the element.
			else {

				if(state.attr) {
					attr.set(this, state.attr, value);
				}
				else if(state.tag) {
					live.attrs(this, value);
				}
				else if(state.text && typeof value === "string") {
					this.nodeValue = value;
				}
				else if( value != null ){
					nodeLists.replace([this], frag(value, this.ownerDocument));
				}
			}
			// Unbind the compute.
			canReflect.offValue(observable, k);
		};

		branchRenderer.exprData = exprData;

		return branchRenderer;
	},
	// ## mustacheCore.splitModeFromExpression
	// Returns the mustache mode split from the rest of the expression.
	/**
	 * @hide
	 * Returns the mustache mode split from the rest of the expression.
	 * @param {can.stache.Expression} expression
	 * @param {Object} state The state of HTML where the expression was found.
	 */
	splitModeFromExpression: function(expression, state){
		expression = expression.trim();
		var mode = expression.charAt(0);

		if( "#/{&^>!<".indexOf(mode) >= 0 ) {
			expression =  expression.substr(1).trim();
		} else {
			mode = null;
		}
		// Triple braces do nothing within a tag.
		if(mode === "{" && state.node) {
			mode = null;
		}
		return {
			mode: mode,
			expression: expression
		};
	},
	// ## mustacheCore.cleanLineEndings
	// Removes line breaks accoding to the mustache specification.
	/**
	 * @hide
	 * Prunes line breaks accoding to the mustache specification.
	 * @param {String} template
	 * @return {String}
	 */
	cleanLineEndings: function(template){

		// Finds mustache tags with space around them or no space around them.
		return template.replace( mustacheLineBreakRegExp,
			function(whole,
				returnBefore,
				spaceBefore,
				special,
				expression,
				spaceAfter,
				returnAfter,
				// A mustache magic tag that has no space around it.
				spaceLessSpecial,
				spaceLessExpression,
				matchIndex){

			// IE 8 will provide undefined
			spaceAfter = (spaceAfter || "");
			returnBefore = (returnBefore || "");
			spaceBefore = (spaceBefore || "");

			var modeAndExpression = splitModeFromExpression(expression || spaceLessExpression,{});

			// If it's a partial or tripple stache, leave in place.
			if(spaceLessSpecial || ">{".indexOf( modeAndExpression.mode) >= 0) {
				return whole;
			}  else if( "^#!/".indexOf(  modeAndExpression.mode ) >= 0 ) {
				// Return the magic tag and a trailing linebreak if this did not
				// start a new line and there was an end line.
				// Add a normalized leading space, if there was any leading space, in case this abuts a tag name
				spaceBefore = (returnBefore + spaceBefore) && " ";
				return spaceBefore+special+( matchIndex !== 0 && returnAfter.length ? returnBefore+"\n" :"");


			} else {
				// There is no mode, return special with spaces around it.
				return spaceBefore+special+spaceAfter+(spaceBefore.length || matchIndex !== 0 ? returnBefore+"\n" : "");
			}

		});
	},
	// ## mustacheCore.cleanWhitespaceControl
	// Removes whitespace according to the whitespace control.
	/**
	 * @hide
	 * Prunes whitespace according to the whitespace control.
	 * @param {String} template
	 * @return {String}
	 */
	cleanWhitespaceControl: function(template) {

		return template.replace(mustacheWhitespaceRegExp, function(
			whole,
			spaceBefore,
			bracketBefore,
			controlBefore,
			expression,
			controlAfter,
			bracketAfter,
			spaceAfter,
			matchIndex
		) {

			if (controlBefore === '-') {
				spaceBefore = '';
			}

			if (controlAfter === '-') {
				spaceAfter = '';
			}

			return spaceBefore + bracketBefore + expression + bracketAfter + spaceAfter;

		});
	},
	Options: utils.Options,
	getTemplateById: function(){}
};

// ## Local Variable Cache
//
// The following creates slightly more quickly accessible references of the following
// core functions.
var makeEvaluator = core.makeEvaluator,
	splitModeFromExpression = core.splitModeFromExpression;

module.exports = core;
