// order for what should take precendence when looking up
// a helper or function in the scope
// (local helpers most important, then built in helpers, etc)
var priorities = [
	"LOCAL_HELPER",
	"BUILT_IN_HELPER",// #each helper
	"SCOPE_FUNCTION",// DefineMap.prototype.each
	"SCOPE_PROPERTY",
	"GLOBAL_HELPER",
	"MAX"
].reduce(function(priorities, key, index) {
	priorities[key] = index + 1;
	return priorities;
}, {});

module.exports = priorities;
