var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
require("./-let");
var Scope = require("can-view-scope");


QUnit.module("can-stache let helper");

QUnit.test("basics without commas", function(){

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

QUnit.test("basics with commas", function(){

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

QUnit.test("make undefined variables settable", function(){
	var template = stache(
		"{{ let userName=undefined }}"+
		"<div>{{userName}} {{changeUserName(scope)}}</div>"
	);
	var scope;
	var frag = template({
		changeUserName: function(passedScope){
			scope = passedScope;
			return "";
		}
	});


	scope.set("userName","Justin");
	QUnit.deepEqual( frag.lastChild.firstChild.nodeValue, "Justin");

});

QUnit.test("custom scopes still get a let context", function(){
	var template = stache("{{let foo='bar'}}");
	template(new Scope({}));
	QUnit.ok(true, "passes");
});
