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


test('Helper each inside a text section (attribute) (#8)', function(assert){
	var template = stache('<div class="{{#each list}}{{.}} {{/}}"></div>');

	var vm = new DefineMap({
		list: new DefineList(['one','two'])
	});
	var frag = template(vm);
	var className = frag.firstChild.className;

	assert.equal( className, 'one two ' );

	vm.list.push('three');
	className = frag.firstChild.className;

	assert.equal( className, 'one two three ' );
});

test("Using #each on a DefineMap", function(assert){
	var template = stache("{{#each obj}}{{%key}}{{.}}{{/each}}");

	var VM = DefineMap.extend({ 
		seal: false
	}, {
		foo: "string",
		bar: "string"
	});

	var vm = new VM({
		foo: "bar",
		bar: "foo"
	});

	vm.set("baz", "qux");

	var frag = template({ obj: vm });

	var first = frag.firstChild,
		second = first.nextSibling.nextSibling,
		third = second.nextSibling.nextSibling;

	assert.equal(first.nodeValue, "foo");
	assert.equal(first.nextSibling.nodeValue, "bar");
	assert.equal(second.nodeValue, "bar");
	assert.equal(second.nextSibling.nodeValue, "foo");
	assert.equal(third.nodeValue, "baz");
	assert.equal(third.nextSibling.nodeValue, "qux");
});
