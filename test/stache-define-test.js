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

QUnit.test("{{%index}} and {{@index}} work with {{#key}} iteration", function () {
	var template = stache('<p>{{#iter}}<span>{{@index}}</span>{{/iter}}</p> '+
	  					   '<p>{{#iter}}<span>{{%index}}</span>{{/iter}}</p>');
	var div = document.createElement('div');
	var dom = template({iter: new DefineList(['hey', 'there'])});
	div.appendChild(dom);

	var span = div.getElementsByTagName('span');
	equal((span[0].innerHTML), '0', 'iteration for @index');
	equal((span[1].innerHTML), '1', 'iteration for %index');
	equal((span[2].innerHTML), '0', 'iteration for %index');
	equal((span[3].innerHTML), '1', 'iteration for %index');
});

QUnit.test("iterate a DefineMap with {{#each}} (#can-define/125)", function(){
	var template = stache('<p>{{#each iter}}<span>{{%key}} {{.}}</span>{{/each}}</p>');
	var div = document.createElement('div');

	var dom = template({iter: new DefineMap({first: "justin", last: "meyer"})});
	div.appendChild(dom);

	var span = div.getElementsByTagName('span');
	equal((span[0].innerHTML), 'first justin', 'first');
	equal((span[1].innerHTML), 'last meyer', 'last');
});
