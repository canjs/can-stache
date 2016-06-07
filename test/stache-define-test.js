var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");

test("basic replacement and updating", function(){

	var map = new DefineMap({
		message: "World"
	});
	var stashed = stache("<h1 class='foo'>{{message}}</h1>");


	var frag = stashed(map);

	equal( frag.firstChild.firstChild.nodeValue, "World","got back the right text");
});

test("a Promise added to a map", function(){
	var MyMap = DefineMap.extend({
		one: "*"
	});
	var template = stache("{{#one}}{{#if isResolved}}<div>Worked</div>{{/if}}{{/one}}");

	var map = new MyMap();
	var frag = template(map);

	map.one = Promise.resolve();

	map.one.then(function(){
		var div = frag.firstChild;
		equal(div.firstChild.nodeValue, "Worked", "Promise value updated");

		start();
	});

	stop();
});
