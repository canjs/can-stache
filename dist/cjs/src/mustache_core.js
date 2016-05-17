/*can-stache@3.0.0-pre.4#src/mustache_core*/
var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var Scope = require('can-view-scope');
var compute = require('can-compute');
var ObserveInfo = require('can-observe-info');
var utils = require('./utils.js');
var expression = require('./expression.js');
var types = require('can-util/js/types/types');
var getDocument = require('can-util/dom/document/document');
var frag = require('can-util/dom/frag/frag');
var attr = require('can-util/dom/attr/attr');
var mustacheLineBreakRegExp = /(?:(?:^|(\r?)\n)(\s*)(\{\{([^\}]*)\}\}\}?)([^\S\n\r]*)($|\r?\n))|(\{\{([^\}]*)\}\}\}?)/g, getItemsFragContent = function (items, isObserveList, helperOptions, options) {
        var frag = getDocument().createDocumentFragment();
        for (var i = 0, len = items.length; i < len; i++) {
            append(frag, helperOptions.fn(isObserveList ? items.attr('' + i) : items[i], options));
        }
        return frag;
    }, append = function (frag, content) {
        if (content) {
            frag.appendChild(typeof content === 'string' ? frag.ownerDocument.createTextNode(content) : content);
        }
    }, getItemsStringContent = function (items, isObserveList, helperOptions, options) {
        var txt = '';
        for (var i = 0, len = items.length; i < len; i++) {
            txt += helperOptions.fn(isObserveList ? items.attr('' + i) : items[i], options);
        }
        return txt;
    }, k = function () {
    };
