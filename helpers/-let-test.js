var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
var SimpleMap = require("can-simple-map");
var Scope = require("can-view-scope");
var helpersCore = require('can-stache/helpers/core');

require("./-let");

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

QUnit.test("let blocks allow reassigning variables #645", function(){
	var template = stache(
		"{{#let foo='bar'}}" + 
		"<p>{{foo}}</p>" + 
		"{{/let}}" + 
		"{{#let foo='baz'}}" + 
		"<p>{{foo}}</p>" + 
		"{{/let}}" + 
		"<p>foo-{{foo}}</p>"
	);
	var frag = template(new Scope({}));
	var paragraphs = frag.querySelectorAll('p');
	QUnit.equal( paragraphs[0].innerHTML, "bar", "first value still works");
	QUnit.equal( paragraphs[1].innerHTML, "baz", "reassigning foo works");
	QUnit.equal( paragraphs[2].innerHTML, "foo-", "foo is not available outside of let block");
});

QUnit.test("let works after calling helpersCore.__resetHelpers", function() {
	helpersCore.__resetHelpers();

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

QUnit.test("let multiple updates (#650)", function(){

	// This is actually testing that creating the prop[ref] observable will not leak an observation record.
	var template = stache(
		"{{let a = prop[ref]}}"+
		"{{a}}"
	);

	var data = new SimpleMap({
		ref: 0,
		prop: new SimpleMap({
			0: 1,
			1: 2,
			2: 3,
			4: 4
		})
	});

	template(data);

	data.set("ref", data.get("ref")+1 );
	data.set("ref", data.get("ref")+1 );
	QUnit.ok(true, "got here");
});
