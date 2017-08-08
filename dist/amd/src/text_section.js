/*can-stache@3.3.3#src/text_section*/
define([
    'require',
    'exports',
    'module',
    'can-compute',
    'can-view-live',
    './utils',
    'can-util/dom/attr',
    'can-util/js/assign',
    'can-reflect',
    'can-observation'
], function (require, exports, module) {
    var compute = require('can-compute');
    var live = require('can-view-live');
    var utils = require('./utils');
    var attr = require('can-util/dom/attr');
    var assign = require('can-util/js/assign');
    var canReflect = require('can-reflect');
    var Observation = require('can-observation');
    var noop = function () {
    };
    var TextSectionBuilder = function () {
        this.stack = [new TextSection()];
    };
    assign(TextSectionBuilder.prototype, utils.mixins);
    assign(TextSectionBuilder.prototype, {
        startSection: function (process) {
            var subSection = new TextSection();
            this.last().add({
                process: process,
                truthy: subSection
            });
            this.stack.push(subSection);
        },
        endSection: function () {
            this.stack.pop();
        },
        inverse: function () {
            this.stack.pop();
            var falseySection = new TextSection();
            this.last().last().falsey = falseySection;
            this.stack.push(falseySection);
        },
        compile: function (state) {
            var renderer = this.stack[0].compile();
            return function (scope, options) {
                var observation = new Observation(function () {
                    return renderer(scope, options);
                }, null, { isObservable: false });
                canReflect.onValue(observation, noop);
                var value = canReflect.getValue(observation);
                if (canReflect.valueHasDependencies(observation)) {
                    if (state.textContentOnly) {
                        live.text(this, observation);
                    } else if (state.attr) {
                        live.attr(this, state.attr, observation);
                    } else {
                        live.attrs(this, observation, scope, options);
                    }
                    canReflect.offValue(observation, noop);
                } else {
                    if (state.textContentOnly) {
                        this.nodeValue = value;
                    } else if (state.attr) {
                        attr.set(this, state.attr, value);
                    } else {
                        live.attrs(this, value);
                    }
                }
            };
        }
    });
    var passTruthyFalsey = function (process, truthy, falsey) {
        return function (scope, options) {
            return process.call(this, scope, options, truthy, falsey);
        };
    };
    var TextSection = function () {
        this.values = [];
    };
    assign(TextSection.prototype, {
        add: function (data) {
            this.values.push(data);
        },
        last: function () {
            return this.values[this.values.length - 1];
        },
        compile: function () {
            var values = this.values, len = values.length;
            for (var i = 0; i < len; i++) {
                var value = this.values[i];
                if (typeof value === 'object') {
                    values[i] = passTruthyFalsey(value.process, value.truthy && value.truthy.compile(), value.falsey && value.falsey.compile());
                }
            }
            return function (scope, options) {
                var txt = '', value;
                for (var i = 0; i < len; i++) {
                    value = values[i];
                    txt += typeof value === 'string' ? value : value.call(this, scope, options);
                }
                return txt;
            };
        }
    });
    module.exports = TextSectionBuilder;
});