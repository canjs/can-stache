/*can-stache@3.0.0-pre.8#src/text_section*/
define(function (require, exports, module) {
    var target = require('can-view-target');
    var Scope = require('can-view-scope');
    var compute = require('can-compute');
    var live = require('can-view-live');
    var utils = require('./utils');
    var mustacheCore = require('./mustache_core');
    var getDocument = require('can-util/dom/document');
    var attr = require('can-util/dom/attr');
    var assign = require('can-util/js/assign');
    var last = require('can-util/js/last');
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
                var computeValue = compute(function () {
                    return renderer(scope, options);
                }, null, false);
                computeValue.computeInstance.addEventListener('change', noop);
                var value = computeValue();
                if (computeValue.computeInstance.hasDependencies) {
                    if (state.textContentOnly) {
                        live.text(this, computeValue);
                    } else if (state.attr) {
                        live.attr(this, state.attr, computeValue);
                    } else {
                        live.attrs(this, computeValue, scope, options);
                    }
                    computeValue.computeInstance.removeEventListener('change', noop);
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