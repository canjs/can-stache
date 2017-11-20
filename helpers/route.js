var helpers = require('./core');
var route = require('can-route');

var getLast = require('can-util/js/last/last');
var stacheExpression = require('../src/expression');
var each = require("can-util/js/each/each");

var looksLikeOptions = helpers.looksLikeOptions;

var calculateArgs = function(){
	var finalParams,
		finalMerge,
		optionsArg;

	each(arguments, function(arg){
		if(typeof arg === "boolean") {
			finalMerge = arg;
		} else if( arg && typeof arg === "object"  ) {
			if(!looksLikeOptions(arg) ) {
				finalParams = helpers.resolveHash(arg);
			} else {
				optionsArg = arg;
			}
		}
	});

	if(!finalParams && optionsArg) {
		finalParams = helpers.resolveHash(optionsArg.hash);
	}
	return {
		finalParams: finalParams || {},
		finalMerge: finalMerge,
		optionsArg: optionsArg
	};
};


// go through arguments ... if there's a boolean ... if there's a plain object
helpers.registerHelper('routeUrl',function(){
	var args = calculateArgs.apply(this, arguments);

	return route.url(args.finalParams, typeof args.finalMerge === "boolean" ? args.finalMerge : undefined);

});

var routeCurrent = function(){

	var args = calculateArgs.apply(this, arguments);
	var result = route.current( args.finalParams, typeof args.finalMerge === "boolean" ? args.finalMerge : undefined );

	if( args.optionsArg && !(args.optionsArg instanceof stacheExpression.Call) ) {
		if( result ) {
			return args.optionsArg.fn();
		} else {
			return args.optionsArg.inverse();
		}
	} else {
		return result;
	}
};

helpers.registerHelper('routeCurrent', routeCurrent, { isHelper: false });
