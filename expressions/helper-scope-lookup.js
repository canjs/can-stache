var Lookup = require('./lookup');
var expressionHelpers = require("../src/expression-helpers");

// ### HelperScopeLookup
// An expression that looks up a value in the scope.
// Any functions found prior to the last one are called with
// the context and scope.
var HelperScopeLookup = function(){
	Lookup.apply(this, arguments);
};
HelperScopeLookup.prototype.value = function(scope, helperOptions){
	return expressionHelpers.getObservableValue_fromKey(this.key, scope, {callMethodsOnObservables: true, isArgument: true, args: [scope.peek('.'), scope]});
};
//!steal-remove-start
HelperScopeLookup.prototype.sourceText = Lookup.prototype.sourceText;
//!steal-remove-end

module.exports = HelperScopeLookup;
