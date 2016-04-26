
var helpers = require('./core');

var getBaseURL = require('can-util/js/base-url/base-url');
var joinURIs = require('can-util/js/join-uris/join-uris');
var isFunction = require('can-util/js/is-function/is-function');

helpers.registerHelper('joinBase', function(firstExpr/* , expr... */){
	var args = [].slice.call(arguments);
	var options = args.pop();

	var moduleReference = args.map( function(expr){
		var value = helpers.resolve(expr);
		return isFunction(value) ? value() : value;
	}).join("");

	var templateModule = options.helpers.attr("helpers.module");
	var parentAddress = templateModule ? templateModule.uri: undefined;

	var isRelative = moduleReference[0] === ".";

	if(isRelative && parentAddress) {
		return joinURIs(parentAddress, moduleReference);
	} else {
		var baseURL = (typeof System !== "undefined" &&
			(System.renderingLoader && System.renderingLoader.baseURL ||
			System.baseURL)) ||
			getBaseURL();

		// Make sure one of them has a needed /
		if(moduleReference[0] !== "/" && baseURL[baseURL.length - 1] !== "/") {
			baseURL += "/";
		}

		return joinURIs(baseURL, moduleReference);
	}
});
