/*can-stache@3.14.4#expressions/helper*/
define([
    'require',
    'exports',
    'module',
    './literal',
    'can-compute',
    'can-util/js/assign',
    'can-util/js/dev',
    'can-util/js/is-empty-object',
    '../src/expression-helpers',
    '../src/utils',
    '../helpers/core'
], function (require, exports, module) {
    var Literal = require('./literal');
    var compute = require('can-compute');
    var assign = require('can-util/js/assign');
    var dev = require('can-util/js/dev');
    var isEmptyObject = require('can-util/js/is-empty-object');
    var expressionHelpers = require('../src/expression-helpers');
    var utils = require('../src/utils');
    var mustacheHelpers = require('../helpers/core');
    var Helper = function (methodExpression, argExpressions, hashExpressions) {
        this.methodExpr = methodExpression;
        this.argExprs = argExpressions;
        this.hashExprs = hashExpressions;
        this.mode = null;
    };
    Helper.prototype.args = function (scope, helperOptions) {
        var args = [];
        for (var i = 0, len = this.argExprs.length; i < len; i++) {
            var arg = this.argExprs[i];
            args.push(expressionHelpers.toComputeOrValue(arg.value.apply(arg, arguments)));
        }
        return args;
    };
    Helper.prototype.hash = function (scope, helperOptions) {
        var hash = {};
        for (var prop in this.hashExprs) {
            var val = this.hashExprs[prop];
            hash[prop] = expressionHelpers.toComputeOrValue(val.value.apply(val, arguments));
        }
        return hash;
    };
    Helper.prototype.helperAndValue = function (scope, helperOptions) {
        var looksLikeAHelper = this.argExprs.length || !isEmptyObject(this.hashExprs), helper, computeData, methodKey = this.methodExpr instanceof Literal ? '' + this.methodExpr._value : this.methodExpr.key, initialValue, args;
        if (looksLikeAHelper) {
            helper = mustacheHelpers.getHelper(methodKey, helperOptions);
        }
        if (!helper) {
            computeData = expressionHelpers.getObservableValue_fromKey(methodKey, scope, { isArgument: true });
            if (typeof computeData.initialValue === 'function') {
                args = this.args(scope, helperOptions).map(expressionHelpers.toComputeOrValue);
                var functionResult = compute(function () {
                    return computeData.initialValue.apply(null, args);
                });
                compute.temporarilyBind(functionResult);
                return { value: functionResult };
            } else if (typeof computeData.initialValue !== 'undefined') {
                return { value: computeData };
            }
            if (!looksLikeAHelper && initialValue === undefined) {
                helper = mustacheHelpers.getHelper(methodKey, helperOptions);
            }
        }
        return {
            value: computeData,
            args: args,
            helper: helper && helper.fn
        };
    };
    Helper.prototype.evaluator = function (helper, scope, helperOptions, readOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly) {
        var helperOptionArg = { stringOnly: stringOnly }, context = scope.peek('.'), args = this.args(scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly), hash = this.hash(scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
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
        return function () {
            return helper.apply(context, args);
        };
    };
    Helper.prototype.value = function (scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly) {
        var helperAndValue = this.helperAndValue(scope, helperOptions);
        var helper = helperAndValue.helper;
        if (!helper) {
            return helperAndValue.value;
        }
        var fn = this.evaluator(helper, scope, helperOptions, nodeList, truthyRenderer, falseyRenderer, stringOnly);
        var computeValue = compute(fn);
        compute.temporarilyBind(computeValue);
        if (!expressionHelpers.computeHasDependencies(computeValue)) {
            return computeValue();
        } else {
            return computeValue;
        }
    };
    Helper.prototype.closingTag = function () {
        return this.methodExpr.key;
    };
    module.exports = Helper;
});