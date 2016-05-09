var helpers = require('./core');
var route = require('can-route');

var getLast = require('can-util/js/last/last');
var stacheExpression = require('../src/expression');

var looksLikeOptions = function(options){
	return options && typeof options.fn === "function" && typeof options.inverse === "function";
};


helpers.registerHelper('routeUrl',function(params, merge){
	// check if called like a mustache helper
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
