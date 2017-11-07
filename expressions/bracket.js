var expressionHelpers = require("../src/expression-helpers");

// ### Bracket
// For accessing properties using bracket notation like `foo[bar]`
var Bracket = function (key, root) {
	this.root = root;
	this.key = key;
};
Bracket.prototype.value = function (scope, helpers) {
	var root = this.root ? this.root.value(scope, helpers) : scope.peek('.');
	return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key.value(scope, helpers), root, scope, helpers, {});
};
//!steal-remove-start
Bracket.prototype.sourceText = function(){
	if(this.rootExpr) {
		return this.rootExpr.sourceText()+"["+this.key+"]";
	} else {
		return "["+this.key+"]";
	}
};
//!steal-remove-end

module.exports = Bracket;
