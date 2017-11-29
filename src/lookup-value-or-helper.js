var expressionHelpers = require("./expression-helpers");
var mustacheHelpers = require("../helpers/core");

// Looks up a value in the scope, and if it is `undefined`, looks up
// the value as a helper.
function lookupValueOrHelper(key, scope, readOptions) {
	var lookup = expressionHelpers.getObservableValue_fromKey(key, scope, readOptions),
		helper;

	if(key.charAt(0) === "@") {
		key = key.substr(1);
	}

	// If it doesn't look like a helper and there is no value, check helpers
	// anyway. This is for when foo is a helper in `{{foo}}`.
	if(lookup.initialValue === undefined || key in mustacheHelpers.helpers) {
		helper = mustacheHelpers.getHelper(key, scope);
	}

	return helper || lookup;
}

module.exports = lookupValueOrHelper;
