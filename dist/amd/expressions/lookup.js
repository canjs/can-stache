/*can-stache@3.14.6#expressions/lookup*/
define([
    'require',
    'exports',
    'module',
    '../src/expression-helpers',
    '../src/lookup-value-or-helper',
    'can-util/js/assign'
], function (require, exports, module) {
    var expressionHelpers = require('../src/expression-helpers');
    var lookupValueOrHelper = require('../src/lookup-value-or-helper');
    var assign = require('can-util/js/assign');
    var Lookup = function (key, root) {
        this.key = key;
        this.rootExpr = root;
    };
    Lookup.prototype.value = function (scope, helperOptions) {
        if (this.rootExpr) {
            return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
        } else {
            var result = lookupValueOrHelper(this.key, scope, helperOptions);
            assign(this, result.metadata);
            return result.helper || result.value;
        }
    };
    module.exports = Lookup;
});