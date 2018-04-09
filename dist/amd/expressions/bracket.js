/*can-stache@3.14.14#expressions/bracket*/
define([
    'require',
    'exports',
    'module',
    '../src/expression-helpers'
], function (require, exports, module) {
    var expressionHelpers = require('../src/expression-helpers');
    var Bracket = function (key, root, originalKey) {
        this.root = root;
        this.key = key;
    };
    Bracket.prototype.value = function (scope, helpers) {
        var root = this.root ? this.root.value(scope, helpers) : scope.peek('.');
        return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key.value(scope, helpers), root, scope, helpers, {});
    };
    Bracket.prototype.closingTag = function () {
    };
    module.exports = Bracket;
});