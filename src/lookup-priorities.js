// a helper or function in the scope
// (local helpers most important, then built in helpers, etc)
var priorities = {
	// helpers in the templateContext
	LOCAL_HELPER: 1,

	// built-in helpers like #each
	BUILT_IN_HELPER: 2,

	// properties like DefineMap.prototype.each
	SCOPE_FUNCTION: 3,

	// properties on the scope object (that are not functions)
	SCOPE_PROPERTY: 4,

	// gloabl helpers registered by the user
	GLOBAL_HELPER: 5,

	// default priority
	MAX: 6
};

module.exports = priorities;
