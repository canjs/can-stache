var expressionHelpers = require("../src/expression-helpers");
var lookupValueOrHelper = require("../src/lookup-value-or-helper");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var sourceTextSymbol = canSymbol.for("can-stache.sourceText");

// ### Lookup
// `new Lookup(String, [Expression])`
// Finds a value in the scope or a helper.
var Lookup = function(key, root, sourceText) {
	this.key = key;
	this.rootExpr = root;
	canReflect.setKeyValue(this, sourceTextSymbol, sourceText);
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
//!steal-remove-start
Lookup.prototype.sourceText = function(){
	if(this[sourceTextSymbol]) {
		return this[sourceTextSymbol];
	} else if(this.rootExpr) {
		return this.rootExpr.sourceText()+"."+this.key;
	} else {
		return this.key;
	}
};
//!steal-remove-end

module.exports = Lookup;
