/*can-stache@3.13.2#expressions/scope-lookup*/
define([
    'require',
    'exports',
    'module',
    '../src/expression-helpers',
    './lookup'
], function (require, exports, module) {
    var expressionHelpers = require('../src/expression-helpers');
    var Lookup = require('./lookup');
    var ScopeLookup = function (key, root) {
        Lookup.apply(this, arguments);
    };
    ScopeLookup.prototype.value = function (scope, helperOptions) {
        if (this.rootExpr) {
            return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
        }
        return expressionHelpers.getObservableValue_fromKey(this.key, scope, helperOptions);
    };
    module.exports = ScopeLookup;
});