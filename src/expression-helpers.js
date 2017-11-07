var Arg = require("../expressions/arg");
var Literal = require("../expressions/literal");

var canReflect = require("can-reflect");
var observeReader = require("can-stache-key");
var canSymbol = require("can-symbol");
var dev = require("can-util/js/dev/dev");
var Observation = require("can-observation");
var makeComputeLike = require("can-view-scope/make-compute-like");
var SetterObservable = require("can-simple-observable/setter/setter");

// Helper for getting a bound compute in the scope.
var getObservableValue_fromKey = function (key, scope, readOptions) {
	var data = scope.computeData(key, readOptions);

	Observation.temporarilyBind(data);

	return data;
};

var computeHasDependencies = function(compute){
	return compute[canSymbol.for("can.valueHasDependencies")] ?
		canReflect.valueHasDependencies(compute) : compute.computeInstance.hasDependencies;
};

var getObservableValue_fromDynamicKey_fromObservable = function (key, root, helperOptions, readOptions) {
	var getKey = function(){
		return ("" + canReflect.getValue(key)).replace(".", "\\.")
	};
	var computeValue = new SetterObservable(function getDynamicKey() {
		return observeReader.get( canReflect.getValue(root) , getKey());
	}, function setDynamicKey(newVal){
		observeReader.write(canReflect.getValue(root), observeReader.reads(getKey()), newVal);
	});
	Observation.temporarilyBind(computeValue);
	return computeValue;
};

// If not a Literal or an Arg, convert to an arg for caching.
var convertToArgExpression = function(expr){
	if(!(expr instanceof Arg) && !(expr instanceof Literal)) {
		return new Arg(expr);
	} else {
		return expr;
	}
};

var toComputeOrValue = function(value) {
	// convert to non observable value
	if(canReflect.isObservableLike(value)) {
		// we only want to do this for things that `should` have dependencies, but dont.
		if(canReflect.valueHasDependencies(value) === false) {
			return canReflect.getValue(value);
		}
		// if compute data
		if(value.compute) {
			return value.compute;
		} else {
			return makeComputeLike(value);
		}
	}
	return value;
};

// try to make it a compute no matter what.  This is useful for
// ~ operator.
var toCompute = function(value) {
	if(value) {

		if(value.isComputed) {
			return value;
		}
		if(value.compute) {
			return value.compute;
		} else {
			return makeComputeLike(value);
		}
	}
	return value;
};

module.exports = {
	getObservableValue_fromKey: getObservableValue_fromKey,
	computeHasDependencies: computeHasDependencies,
	getObservableValue_fromDynamicKey_fromObservable: getObservableValue_fromDynamicKey_fromObservable,
	convertToArgExpression: convertToArgExpression,
	toComputeOrValue: toComputeOrValue,
	toCompute: toCompute
};
