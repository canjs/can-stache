var helpers = require('./core');
var route = require('can-route');

var getLast = require('can-util/js/last/last');
var stacheExpression = require('../src/expression');

var looksLikeOptions = helpers.looksLikeOptions;


helpers.registerHelper('routeUrl',function(params, merge){
	var finalParams,
		finalMerge;
	// check if called like a mustache helper
	if(typeof params === "boolean") {
		finalMerge = params;

	}
	debugger;

	if(!params) {
		params = {};
	}

	if(typeof params.fn === "function" && typeof params.inverse === "function") {
		params = helpers.resolveHash(params.hash);
	}
	return route.url(params, typeof merge === "boolean" ? merge : undefined);
});

var routeCurrent = function(params){
	// check if this a normal helper call
	var last = getLast(arguments),
		isOptions = last && looksLikeOptions(last);
	if( last && isOptions && !(last.exprData instanceof stacheExpression.Call) ) {
		if(route.current( helpers.resolveHash(params.hash || {}))) {
			return params.fn();
		} else {
			return params.inverse();
		}
	} else {
		return route.current(looksLikeOptions(params) ? {} : params || {});
	}
};
routeCurrent.callAsMethod = true;

helpers.registerHelper('routeCurrent', routeCurrent);
