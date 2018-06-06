var expressionHelpers = require("../src/expression-helpers");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var sourceTextSymbol = canSymbol.for("can-stache.sourceText");
var dev = require("can-log/dev/dev");
var observeReader = require("can-stache-key");

// ### Lookup
// `new Lookup(String, [Expression])`
// Finds a value in the scope or a helper.
var Lookup = function(key, root, sourceText) {
	this.key = key;
	this.rootExpr = root;
	canReflect.setKeyValue(this, sourceTextSymbol, sourceText);
};
Lookup.prototype.value = function(scope, readOptions){
	var value;

	if (this.rootExpr) {
		value = expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope), scope, {}, {});
	} else {
		value = expressionHelpers.getObservableValue_fromKey(this.key, scope, readOptions);
	}

	//!steal-remove-start
	if (typeof value.initialValue === 'undefined' && this.key !== "debugger" && !value.parentHasKey) {
		var filename = scope.peek('scope.filename');
		var lineNumber = scope.peek('scope.lineNumber');

		var reads = observeReader.reads(this.key);
		var firstKey = reads[0].key;
		var key = reads.map(function(read) {
			return read.key + (read.at ? "()" : "");
		}).join(".");
		var pathsForKey = scope.getPathsForKey(firstKey);
		var paths = Object.keys( pathsForKey );

		var warning = [
			(filename ? filename + ':' : '') +
				(lineNumber ? lineNumber + ': ' : '') +
				'Unable to find key "' + key + '".' +
				(
					paths.length ?
						" Did you mean" + (paths.length > 1 ? " one of these" : "") + "?\n" :
						"\n"
				)
		];

		if (paths.length) {
			paths.forEach(function(path) {
				warning.push('\t"' + path + '" which will read from');
				warning.push(pathsForKey[path]);
				warning.push("\n");
			});
		}

		warning.push("\n");

		dev.warn.apply(dev,
			warning
		);
	}
	//!steal-remove-end

	return value;
};
//!steal-remove-start
Lookup.prototype.sourceText = function(){
	if(this[sourceTextSymbol]) {
		return this[sourceTextSymbol];
	} else if(this.rootExpr) {
		return this.rootExpr.sourceText()+"."+this.key;
	} else {
		return this.key;
	}
};
//!steal-remove-end

module.exports = Lookup;
