var expressionHelpers = require("./expression-helpers");
var mustacheHelpers = require("../helpers/core");

// Looks up a value in the scope, and if it is `undefined`, looks up
// the value as a helper.
function lookupValueOrHelper(key, scope, helperOptions, readOptions){
    var scopeKeyData = expressionHelpers.getObservableValue_fromKey(key, scope, readOptions);
    var result = {value: scopeKeyData};

    if(key.charAt(0) === "@" && key !== "@index") {
        key = key.substr(1);
    }
    
    // If it doesn't look like a helper and there is no value, check helpers
    // anyway. This is for when foo is a helper in `{{foo}}`.
    if(scopeKeyData.initialValue === undefined || mustacheHelpers.helpers[key]) {
        var helper = mustacheHelpers.getHelper(key, helperOptions);
        result.helper = helper;
    }
    return result;
}

module.exports = lookupValueOrHelper;
