var expressionHelpers = require("../src/expression-helpers");
var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var sourceTextSymbol = canSymbol.for("can-stache.sourceText");
var dev = require("can-log/dev/dev");

// ### Lookup
// `new Lookup(String, [Expression])`
// Finds a value in the scope or a helper.
var Lookup = function(key, root, sourceText) {
	this.key = key;
	this.rootExpr = root;
	canReflect.setKeyValue(this, sourceTextSymbol, sourceText);
};
Lookup.prototype.value = function(scope, readOptions){
	// jshint maxdepth:6
	var value;

	if (this.rootExpr) {
		value = expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope), scope, {}, {});
	} else {
		value = expressionHelpers.getObservableValue_fromKey(this.key, scope, readOptions);
	}

	//!steal-remove-start
	if (typeof value.initialValue === 'undefined') {
		var context = value.startingScope && value.startingScope._context;
		var propDefined = false;

		if(typeof context === "object") {
			if(!value.reads) {
				propDefined = canReflect.hasKey(context, this.key);
			} else {
				var reads = value.reads, i = 0, readsLength = reads.length;
				var read;
				do {
					read = reads[i];
					if(canReflect.hasKey(context, read.key)) {
						propDefined = true;

						// Get the next context and continue to see if the key is defined.
						context = canReflect.getKeyValue(context, read.key);

						if(context) {
							propDefined = false;
						} else {
							break;
						}
					}
					i++;
				} while(i < readsLength);
			}
		}

		if (!propDefined) {
			var filename = scope.peek('scope.filename');
			var lineNumber = scope.peek('scope.lineNumber');

			var key = this.key;
			var correctPaths = scope.getPathsForKey(key);
			var pathKeys = Object.keys( correctPaths );

			var warning = [
				(filename ? filename + ':' : '') +
				(lineNumber ? lineNumber + ': ' : '') +
				'Unable to find key "' + key.replace(/@/g, ".") + '".' +
				(
					pathKeys.length ?
						" Did you mean" + (pathKeys.length > 1 ? " one of these" : "") + "?\n" :
						"\n"
				)
			];

			if (pathKeys.length) {
				pathKeys.forEach(function(specificKey) {
					warning.push('\t"' + specificKey + '" which will read from');
					warning.push(correctPaths[specificKey]);
					warning.push("\n");
				});
			}

			warning.push("\n");

			dev.warn.apply(dev,
				warning
			);
		}
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
