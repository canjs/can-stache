/*can-stache@3.14.3#expressions/helper-scope-lookup*/
define([
    'require',
    'exports',
    'module',
    './lookup',
    '../src/expression-helpers'
], function (require, exports, module) {
    var Lookup = require('./lookup');
    var expressionHelpers = require('../src/expression-helpers');
    var HelperScopeLookup = function () {
        Lookup.apply(this, arguments);
    };
    HelperScopeLookup.prototype.value = function (scope, helperOptions) {
        return expressionHelpers.getObservableValue_fromKey(this.key, scope, {
            callMethodsOnObservables: true,
            isArgument: true,
            args: [
                scope.peek('.'),
                scope
            ]
        });
    };
    module.exports = HelperScopeLookup;
});