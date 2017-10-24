var expressionHelpers = require("../src/expression-helpers");
var lookupValueOrHelper = require("../src/lookup-value-or-helper");
// ### Lookup
// `new Lookup(String, [Expression])`
// Finds a value in the scope or a helper.
var Lookup = function(key, root) {
	this.key = key;
	this.rootExpr = root;
};
Lookup.prototype.value = function(scope, helperOptions){

	if (this.rootExpr) {
		return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope, helperOptions), scope, {}, {});
	} else {
		// TODO: remove this.  This is hacky.
		var result = lookupValueOrHelper(this.key, scope, helperOptions);
		this.isHelper = result.helper && !result.helper.callAsMethod;
		return result.helper || result.value;
	}
};

module.exports = Lookup;
