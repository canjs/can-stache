/*can-stache@3.1.0-pre.1#src/utils*/
define(function (require, exports, module) {
    var Scope = require('can-view-scope');
    var Observation = require('can-observation');
    var observationReader = require('can-observation/reader');
    var compute = require('can-compute');
    var types = require('can-types');
    var isArrayLike = require('can-util/js/is-array-like');
    var Options = Scope.Options;
    module.exports = {
        isArrayLike: isArrayLike,
        emptyHandler: function () {
        },
        jsonParse: function (str) {
            if (str[0] === '\'') {
                return str.substr(1, str.length - 2);
            } else if (str === 'undefined') {
                return undefined;
            } else {
                return JSON.parse(str);
            }
        },
        mixins: {
            last: function () {
                return this.stack[this.stack.length - 1];
            },
            add: function (chars) {
                this.last().add(chars);
            },
            subSectionDepth: function () {
                return this.stack.length - 1;
            }
        },
        convertToScopes: function (helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer, isStringOnly) {
            if (truthyRenderer) {
                helperOptions.fn = this.makeRendererConvertScopes(truthyRenderer, scope, options, nodeList, isStringOnly);
            }
            if (falseyRenderer) {
                helperOptions.inverse = this.makeRendererConvertScopes(falseyRenderer, scope, options, nodeList, isStringOnly);
            }
        },
        makeRendererConvertScopes: function (renderer, parentScope, parentOptions, nodeList, observeObservables) {
            var rendererWithScope = function (ctx, opts, parentNodeList) {
                return renderer(ctx || parentScope, opts, parentNodeList);
            };
            var convertedRenderer = function (newScope, newOptions, parentNodeList) {
                if (newScope !== undefined && !(newScope instanceof Scope)) {
                    newScope = parentScope.add(newScope);
                }
                if (newOptions !== undefined && !(newOptions instanceof Options)) {
                    newOptions = parentOptions.add(newOptions);
                }
                var result = rendererWithScope(newScope, newOptions || parentOptions, parentNodeList || nodeList);
                return result;
            };
            return observeObservables ? convertedRenderer : Observation.ignore(convertedRenderer);
        },
        getItemsStringContent: function (items, isObserveList, helperOptions, options) {
            var txt = '', len = observationReader.get(items, 'length'), isObservable = types.isMapLike(items) || types.isListLike(items);
            for (var i = 0; i < len; i++) {
                var item = isObservable ? compute(items, '' + i) : items[i];
                txt += helperOptions.fn(item, options);
            }
            return txt;
        },
        getItemsFragContent: function (items, helperOptions, scope, asVariable) {
            var result = [], len = observationReader.get(items, 'length'), isObservable = types.isMapLike(items) || types.isListLike(items);
            for (var i = 0; i < len; i++) {
                var aliases = {
                    '%index': i,
                    '@index': i
                };
                var item = isObservable ? compute(items, '' + i) : items[i];
                if (asVariable) {
                    aliases[asVariable] = item;
                }
                result.push(helperOptions.fn(scope.add(aliases, { notContext: true }).add(item)));
            }
            return result;
        },
        Options: Options
    };
});