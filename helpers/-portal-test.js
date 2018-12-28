var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
var globals = require("can-globals");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node");
var canSymbol = require("can-symbol");

require("./-portal");

QUnit.module("can-stache #portal helper");

test("basics", function(){
	var el = document.createElement("div");
	var template = stache("{{#portal(root)}}hello {{name}}{{/portal}}");
	var vm = new DefineMap({name: "Matthew", root: el});

	template(vm);
	equal(el.firstChild.nextSibling.nodeValue, "Matthew");

	vm.name ="Wilbur";
	equal(el.firstChild.nextSibling.nodeValue, "Wilbur");
});

test("element is observable", function(){
	var el = document.createElement("div");
	var template = stache("{{#portal(root)}}{{name}}{{/}}");
	var vm = new DefineMap({name: "Matthew", root: null});

	template(vm);

	vm.root = el;
	equal(el.firstChild.nodeValue, "Matthew");
});

test("element changes", function() {
	var one = document.createElement("div");
	var two = document.createElement("div");

	var template = stache("{{#portal(root)}}{{name}}{{/}}");
	var vm = new DefineMap({name: "Matthew", root: one});

	template(vm);
	equal(one.firstChild.nodeValue, "Matthew");

	vm.root = two;
	equal(two.firstChild.nodeValue, "Matthew");
	equal(one.firstChild, null, "One had its children removed");
});

test("tears down when the element is removed", function() {
	var doc = document.implementation.createHTMLDocument("test");
	globals.setKeyValue("document", doc);

	var el = doc.createElement("div");
	domMutateNode.appendChild.call(doc.body, el);

	var template = stache("{{#portal(root)}}{{name}}{{/}}");
	var vm = new DefineMap({name: "Matthew", root: el});

	template(vm);
	equal(el.firstChild.nodeValue, "Matthew");

	domMutate.onNodeRemoval(el, function() {
		equal(el.firstChild, null, "removed when parent removed");
		start();
	});

	stop();
	domMutateNode.removeChild.call(doc.body, el);
});

test("conditionally rendering a portal", function() {
	var one = document.createElement("div");
	var two = document.createElement("span");

	var template = stache("{{#eq(page, 'one')}}{{#portal(this.one)}}{{name}}{{/portal}}{{/eq}}" +
		"{{#eq(page, 'two')}}{{#portal(this.two)}}{{name}}{{/portal}}{{/eq}}");
	var vm = new DefineMap({page: "one", name: "Matthew", one: one, two: two});

	template(vm);
	equal(one.firstChild.nodeValue, "Matthew");
	equal(two.firstChild, null, "nothing rendered to two");

	vm.page = "two";
	equal(one.firstChild, null, "nothing rendered to one");
	equal(two.firstChild.nodeValue, "Matthew");
});

test("Doesn't mess with existing DOM", function() {
	var el = document.createElement("div");
	el.appendChild(document.createTextNode("Hello"));
	var template = stache("{{#portal(root)}}{{name}}{{/portal}}");
	var vm = new DefineMap({name: "Matthew", root: el});

	template(vm);
	equal(el.firstChild.nodeValue, "Hello", "existing content left alone");
	equal(el.firstChild.nextSibling.nodeValue, "Matthew");
});

test("Adds the done.keepNode symbol to nodes", function() {
	var el = document.createElement("div");
	var template = stache("{{#portal(root)}}<span>one</span><div>two</div>{{/portal}}");
	var vm = new DefineMap({ root: el });
	template(vm);

	var child = el.firstChild;
	do {
		ok(child[canSymbol.for("done.keepNode")], "symbol added to this node");
		child = child.nextSibling;
	} while(child);
});
