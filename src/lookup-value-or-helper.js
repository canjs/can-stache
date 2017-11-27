var expressionHelpers = require("./expression-helpers");
var mustacheHelpers = require("../helpers/core");

// Looks up a value in the scope, and if it is `undefined`, looks up
// the value as a helper.
function lookupValueOrHelper(key, scope, readOptions) {
	var scopeKeyData = expressionHelpers.getObservableValue_fromKey(key, scope, readOptions);
	var result = {value: scopeKeyData};

	if(key.charAt(0) === "@") {
		key = key.substr(1);
	}

	// If it doesn't look like a helper and there is no value, check helpers
	// anyway. This is for when foo is a helper in `{{foo}}`.
	if(scopeKeyData.initialValue === undefined || key in mustacheHelpers.helpers) {
		var helper = mustacheHelpers.getHelper(key, scope);
		result.helper = helper;
	}
	return result;
}

module.exports = lookupValueOrHelper;
