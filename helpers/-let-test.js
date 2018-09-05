var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
require("./-let");


QUnit.module("can-stache let helper");

test("basics without commas", function(){

	var template = stache(
		"{{let userName=this.name constTwo=2}}"+
		"<div>{{userName}}</div>"
	);
	var vm = new DefineMap({name: "Justin"});

	var frag = template(vm);

	QUnit.equal( frag.lastChild.innerHTML, "Justin", "got initial value");

	vm.name = "Ramiya";

	QUnit.equal( frag.lastChild.innerHTML, "Ramiya", "value updated");
});

test("basics with commas", function(){

	var template = stache(
		"{{let userName=this.name, constTwo=2}}"+
		"<div>{{userName}}-{{constTwo}}</div>"
	);
	var vm = new DefineMap({name: "Justin"});

	var frag = template(vm);

	QUnit.equal( frag.lastChild.innerHTML, "Justin-2", "got initial value");

	vm.name = "Ramiya";

	QUnit.equal( frag.lastChild.innerHTML, "Ramiya-2", "value updated");
});
