/*can-stache@3.13.0#src/lookup-value-or-helper*/
define([
    'require',
    'exports',
    'module',
    './expression-helpers',
    '../helpers/core'
], function (require, exports, module) {
    var expressionHelpers = require('./expression-helpers');
    var mustacheHelpers = require('../helpers/core');
    function lookupValueOrHelper(key, scope, helperOptions, readOptions) {
        var scopeKeyData = expressionHelpers.getObservableValue_fromKey(key, scope, readOptions);
        var result = { value: scopeKeyData };
        if (key.charAt(0) === '@' && key !== '@index') {
            key = key.substr(1);
        }
        if (scopeKeyData.initialValue === undefined || mustacheHelpers.helpers[key]) {
            var helper = mustacheHelpers.getHelper(key, helperOptions);
            result.helper = helper && helper.fn;
        }
        return result;
    }
    module.exports = lookupValueOrHelper;
});