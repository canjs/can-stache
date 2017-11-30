var expressionHelpers = require("./expression-helpers");
var mustacheHelpers = require("../helpers/core");
var lookupPriorities = require("./lookup-priorities");

// Looks up a value as a helper or scope value
function lookupValueOrHelper(key, scope, readOptions) {
	var helper, helperPriority, scopeValue, scopeValuePriority;

	if(key.charAt(0) === "@") {
		key = key.substr(1);
	}

	helper = mustacheHelpers.getHelper(key, scope);
	helperPriority = helper && helper.metadata.priority || lookupPriorities.MAX;

	// if the helper has higher priority than scope functions, we don't need to read
	// the value from the scope, since we will always use the helper
	if (helperPriority < lookupPriorities.SCOPE_FUNCTION) {
		return helper;
	}

	// otherwise, we need to check if the same property exists in the scope
	scopeValue = expressionHelpers.getObservableValue_fromKey(key, scope, readOptions);

	// if there is no scope property, use the helper
	if(helper && scopeValue.initialValue === undefined) {
		return helper;
	}

	// if there is a helper and a property in the scope,
	// we need to compare the priorities of each
	scopeValuePriority = typeof scopeValue.initialValue === "function" ?
		lookupPriorities.SCOPE_FUNCTION :
		lookupPriorities.SCOPE_PROPERTY;

	return helperPriority < scopeValuePriority ?
		helper :
		scopeValue;
}

module.exports = lookupValueOrHelper;
