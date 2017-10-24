var canReflect = require("can-reflect");
var compute = require("can-compute");
var expressionHelpers = require("../src/expression-helpers");
// ### Hash

var Hashes = function(hashes){
	this.hashExprs = hashes;
};
Hashes.prototype.value = function(scope, helperOptions){
	var hash = {};
	for(var prop in this.hashExprs) {
		var val = expressionHelpers.convertToArgExpression(this.hashExprs[prop]),
			value = val.value.apply(val, arguments);

		hash[prop] = {
			call: !val.modifiers || !val.modifiers.compute,
			value: value
		};
	}
	// TODO: replace with Compute
	return compute(function(){
		var finalHash = {};
		for(var prop in hash) {
			finalHash[prop] = hash[prop].call ? canReflect.getValue( hash[prop].value ) : expressionHelpers.toComputeOrValue( hash[prop].value );
		}
		return finalHash;
	});
};

module.exports = Hashes;
