/*can-stache@3.14.12#expressions/helper-lookup*/
define([
    'require',
    'exports',
    'module',
    './lookup',
    '../src/lookup-value-or-helper'
], function (require, exports, module) {
    var Lookup = require('./lookup');
    var lookupValueOrHelper = require('../src/lookup-value-or-helper');
    var HelperLookup = function () {
        Lookup.apply(this, arguments);
    };
    HelperLookup.prototype.value = function (scope, helperOptions) {
        var result = lookupValueOrHelper(this.key, scope, helperOptions, {
            isArgument: true,
            args: [
                scope.peek('.'),
                scope
            ]
        });
        return result.helper || result.value;
    };
    module.exports = HelperLookup;
});