/*can-stache@3.0.0-pre.1#src/utils*/
var Scope = require('can-view-scope');
var ObserveInfo = require('can-observe-info');
var isArrayLike = require('can-util/js/is-array-like/is-array-like');
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
    convertToScopes: function (helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer) {
        if (truthyRenderer) {
            helperOptions.fn = this.makeRendererConvertScopes(truthyRenderer, scope, options, nodeList);
        }
        if (falseyRenderer) {
            helperOptions.inverse = this.makeRendererConvertScopes(falseyRenderer, scope, options, nodeList);
        }
    },
    makeRendererConvertScopes: function (renderer, parentScope, parentOptions, nodeList) {
        var rendererWithScope = function (ctx, opts, parentNodeList) {
            return renderer(ctx || parentScope, opts, parentNodeList);
        };
        return ObserveInfo.notObserve(function (newScope, newOptions, parentNodeList) {
            if (newScope !== undefined && !(newScope instanceof Scope)) {
                newScope = parentScope.add(newScope);
            }
            if (newOptions !== undefined && !(newOptions instanceof Options)) {
                newOptions = parentOptions.add(newOptions);
            }
            var result = rendererWithScope(newScope, newOptions || parentOptions, parentNodeList || nodeList);
            return result;
        });
    },
    Options: Options
};