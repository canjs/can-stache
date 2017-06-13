/*can-stache@3.1.0-pre.6#src/html_section*/
define(function (require, exports, module) {
    var target = require('can-view-target');
    var Scope = require('can-view-scope');
    var Observation = require('can-observation');
    var utils = require('./utils');
    var mustacheCore = require('./mustache_core');
    var getDocument = require('can-util/dom/document');
    var assign = require('can-util/js/assign');
    var last = require('can-util/js/last');
    var decodeHTML = typeof document !== 'undefined' && function () {
        var el = getDocument().createElement('div');
        return function (html) {
            if (html.indexOf('&') === -1) {
                return html.replace(/\r\n/g, '\n');
            }
            el.innerHTML = html;
            return el.childNodes.length === 0 ? '' : el.childNodes.item(0).nodeValue;
        };
    }();
    var HTMLSectionBuilder = function () {
        this.stack = [new HTMLSection()];
    };
    assign(HTMLSectionBuilder.prototype, utils.mixins);
    assign(HTMLSectionBuilder.prototype, {
        startSubSection: function (process) {
            var newSection = new HTMLSection(process);
            this.stack.push(newSection);
            return newSection;
        },
        endSubSectionAndReturnRenderer: function () {
            if (this.last().isEmpty()) {
                this.stack.pop();
                return null;
            } else {
                var htmlSection = this.endSection();
                return htmlSection.compiled.hydrate.bind(htmlSection.compiled);
            }
        },
        startSection: function (process) {
            var newSection = new HTMLSection(process);
            this.last().add(newSection.targetCallback);
            this.stack.push(newSection);
        },
        endSection: function () {
            this.last().compile();
            return this.stack.pop();
        },
        inverse: function () {
            this.last().inverse();
        },
        compile: function () {
            var compiled = this.stack.pop().compile();
            return Observation.ignore(function (scope, options, nodeList) {
                if (!(scope instanceof Scope)) {
                    scope = Scope.refsScope().add(scope || {});
                }
                if (!(options instanceof mustacheCore.Options)) {
                    options = new mustacheCore.Options(options || {});
                }
                return compiled.hydrate(scope, options, nodeList);
            });
        },
        push: function (chars) {
            this.last().push(chars);
        },
        pop: function () {
            return this.last().pop();
        }
    });
    var HTMLSection = function (process) {
        this.data = 'targetData';
        this.targetData = [];
        this.targetStack = [];
        var self = this;
        this.targetCallback = function (scope, options, sectionNode) {
            process.call(this, scope, options, sectionNode, self.compiled.hydrate.bind(self.compiled), self.inverseCompiled && self.inverseCompiled.hydrate.bind(self.inverseCompiled));
        };
    };
    assign(HTMLSection.prototype, {
        inverse: function () {
            this.inverseData = [];
            this.data = 'inverseData';
        },
        push: function (data) {
            this.add(data);
            this.targetStack.push(data);
        },
        pop: function () {
            return this.targetStack.pop();
        },
        add: function (data) {
            if (typeof data === 'string') {
                data = decodeHTML(data);
            }
            if (this.targetStack.length) {
                last(this.targetStack).children.push(data);
            } else {
                this[this.data].push(data);
            }
        },
        compile: function () {
            this.compiled = target(this.targetData, getDocument());
            if (this.inverseData) {
                this.inverseCompiled = target(this.inverseData, getDocument());
                delete this.inverseData;
            }
            this.targetStack = this.targetData = null;
            return this.compiled;
        },
        children: function () {
            if (this.targetStack.length) {
                return last(this.targetStack).children;
            } else {
                return this[this.data];
            }
        },
        isEmpty: function () {
            return !this.targetData.length;
        }
    });
    HTMLSectionBuilder.HTMLSection = HTMLSection;
    module.exports = HTMLSectionBuilder;
});