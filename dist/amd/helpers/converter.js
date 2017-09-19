/*can-stache@3.7.2#helpers/converter*/
define([
    'require',
    'exports',
    'module',
    './core',
    '../src/expression',
    'can-util/js/make-array'
], function (require, exports, module) {
    var helpers = require('./core');
    var expression = require('../src/expression');
    var makeArray = require('can-util/js/make-array');
    helpers.registerConverter = function (name, getterSetter) {
        getterSetter = getterSetter || {};
        helpers.registerHelper(name, function (newVal, source) {
            var args = makeArray(arguments);
            if (newVal instanceof expression.SetIdentifier) {
                return typeof getterSetter.set === 'function' ? getterSetter.set.apply(this, [newVal.value].concat(args.slice(1))) : source(newVal.value);
            } else {
                return typeof getterSetter.get === 'function' ? getterSetter.get.apply(this, args) : args[0];
            }
        });
    };
    module.exports = helpers;
});