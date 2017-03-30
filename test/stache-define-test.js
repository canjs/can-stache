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

QUnit.test("Stache with single property", function() {
	var Typer = define.Constructor({
		foo: {
			type: 'string'
		}
	});

	var template = stache('{{foo}}');
	var t = new Typer({
		foo: 'bar'
	});
	var frag = template(t);
	equal(frag.firstChild.nodeValue, 'bar');
	t.foo = "baz";
	equal(frag.firstChild.nodeValue, 'baz');
});

QUnit.test("Stache with boolean property with {{#if}}", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	var template = stache('{{#if isEnabled}}Enabled{{/if}}');
	var frag = template(nested);
	equal(frag.firstChild.nodeValue, 'Enabled');
});

QUnit.test("stache with double property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	var template = stache('{{test.name}}');
	var frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

QUnit.test("Stache with one nested property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	var template = stache('{{examples.one.name}}');
	var frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

QUnit.test("Stache with two nested property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	var template = stache('{{examples.two.deep.name}}');
	var frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

test('list.sort a list of DefineMaps', function(){

	var Account = DefineMap.extend({
		name: "string",
		amount: "number",
		slug: {
			serialize: true,
			get: function(){
				return this.name.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'');
			}
		}
	});
	Account.List = DefineList.extend({
	  "*": Account,
	  limit: "number",
	  skip: "number",
	  total: "number"
	});

	var accounts = new Account.List([
		{
			name: "Savings",
			amount: 20.00
		},
		{
			name: "Checking",
			amount: 103.24
		},
		{
			name: "Kids Savings",
			amount: 48155.13
		}
	]);
	accounts.limit = 3;

	var template = stache('{{#each accounts}}{{name}},{{/each}}')({accounts: accounts});
	equal(template.textContent, "Savings,Checking,Kids Savings,", "template rendered properly.");

	accounts.sort(function(a, b){
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name){
			return 1;
		} else {
			return 0;
		}
	});
	equal(accounts.length, 3);
	equal(template.textContent, "Checking,Kids Savings,Savings,", "template updated properly.");

	// Try sorting in reverse on the dynamic `slug` property
	accounts.sort(function(a, b){
		if (a.slug < b.slug) {
			return 1;
		} else if (a.slug > b.slug){
			return -1;
		} else {
			return 0;
		}
	});

	equal(accounts.length, 3);
	equal(accounts.limit, 3, "expandos still present after sorting/replacing.");
	equal(template.textContent, "Savings,Kids Savings,Checking,", "template updated properly.");
});
