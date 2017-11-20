/*can-stache@3.13.4#expressions/literal*/
define(function (require, exports, module) {
    var Literal = function (value) {
        this._value = value;
    };
    Literal.prototype.value = function () {
        return this._value;
    };
    module.exports = Literal;
});