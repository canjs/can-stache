/*can-stache@3.13.4#helpers/-debugger*/
define([
    'require',
    'exports',
    'module',
    'can-log'
], function (require, exports, module) {
    var canLog = require('can-log');
    function noop() {
    }
    ;
    var resolveValue = noop;
    var evaluateArgs = noop;
    var __testing = {};
    function debuggerHelper(left, right) {
        canLog.warn('Forgotten {{debugger}} helper');
    }
    module.exports = {
        helper: debuggerHelper,
        evaluateArgs: evaluateArgs,
        resolveValue: resolveValue,
        __testing: __testing
    };
});