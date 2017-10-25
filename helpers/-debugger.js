var canLog = require('can-log');
function noop () {};
var resolveValue = noop;
var evaluateArgs = noop;
var __testing = {}

//!steal-remove-start
var canReflect = require('can-reflect');
var canSymbol = require('can-symbol');

__testing = {
	allowDebugger: true
};

resolveValue = function (value) {
	if (value && value.isComputed) {
		return value();
	}
	if (value && value[canSymbol.for("can.isValueLike")] && value[canSymbol.for("can.getValue")]) {
		return canReflect.getValue(value);
	}
	return value;
}

evaluateArgs = function (left, right) {
	switch (arguments.length) {
		case 0: return true;
		case 1: return !!resolveValue(left);
		case 2: return resolveValue(left) === resolveValue(right);
		default:
			canLog.log([
				'Usage:',
				'  {{debugger}}: break any time this helper is evaluated',
				'  {{debugger condition}}: break when `condition` is truthy',
				'  {{debugger left right}}: break when `left` === `right`'
			].join('\n'));
			throw new Error('{{debugger}} must have less than three arguments');
	}
}
//!steal-remove-end

function debuggerHelper (left, right) {
	//!steal-remove-start
	var shouldBreak = evaluateArgs.apply(null, Array.prototype.slice.call(arguments, 0, -1));
	if (!shouldBreak) {
		return;
	}

	var options = arguments[arguments.length - 1];
	var get = function (path) {
		return options.scope.get(path);
	};

	canLog.log('Use `get(<path>)` to debug this template');
	var allowDebugger = __testing.allowDebugger;
	if (allowDebugger) {
		debugger;
		return;
	}
	//!steal-remove-end
	canLog.warn('Forgotten {{debugger}} helper');
}

module.exports = {
	helper: debuggerHelper,
	evaluateArgs: evaluateArgs,
	resolveValue: resolveValue,

	// used only for testing purposes
	__testing: __testing
};
