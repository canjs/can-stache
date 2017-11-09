var expressionHelpers = require("../src/expression-helpers");
var Lookup = require("./lookup");

// ### ScopeLookup
// Looks up a value in the scope, returns a compute for the value it finds.
// If passed an expression, that is used to lookup data
var ScopeLookup = function(key, root) {
	Lookup.apply(this, arguments);
};
ScopeLookup.prototype.value = function(scope, helperOptions){
	if (this.rootExpr) {
		return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
	}

	return expressionHelpers.getObservableValue_fromKey(this.key, scope, helperOptions);
};
//!steal-remove-start
ScopeLookup.prototype.sourceText = Lookup.prototype.sourceText
//!steal-remove-end

module.exports = ScopeLookup;
