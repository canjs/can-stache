/*can-stache@3.0.0-pre.4#helpers/core*/
var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');
var compute = require('can-compute');
var utils = require('../src/utils.js');
var types = require('can-util/js/types/types');
var isFunction = require('can-util/js/is-function/is-function');
var each = require('can-util/js/each/each');
var assign = require('can-util/js/assign/assign');
var domData = require('can-util/dom/data/data');
var resolve = function (value) {
    if (types.isListLike(value) && value.attr('length')) {
        return value;
    } else if (isFunction(value)) {
        return value();
    } else {
        return value;
    }
};
var resolveHash = function (hash) {
    var params = {};
    for (var prop in hash) {
        var value = hash[prop];
        if (value && value.isComputed) {
            params[prop] = value();
        } else {
            params[prop] = value;
        }
    }
    return params;
};
var helpers = {
    'each': function (items, options) {
        var resolved = resolve(items), result = [], keys, key, i;
        if (types.isListLike(resolved)) {
            return function (el) {
                var nodeList = [el];
                nodeList.expression = 'live.list';
                nodeLists.register(nodeList, null, options.nodeList, true);
                nodeLists.update(options.nodeList, [el]);
                var cb = function (item, index, parentNodeList) {
                    return options.fn(options.scope.add({
                        '%index': index,
                        '@index': index
                    }, { notContext: true }).add(item), options.options, parentNodeList);
                };
                live.list(el, items, cb, options.context, el.parentNode, nodeList, function (list, parentNodeList) {
                    return options.inverse(options.scope.add(list), options.options, parentNodeList);
                });
            };
        }
        var expr = resolved;
        if (!!expr && utils.isArrayLike(expr)) {
            for (i = 0; i < expr.length; i++) {
                result.push(options.fn(options.scope.add({
                    '%index': i,
                    '@index': i
                }, { notContext: true }).add(expr[i])));
            }
        } else if (types.isMapLike(expr)) {
            keys = expr.constructor.keys(expr);
            for (i = 0; i < keys.length; i++) {
                key = keys[i];
                result.push(options.fn(options.scope.add({
                    '%key': key,
                    '@key': key
                }, { notContext: true }).add(expr[key])));
            }
        } else if (expr instanceof Object) {
            for (key in expr) {
                result.push(options.fn(options.scope.add({
                    '%key': key,
                    '@key': key
                }, { notContext: true }).add(expr[key])));
            }
        }
        return result;
    },
    '@index': function (offset, options) {
        if (!options) {
            options = offset;
            offset = 0;
        }
        var index = options.scope.attr('@index');
        return '' + ((isFunction(index) ? index() : index) + offset);
    },
    'if': function (expr, options) {
        var value;
        if (isFunction(expr)) {
            value = compute.truthy(expr)();
        } else {
            value = !!resolve(expr);
        }
        if (value) {
            return options.fn(options.scope || this);
        } else {
            return options.inverse(options.scope || this);
        }
    },
    'is': function () {
        var lastValue, curValue, options = arguments[arguments.length - 1];
        if (arguments.length - 2 <= 0) {
            return options.inverse();
        }
        var args = arguments;
        var callFn = compute(function () {
            for (var i = 0; i < args.length - 1; i++) {
                curValue = resolve(args[i]);
                curValue = isFunction(curValue) ? curValue() : curValue;
                if (i > 0) {
                    if (curValue !== lastValue) {
                        return false;
                    }
                }
                lastValue = curValue;
            }
            return true;
        });
        return callFn() ? options.fn() : options.inverse();
    },
    'eq': function () {
        return helpers.is.apply(this, arguments);
    },
    'unless': function (expr, options) {
        return helpers['if'].apply(this, [
            expr,
            assign(assign({}, options), {
                fn: options.inverse,
                inverse: options.fn
            })
        ]);
    },
    'with': function (expr, options) {
        var ctx = expr;
        expr = resolve(expr);
        if (!!expr) {
            return options.fn(ctx);
        }
    },
    'log': function (expr, options) {
        if (typeof console !== 'undefined' && console.log) {
            if (!options) {
                console.log(expr.context);
            } else {
                console.log(expr, options.context);
            }
        }
    },
    'data': function (attr) {
        var data = arguments.length === 2 ? this : arguments[1];
        return function (el) {
            domData.set.call(el, attr, data || this.context);
        };
    },
    'switch': function (expression, options) {
        resolve(expression);
        var found = false;
        var newOptions = options.helpers.add({
            'case': function (value, options) {
                if (!found && resolve(expression) === resolve(value)) {
                    found = true;
                    return options.fn(options.scope || this);
                }
            },
            'default': function (options) {
                if (!found) {
                    return options.fn(options.scope || this);
                }
            }
        });
        return options.fn(options.scope, newOptions);
    }
};
helpers.eachOf = helpers.each;
var registerHelper = function (name, callback) {
    helpers[name] = callback;
};
var makeSimpleHelper = function (fn) {
    return function () {
        var realArgs = [];
        each(arguments, function (val, i) {
            if (i <= arguments.length) {
                while (val && val.isComputed) {
                    val = val();
                }
                realArgs.push(val);
            }
        });
        return fn.apply(this, realArgs);
    };
};
module.exports = {
    registerHelper: registerHelper,
    registerSimpleHelper: function (name, callback) {
        registerHelper(name, makeSimpleHelper(callback));
    },
    getHelper: function (name, options) {
        var helper = options && options.get('helpers.' + name, { proxyMethods: false });
        if (!helper) {
            helper = helpers[name];
        }
        if (helper) {
            return { fn: helper };
        }
    },
    resolve: resolve,
    resolveHash: resolveHash
};