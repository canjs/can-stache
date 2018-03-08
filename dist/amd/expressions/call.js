/*can-stache@3.14.11#expressions/call*/
define([
    'require',
    'exports',
    'module',
    'can-view-scope',
    './hashes',
    '../src/set-identifier',
    'can-compute',
    'can-reflect',
    'can-symbol',
    'can-util/js/assign',
    'can-util/js/is-empty-object',
    '../src/expression-helpers'
], function (require, exports, module) {
    var Scope = require('can-view-scope');
    var Hashes = require('./hashes');
    var SetIdentifier = require('../src/set-identifier');
    var compute = require('can-compute');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var assign = require('can-util/js/assign');
    var isEmptyObject = require('can-util/js/is-empty-object');
    var expressionHelpers = require('../src/expression-helpers');
    var Call = function (methodExpression, argExpressions) {
        this.methodExpr = methodExpression;
        this.argExprs = argExpressions.map(expressionHelpers.convertToArgExpression);
    };
    Call.prototype.args = function (scope, helperOptions) {
        var hashExprs = {};
        var args = [];
        for (var i = 0, len = this.argExprs.length; i < len; i++) {
            var arg = this.argExprs[i];
            if (arg.expr instanceof Hashes) {
                assign(hashExprs, arg.expr.hashExprs);
            }
            var value = arg.value.apply(arg, arguments);
            args.push({
                call: !arg.modifiers || !arg.modifiers.compute,
                value: value
            });
        }
        return function (doNotWrapArguments) {
            var finalArgs = [];
            if (!isEmptyObject(hashExprs)) {
                finalArgs.hashExprs = hashExprs;
            }
            for (var i = 0, len = args.length; i < len; i++) {
                if (doNotWrapArguments) {
                    finalArgs[i] = args[i].value;
                } else {
                    finalArgs[i] = args[i].call ? canReflect.getValue(args[i].value) : expressionHelpers.toCompute(args[i].value);
                }
            }
            return finalArgs;
        };
    };
    Call.prototype.value = function (scope, helperScope, helperOptions) {
        var method = this.methodExpr.value(scope, helperScope);
        var metadata = method.metadata || {};
        assign(this, metadata);
        var getArgs = this.args(scope, helperScope);
        var computeValue = compute(function (newVal) {
            var func = canReflect.getValue(method.fn || method);
            if (typeof func === 'function') {
                var args = getArgs(metadata.isLiveBound);
                if (metadata.isHelper && helperOptions) {
                    helperOptions.helpers = helperOptions.helpers || new Scope.Options({});
                    if (args.hashExprs && helperOptions.exprData) {
                        helperOptions.exprData.hashExprs = args.hashExprs;
                    }
                    args.push(helperOptions);
                }
                if (arguments.length) {
                    args.unshift(new SetIdentifier(newVal));
                }
                return func.apply(null, args);
            }
        });
        compute.temporarilyBind(computeValue);
        return computeValue;
    };
    Call.prototype.closingTag = function () {
        return this.methodExpr.key;
    };
    module.exports = Call;
});