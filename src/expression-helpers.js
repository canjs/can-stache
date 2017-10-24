var Arg = require("../expressions/arg");
var Literal = require("../expressions/literal");

var canReflect = require("can-reflect");
var compute = require("can-compute");
var observeReader = require("can-stache-key");
var canSymbol = require("can-symbol");
var dev = require("can-util/js/dev/dev");

//!steal-remove-start
// warn on keys like {{foo}} if foo is not in the current scope
// don't warn on things like {{./foo}} or {{../foo}} or {{foo.bar}} or {{%index}} or {{this}}
function displayScopeWalkingWarning(key, computeData, filename) {
	if (key.indexOf(".") < 0 && key !== "this") {
		// if scope that value was found in (`scope`) is not the starting scope,
		// we must have walked up the scope to find the value
		var scopeWasWalked = computeData.scope && (computeData.scope !== computeData.startingScope);

		// values read from non-contexts, such as aliases created for #each and #with
		// should not warn
		var readFromNonContext = computeData && computeData.scope &&
			computeData.scope._meta && computeData.scope._meta.notContext;

		// if scope was walked and value isn't an alias, display dev warning
		if (scopeWasWalked && !readFromNonContext) {
			if (filename) {
				dev.warn(
					filename + ': "' + key + '" ' +
					'is not in the current scope, so it is being read from the parent scope.\n' +
					'This will not happen automatically in an upcoming release. See https://canjs.com/doc/can-stache.scopeAndContext.html#PreventingScopeWalking.\n\n'
				);
			} else {
				dev.warn(
					'"' + key + '" ' +
					'is not in the current scope, so it is being read from the parent scope.\n' +
					'This will not happen automatically in an upcoming release. See https://canjs.com/doc/can-stache.scopeAndContext.html#PreventingScopeWalking.\n\n'
				);
			}
		}
	}
}
//!steal-remove-end

// ## Helpers
// Helper for getting a bound compute in the scope.
var getObservableValue_fromKey = function (key, scope, readOptions) {
    var data = scope.computeData(key, readOptions);
    compute.temporarilyBind(data);

    //!steal-remove-start
    // this must happen after `temporarilyBind`ing computeData
    // so that we know where the value was found
    displayScopeWalkingWarning(key, data, readOptions && readOptions.filename);
    //!steal-remove-end

    return data;
};
function computeHasDependencies(compute){
    return compute[canSymbol.for("can.valueHasDependencies")] ?
        canReflect.valueHasDependencies(compute) : compute.computeInstance.hasDependencies;
}
function getObservableValue_fromDynamicKey_fromObservable(key, root, helperOptions, readOptions) {
    var computeValue = compute(function(newVal) {
        var keyValue = canReflect.getValue(key);
        var rootValue = canReflect.getValue(root);
        // Convert possibly numeric key to string, because observeReader.get will do a charAt test on it.
        // also escape `.` so that things like ["bar.baz"] will work correctly
        keyValue = ("" + keyValue).replace(".", "\\.");

        if (arguments.length) {
            observeReader.write(rootValue, observeReader.reads(keyValue), newVal);
        } else {
            return observeReader.get(rootValue, keyValue);
        }
    });
    compute.temporarilyBind(computeValue);
    return computeValue;
}
// If not a Literal or an Arg, convert to an arg for caching.
function convertToArgExpression(expr){
    if(!(expr instanceof Arg) && !(expr instanceof Literal)) {
        return new Arg(expr);
    } else {
        return expr;
    }

}
function toComputeOrValue(value) {
    // convert to non observable value
    if(canReflect.isObservableLike(value)) {
        // we only want to do this for things that `should` have dependencies, but dont.

        if(canReflect.valueHasDependencies(value) === false) {
            return canReflect.getValue(value);
        }
        // if compute data
        if(value.compute) {
            return value.compute;
        }
    }
    return value;
}
// try to make it a compute no matter what.  This is useful for
// ~ operator.
function toCompute(value) {
    if(value) {

        if(value.isComputed) {
            return value;
        }
        if(value.compute) {
            return value.compute;
        }
    }
    return value;
}

module.exports = {
    getObservableValue_fromKey: getObservableValue_fromKey,
    computeHasDependencies: computeHasDependencies,
    getObservableValue_fromDynamicKey_fromObservable: getObservableValue_fromDynamicKey_fromObservable,
    convertToArgExpression: convertToArgExpression,
    toComputeOrValue: toComputeOrValue,
    toCompute: toCompute
};
