/*can-stache@3.14.7#expressions/arg*/
define(function (require, exports, module) {
    var Arg = function (expression, modifiers) {
        this.expr = expression;
        this.modifiers = modifiers || {};
        this.isCompute = false;
    };
    Arg.prototype.value = function () {
        return this.expr.value.apply(this.expr, arguments);
    };
    module.exports = Arg;
});