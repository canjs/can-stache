/*can-stache@3.13.0#expressions/hashes*/
define([
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-compute',
    '../src/expression-helpers'
], function (require, exports, module) {
    var canReflect = require('can-reflect');
    var compute = require('can-compute');
    var expressionHelpers = require('../src/expression-helpers');
    var Hashes = function (hashes) {
        this.hashExprs = hashes;
    };
    Hashes.prototype.value = function (scope, helperOptions) {
        var hash = {};
        for (var prop in this.hashExprs) {
            var val = expressionHelpers.convertToArgExpression(this.hashExprs[prop]), value = val.value.apply(val, arguments);
            hash[prop] = {
                call: !val.modifiers || !val.modifiers.compute,
                value: value
            };
        }
        return compute(function () {
            var finalHash = {};
            for (var prop in hash) {
                finalHash[prop] = hash[prop].call ? canReflect.getValue(hash[prop].value) : expressionHelpers.toComputeOrValue(hash[prop].value);
            }
            return finalHash;
        });
    };
    module.exports = Hashes;
});