var core = {
    expression: expression,
    makeEvaluator: function (scope, helperOptions, nodeList, mode, exprData, truthyRenderer, falseyRenderer, stringOnly) {
        if (mode === '^') {
            var temp = truthyRenderer;
            truthyRenderer = falseyRenderer;
            falseyRenderer = temp;
        }
        var value, helperOptionArg;
        if (exprData instanceof expression.Call) {
            helperOptionArg = {
                fn: function () {
                },
                inverse: function () {
                },
                context: scope.attr('.'),
                scope: scope,
                nodeList: nodeList,
                exprData: exprData,
                helpersScope: helperOptions
            };
            utils.convertToScopes(helperOptionArg, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer);
            value = exprData.value(scope, helperOptions, helperOptionArg);
            if (exprData.isHelper) {
                return value;
            }
        } else {
            var readOptions = {
                isArgument: true,
                args: [
                    scope.attr('.'),
                    scope
                ],
                asCompute: true
            };
            var helperAndValue = exprData.helperAndValue(scope, helperOptions, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
            var helper = helperAndValue.helper;
            value = helperAndValue.value;
            if (helper) {
                return exprData.evaluator(helper, scope, helperOptions, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
            }
        }
        if (!mode) {
            if (value && value.isComputed) {
                return value;
            } else {
                return function () {
                    return '' + (value != null ? value : '');
                };
            }
        } else if (mode === '#' || mode === '^') {
            helperOptionArg = {
                fn: function () {
                },
                inverse: function () {
                }
            };
            utils.convertToScopes(helperOptionArg, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer);
            return function () {
                var finalValue;
                if (types.isCompute(value)) {
                    finalValue = value();
                } else {
                    finalValue = value;
                }
                if (typeof finalValue === 'function') {
                    return finalValue;
                } else if (typeof finalValue !== 'string' && utils.isArrayLike(finalValue)) {
                    var isObserveList = types.isMapLike(finalValue);
                    if (isObserveList ? finalValue.attr('length') : finalValue.length) {
                        return (stringOnly ? getItemsStringContent : getItemsFragContent)(finalValue, isObserveList, helperOptionArg, helperOptions);
                    } else {
                        return helperOptionArg.inverse(scope, helperOptions);
                    }
                } else {
                    return finalValue ? helperOptionArg.fn(finalValue || scope, helperOptions) : helperOptionArg.inverse(scope, helperOptions);
                }
            };
        } else {
        }
    },
    makeLiveBindingPartialRenderer: function (partialName, state) {
        partialName = partialName.trim();
        return function (scope, options, parentSectionNodeList) {
            var nodeList = [this];
            nodeList.expression = '>' + partialName;
            nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);
            var partialFrag = compute(function () {
                var localPartialName = partialName;
                var partial = options.attr('partials.' + localPartialName), renderer;
                if (partial) {
                    renderer = function () {
                        return partial.render ? partial.render(scope, options, nodeList) : partial(scope, options);
                    };
                } else {
                    var scopePartialName = scope.read(localPartialName, { isArgument: true }).value;
                    if (scopePartialName === null || !scopePartialName && localPartialName[0] === '*') {
                        return frag('');
                    }
                    if (scopePartialName) {
                        localPartialName = scopePartialName;
                    }
                    renderer = function () {
                        if (typeof localPartialName === 'function') {
                            return localPartialName(scope, options, nodeList);
                        } else {
                            return core.getTemplateById(localPartialName)(scope, options, nodeList);
                        }
                    };
                }
                var res = ObserveInfo.notObserve(renderer)();
                return frag(res);
            });
            partialFrag.computeInstance.setPrimaryDepth(nodeList.nesting);
            live.html(this, partialFrag, this.parentNode, nodeList);
        };
    },
    makeStringBranchRenderer: function (mode, expressionString) {
        var exprData = core.expression.parse(expressionString), fullExpression = mode + expressionString;
        if (!(exprData instanceof expression.Helper) && !(exprData instanceof expression.Call)) {
            exprData = new expression.Helper(exprData, [], {});
        }
        return function branchRenderer(scope, options, truthyRenderer, falseyRenderer) {
            var evaluator = scope.__cache[fullExpression];
            if (mode || !evaluator) {
                evaluator = makeEvaluator(scope, options, null, mode, exprData, truthyRenderer, falseyRenderer, true);
                if (!mode) {
                    scope.__cache[fullExpression] = evaluator;
                }
            }
            var res = evaluator();
            return res == null ? '' : '' + res;
        };
    },
    makeLiveBindingBranchRenderer: function (mode, expressionString, state) {
        var exprData = core.expression.parse(expressionString);
        if (!(exprData instanceof expression.Helper) && !(exprData instanceof expression.Call)) {
            exprData = new expression.Helper(exprData, [], {});
        }
        return function branchRenderer(scope, options, parentSectionNodeList, truthyRenderer, falseyRenderer) {
            var nodeList = [this];
            nodeList.expression = expressionString;
            nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);
            var evaluator = makeEvaluator(scope, options, nodeList, mode, exprData, truthyRenderer, falseyRenderer, state.tag);
            var gotCompute = evaluator.isComputed, computeValue;
            if (gotCompute) {
                computeValue = evaluator;
            } else {
                computeValue = compute(evaluator, null, false);
            }
            computeValue.computeInstance.setPrimaryDepth(nodeList.nesting);
            computeValue.computeInstance.bind('change', k);
            var value = computeValue();
            if (typeof value === 'function') {
                ObserveInfo.notObserve(value)(this);
            } else if (gotCompute || computeValue.computeInstance.hasDependencies) {
                if (state.attr) {
                    live.attr(this, state.attr, computeValue);
                } else if (state.tag) {
                    live.attrs(this, computeValue);
                } else if (state.text && typeof value !== 'object') {
                    live.text(this, computeValue, this.parentNode, nodeList);
                } else {
                    live.html(this, computeValue, this.parentNode, nodeList);
                }
            } else {
                if (state.attr) {
                    attr.set(this, state.attr, value);
                } else if (state.tag) {
                    live.attrs(this, value);
                } else if (state.text && typeof value === 'string') {
                    this.nodeValue = value;
                } else if (value != null) {
                    nodeLists.replace([this], frag(value, this.ownerDocument));
                }
            }
            computeValue.computeInstance.unbind('change', k);
        };
    },
    splitModeFromExpression: function (expression, state) {
        expression = expression.trim();
        var mode = expression.charAt(0);
        if ('#/{&^>!'.indexOf(mode) >= 0) {
            expression = expression.substr(1).trim();
        } else {
            mode = null;
        }
        if (mode === '{' && state.node) {
            mode = null;
        }
        return {
            mode: mode,
            expression: expression
        };
    },
    cleanLineEndings: function (template) {
        return template.replace(mustacheLineBreakRegExp, function (whole, returnBefore, spaceBefore, special, expression, spaceAfter, returnAfter, spaceLessSpecial, spaceLessExpression, matchIndex) {
            spaceAfter = spaceAfter || '';
            returnBefore = returnBefore || '';
            spaceBefore = spaceBefore || '';
            var modeAndExpression = splitModeFromExpression(expression || spaceLessExpression, {});
            if (spaceLessSpecial || '>{'.indexOf(modeAndExpression.mode) >= 0) {
                return whole;
            } else if ('^#!/'.indexOf(modeAndExpression.mode) >= 0) {
                return special + (matchIndex !== 0 && returnAfter.length ? returnBefore + '\n' : '');
            } else {
                return spaceBefore + special + spaceAfter + (spaceBefore.length || matchIndex !== 0 ? returnBefore + '\n' : '');
            }
        });
    },
    Options: utils.Options,
    getTemplateById: function () {
    }
};
var makeEvaluator = core.makeEvaluator, splitModeFromExpression = core.splitModeFromExpression;
module.exports = core;