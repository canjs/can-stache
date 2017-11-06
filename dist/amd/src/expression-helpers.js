/*can-stache@3.13.2#src/expression-helpers*/
define([
    'require',
    'exports',
    'module',
    '../expressions/arg',
    '../expressions/literal',
    'can-reflect',
    'can-compute',
    'can-stache-key',
    'can-symbol',
    'can-util/js/dev'
], function (require, exports, module) {
    var Arg = require('../expressions/arg');
    var Literal = require('../expressions/literal');
    var canReflect = require('can-reflect');
    var compute = require('can-compute');
    var observeReader = require('can-stache-key');
    var canSymbol = require('can-symbol');
    var dev = require('can-util/js/dev');
    var getObservableValue_fromKey = function (key, scope, readOptions) {
        var data = scope.computeData(key, readOptions);
        compute.temporarilyBind(data);
        return data;
    };
    function computeHasDependencies(compute) {
        return compute[canSymbol.for('can.valueHasDependencies')] ? canReflect.valueHasDependencies(compute) : compute.computeInstance.hasDependencies;
    }
    function getObservableValue_fromDynamicKey_fromObservable(key, root, helperOptions, readOptions) {
        var computeValue = compute(function (newVal) {
            var keyValue = canReflect.getValue(key);
            var rootValue = canReflect.getValue(root);
            keyValue = ('' + keyValue).replace('.', '\\.');
            if (arguments.length) {
                observeReader.write(rootValue, observeReader.reads(keyValue), newVal);
            } else {
                return observeReader.get(rootValue, keyValue);
            }
        });
        compute.temporarilyBind(computeValue);
        return computeValue;
    }
    function convertToArgExpression(expr) {
        if (!(expr instanceof Arg) && !(expr instanceof Literal)) {
            return new Arg(expr);
        } else {
            return expr;
        }
    }
    function toComputeOrValue(value) {
        if (canReflect.isObservableLike(value)) {
            if (canReflect.valueHasDependencies(value) === false) {
                return canReflect.getValue(value);
            }
            if (value.compute) {
                return value.compute;
            }
        }
        return value;
    }
    function toCompute(value) {
        if (value) {
            if (value.isComputed) {
                return value;
            }
            if (value.compute) {
                return value.compute;
            }
        }
        return value;
    }
    module.exports = {
        getObservableValue_fromKey: getObservableValue_fromKey,
        computeHasDependencies: computeHasDependencies,
        getObservableValue_fromDynamicKey_fromObservable: getObservableValue_fromDynamicKey_fromObservable,
        convertToArgExpression: convertToArgExpression,
        toComputeOrValue: toComputeOrValue,
        toCompute: toCompute
    };
});