var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");

QUnit.module("can-stache with can-define");

test("basic replacement and updating", function(){

	var map = new DefineMap({
		message: "World"
	});
	var stashed = stache("<h1 class='foo'>{{message}}</h1>");


	var frag = stashed(map);

	equal( frag.firstChild.firstChild.nodeValue, "World","got back the right text");
});
