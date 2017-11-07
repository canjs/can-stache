var Lookup = require('./lookup');
var lookupValueOrHelper = require("../src/lookup-value-or-helper");

// ### HelperLookup
// An expression that looks up a value in the helper or scope.
// Any functions found prior to the last one are called with
// the context and scope.
var HelperLookup = function(){
	Lookup.apply(this, arguments);
};
HelperLookup.prototype.value = function(scope, helperOptions){
	var result = lookupValueOrHelper(this.key, scope, helperOptions, {isArgument: true, args: [scope.peek('.'), scope]});
	return result.helper || result.value;
};
//!steal-remove-start
HelperLookup.prototype.sourceText = Lookup.prototype.sourceText;
//!steal-remove-end

module.exports = HelperLookup;
