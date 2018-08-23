/* jshint asi:true,multistr:true,indent:false,latedef:nofunc*/
require('./expression-test');
require('../helpers/-debugger-test');
require('./nodelist-test');
require('../helpers/-for-in-test');
require('../helpers/-each-test');
require('./section-test');
var stache = require('../can-stache');
var core = require('../src/mustache_core');
var clone = require('steal-clone');
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");

var QUnit = require('steal-qunit');
var queues = require('can-queues');
var DefineList = require("can-define/list/list");
var DefineMap = require('can-define/map/map');
var Observation = require('can-observation');
var SimpleMap = require('can-simple-map');
var SimpleObservable = require("can-simple-observable");

var encoder = require('can-attribute-encoder');
var viewCallbacks = require('can-view-callbacks');
var Scope = require('can-view-scope');
var parser = require('can-view-parser');
var nodeLists = require('can-view-nodelist');

var makeDocument = require('can-vdom/make-document/make-document');
var globals = require('can-globals');

var getChildNodes = require('can-child-nodes');
var domData = require('can-dom-data');
var domDataState = require('can-dom-data-state');
var domMutateNode = require('can-dom-mutate/node');
var DOCUMENT = require('can-globals/document/document');

var canDev = require('can-log/dev/dev');
var string = require('can-string');
var joinURIs = require('can-join-uris');
var getBaseURL = require('can-globals/base-url/base-url');
var testHelpers = require('can-test-helpers');
var canLog = require('can-log');
var debug = require('../helpers/-debugger');
var helpersCore = require('can-stache/helpers/core');

var browserDoc = DOCUMENT();


makeTest('can/view/stache dom', browserDoc);
makeTest('can/view/stache vdom', makeDocument());

// HELPERS
function overwriteGlobalHelper(name, fn, method) {
	var origHelper = helpersCore.getHelper(name);

	var newHelper = function() {
		return fn.apply(this, arguments);
	};
	newHelper.requiresOptionsArgument = origHelper.requiresOptionsArgument;

	helpersCore[method || 'registerHelper'](name, newHelper);

	return origHelper;
}

function makeTest(name, doc, mutation) {
	var isNormalDOM = doc === window.document;

	var innerHTML = function(node){
		return "innerHTML" in node ?
			node.innerHTML :
			undefined;
	};
	var getValue = function(node){
		// textareas are cross bound to their internal innerHTML
		if(node.nodeName.toLowerCase() === "textarea") {
			return innerHTML(node);
		} else {
			return node.value;
		}
	};

	var empty = function(node){
		var last = node.lastChild;
		while(last) {
			node.removeChild(last);
			last = node.lastChild;
		}
	};

	var getText = function(template, data, options){
			var div = doc.createElement("div");
			div.appendChild( stache(template)(data, options) );
			return cleanHTMLTextForIE( innerHTML(div) );
		},
		getAttr = function (el, attrName) {
			return attrName === "class" ?
				el.className :
				el.getAttribute(attrName);
		},
		cleanHTMLTextForIE = function(html){  // jshint ignore:line
			return html.replace(/ stache_0\.\d+="[^"]+"/g,"").replace(/<(\/?[-A-Za-z0-9_]+)/g, function(whole, tagName){
				return "<"+tagName.toLowerCase();
			}).replace(/\r?\n/g,"");
		},
		getTextFromFrag = function(node){
			var txt = "";
			node = node.firstChild;
			while(node) {
				if(node.nodeType === 3) {
					txt += node.nodeValue;
				} else {
					txt += getTextFromFrag(node);
				}
				node = node.nextSibling;
			}
			return txt;
		};

	var oldDoc;
	QUnit.module(name, {
		setup: function(){
			if(doc === window.document) {
				DOCUMENT(null);
				globals.deleteKeyValue('MutationObserver');

			} else {
				oldDoc = window.document;
				DOCUMENT(doc);
				globals.setKeyValue('MutationObserver', null);
			}


			this.fixture = doc.createElement("div");
			doc.body.appendChild(this.fixture);

			this.animals = ['sloth', 'bear', 'monkey'];

			// reset stache helpers so that any helpers registered in
			// the previous test do not conflict with scope properties
			helpersCore.__resetHelpers();
		},
		teardown: function(){

			doc.body.removeChild(this.fixture);
			stop();

			setTimeout(function(){
				DOCUMENT(window.document);
				globals.deleteKeyValue('MutationObserver');
				start();
			},1)
		}
	});

	test("html to html", function(){

		var stashed = stache("<h1 class='foo'><span>Hello World!</span></h1>");


		var frag = stashed();
		equal( innerHTML(frag.childNodes.item(0)).toLowerCase(), "<span>hello world!</span>","got back the right text");
	});

	test("basic replacement", function(){

		var stashed = stache("<h1 class='foo'><span>Hello {{message}}!</span></h1>");


		var frag = stashed({
			message: "World"
		});
		equal( innerHTML(frag.firstChild).toLowerCase(), "<span>hello world!</span>","got back the right text");
	});

	QUnit.test("a section helper", function(){


		stache.registerHelper("helper", function(options){

			return options.fn({message: "World"});

		});

		var stashed = stache("<h1 class='foo'>{{#helper()}}<span>Hello {{message}}!</span>{{/helper}}</h1>");


		var frag = stashed({});
		equal(frag.firstChild.firstChild.nodeName.toLowerCase(), "span", "got a span");

		equal(innerHTML(frag.firstChild.firstChild), "Hello World!","got back the right text");

	});

	QUnit.test('helpers used as section should have helperOptionArg.isSection set', function (assert) {
		var done = assert.async();

		stache.registerHelper('genericTestHelper', function (options) {
			assert.equal(options.isSection, true, 'isSection should be true');
			done();
		});

		var template = '<div>{{#genericTestHelper()}}<span>Test</span>{{/genericTestHelper}}</div>';
		var viewModel = {};

		stache(template)(viewModel);
	});

	QUnit.test('helpers used inline should have helperOptionArg.isSection unset', function (assert) {
		var done = assert.async();

		stache.registerHelper('genericTestHelper2', function (options) {
			assert.equal(options.isSection, false, 'isSection should be false');
			done();
		});

		var template = '<div>{{genericTestHelper2()}}</div>';
		var viewModel = {};

		stache(template)(viewModel);
	});

	testHelpers.dev.devOnlyTest("helpers warn on overwrite (canjs/can-stache-converters#24)", function () {

		stache.registerHelper('foobar', function() {});
		// have to do this after the first registration b/c if the dom and vdom tests run, "foobar"
		//  will already have been registered.
		var teardown = testHelpers.dev.willWarn(/already been registered/, function(message, matched) {
			if(matched) {
				ok(true, "received warning");
			}
		});

		stache.registerHelper('foobar', function() {});

		QUnit.equal(teardown(), 1, "Exactly one warning called");

	});

	test("attributes sections", function(){
		var template = stache("<div {{attributes}}/>");
		var frag = template({
			attributes: "foo='bar'"
		});

		equal(frag.firstChild.getAttribute('foo'), "bar", "{{attributes}} set");

		template = stache("<div {{#if truthy}}foo='{{baz}}'{{/if}}/>");

		frag = template({
			truthy: true,
			baz: "bar"
		});

		equal(frag.firstChild.getAttribute('foo'), "bar", "foo='{{baz}}' set");

		frag = template({
			truthy: false,
			baz: "bar"
		});

		equal(frag.firstChild.getAttribute('foo'), null, "attribute not set if not truthy");


	});

	test("boxes example", function(){
		var boxes = [],
			Box = DefineMap.extend({
				count: {value: 0},
				content: {value: 0},
				top: {value: 0},
				left: {value: 0},
				color: {value: 0},
				tick: function () {
					var count = this.count + 1;
					this.assign({
						//count: count,
						left: Math.cos(count / 10) * 10,
						top: Math.sin(count / 10) * 10,
						//color: count % 255,
						//content: count
					});
				}
			});

		for (var i = 0; i < 1; i++) {
			boxes.push(new Box({
				number: i
			}));
		}
		var stashed = stache(
		"<div class='box-view'>"+
		"<div class='box' style='top: {{top}}px; left: {{left}}px;'>"+
		"</div>"+
		"</div>");

		var frag = stashed(boxes[0]);

		//equal(frag.children.length, 2, "there are 2 childNodes");

		ok(/top: 0px/.test(   frag.firstChild.firstChild.getAttribute("style") ), "0px");

		boxes[0].tick();

		ok(! /top: 0px/.test( frag.firstChild.firstChild.getAttribute("style")) , "!0px");

	});

	test('Tokens returning 0 where they should display the number', function () {
		var template = "<div id='zero'>{{completed}}</div>";
		var frag = stache( template )({
			completed: 0
		});

		equal( frag.firstChild.firstChild.nodeValue, "0", 'zero shown' );
	});

	test('Inverted section function returning numbers', function () {
		var template = "<div id='completed'>{{^todos.completed()}}hidden{{/todos.completed}}</div>";
		var obsvr = new SimpleMap({
			named: false
		});

		var todos = {
			completed: function () {
				return obsvr.get('named');
			}
		};

		// check hidden there
		var frag = stache( template ) ({
			todos: todos
		});

		deepEqual(frag.firstChild.firstChild.nodeValue, "hidden", 'hidden shown');

		// now update the named attribute
		obsvr.set('named', true);

		deepEqual(frag.firstChild.firstChild.nodeValue, "", 'hidden gone');

	});

	test("live-binding with escaping", function () {
		var template = "<span id='binder1'>{{ name }}</span><span id='binder2'>{{{name}}}</span>";

		var teacher = new SimpleMap({
			name: "<strong>Mrs Peters</strong>"
		});

		var tpl = stache( template );

		var frag = tpl(teacher);

		deepEqual(innerHTML(frag.firstChild), "&lt;strong&gt;Mrs Peters&lt;/strong&gt;");
		deepEqual(innerHTML(frag.lastChild.firstChild), "Mrs Peters");

		teacher.set('name', '<i>Mr Scott</i>');

		deepEqual(innerHTML(frag.firstChild), "&lt;i&gt;Mr Scott&lt;/i&gt;");

		deepEqual(innerHTML(frag.lastChild.firstChild), "Mr Scott");

	});

	test("truthy", function () {
		var t = {
			template: "{{#name}}Do something, {{this}}!{{/name}}",
			expected: "Do something, Andy!",
			data: {
				name: 'Andy'
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');

		deepEqual( getText( t.template , t.data), expected);
	});

	test("falsey", function () {
		var t = {
			template: "{{^cannot}}Don't do it, {{name}}!{{/cannot}}",
			expected: "Don't do it, Andy!",
			data: {
				name: 'Andy'
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual(getText( t.template, t.data), expected);
	});

	QUnit.test("Handlebars helpers", function () {
		stache.registerHelper('hello', function (options) {
			return 'Should not hit this';
		});
		stache.registerHelper('there', function (options) {
			return 'there';
		});
		// Test for #1985
		stache.registerHelper('zero', function (options) {
			return 0;
		});
		stache.registerHelper('bark', function (obj, str, number, options) {
			var hash = options.hash || {};
			return 'The ' + obj + ' barked at ' + str + ' ' + number + ' times, ' +
				'then the ' + hash.obj + ' ' + hash.action + ' ' +
				hash.where + ' times' + (hash.loud === true ? ' loudly' : '') + '.';
		});
		var t = {
			template: "{{hello}} {{there()}}! {{bark name 'Austin and Andy' 3 obj=name action='growled and snarled' where=2 loud=true}} Then there were {{zero()}} barks :(",
			expected: "Hello there! The dog barked at Austin and Andy 3 times, then the dog growled and snarled 2 times loudly. Then there were 0 barks :(",
			data: {
				name: 'dog',
				hello: 'Hello'
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');

		deepEqual( getText(t.template, t.data) , expected);
	});

	QUnit.test("Handlebars advanced helpers (from docs)", function () {
		stache.addHelper('exercise', function (group, action, num, options) {

			if (group && group.length > 0 && action && num > 0) {
				return options.fn({
					group: group,
					action: action,
					where: options.hash.where,
					when: options.hash.when,
					num: num
				});
			} else {
				return options.inverse(this);
			}
		});

		var t = {
			template: "{{#exercise pets 'walked' 3 where='around the block' when=time}}" +
			"Along with the {{#group}}{{.}}, {{/group}}" +
			"we {{action}} {{where}} {{num}} times {{when}}." +
			"{{else}}" +
			"We were lazy today." +
			"{{/exercise}}",
			expected: "Along with the cat, dog, parrot, we walked around the block 3 times this morning.",
			expected2: "We were lazy today.",
			data: {
				pets: ['cat', 'dog', 'parrot'],
				time: 'this morning'
			}
		};

		var template = stache(t.template);
		var frag = template(t.data);

		var div = doc.createElement("div");
		div.appendChild(frag);

		equal(innerHTML( div ), t.expected);

		equal(getText(t.template, {}), t.expected2);
	});

	test("Passing functions as data, then executing them", function () {
		var t = {
			template: "{{#nested}}{{welcome ../name}}{{/nested}}",
			expected: "Welcome Andy!",
			data: {
				name: 'Andy',
				nested: {
					welcome: function (name) {
						return 'Welcome ' + name + '!';
					}
				}
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual( getText(t.template, t.data), expected);
	});

	test("No arguments passed to helper", function () {
		var template = stache("{{noargHelper()}}");

		stache.registerHelper("noargHelper", function () {
			return "foo"
		});
		var div1 = doc.createElement('div');
		var div2 = doc.createElement('div');

		div1.appendChild(template({}));
		div2.appendChild(template(new SimpleMap()));

		deepEqual(innerHTML(div1), "foo");
		deepEqual(innerHTML(div2), "foo");
	});

	QUnit.test("String literals passed to helper should work (#1143)", 1, function() {
		stache.registerHelper("concatStrings", function(arg1, arg2) {
			return arg1 + arg2;
		});

		// Test with '=' because the regexp to find arguments uses that char
		// to delimit a keyword-arg name from its value.
		var template = stache('{{concatStrings "==" "word"}}');
		var div = doc.createElement('div');
		div.appendChild(template({}));

		equal(innerHTML(div), '==word');
	});

	test("No arguments passed to helper with list", function () {
		var template = stache("{{#items}}{{noargHelper()}}{{/items}}");
		var div = doc.createElement('div');

		div.appendChild(template({
			items: new DefineList([{
				name: "Brian"
			}])
		}, {
			noargHelper: function () {
				return "foo"
			}
		}));

		deepEqual(innerHTML(div), "foo");
	});

	if(isNormalDOM) {
		test("Partials and observes", function () {
			var template;
			var div = doc.createElement('div');

			template = stache("<table><thead><tr>{{#theData}}{{>list}}{{/theData}}</tr></thead></table>")

			var dom = template({
				theData: new SimpleMap({
					list: ["hi", "there"]
				})
			},{
				partials: {
					list: stache("{{#list}}<th>{{.}}</th>{{/list}}")
				}
			});
			div.appendChild(dom);
			var ths = div.getElementsByTagName('th');

			equal(ths.length, 2, 'Got two table headings');
			equal(innerHTML(ths[0]), 'hi', 'First column heading correct');
			equal(innerHTML(ths[1]), 'there', 'Second column heading correct');
		});
	}

	test("Deeply nested partials", function () {
		var t = {
			template: "{{#nest1}}{{#nest2}}{{>partial}}{{/nest2}}{{/nest1}}",
			expected: "Hello!",
			partials: {
				partial: stache('{{#nest3}}{{name}}{{/nest3}}')
			},
			data: {
				nest1: {
					nest2: {
						nest3: {
							name: 'Hello!'
						}
					}
				}
			}
		};

		deepEqual(getText(t.template,t.data, {partials: t.partials}), t.expected);
	});

	test("Partials correctly set context", function () {
		var t = {
			template: "{{#users}}{{>partial}}{{/users}}",
			expected: "foo - bar",
			partials: {
				partial: stache('{{ name }} - {{ ../company }}')
			},
			data: {
				users: [{
					name: 'foo'
				}],
				company: 'bar'
			}
		};

		deepEqual( getText(t.template,t.data, {partials: t.partials}), t.expected);
	});

	test("Handlebars helper: if/else", function () {
		var expected;
		var t = {
			template: "{{#if name}}{{name}}{{/if}}{{#if missing}} is missing!{{/if}}",
			expected: "Andy",
			data: {
				name: 'Andy',
				missing: undefined
			}
		};

		expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual(getText(t.template,t.data), expected);

		t.data.missing = null;
		expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual(getText(t.template,t.data), expected);
	});

	test("Handlebars helper: is/else (with 'eq' alias)", function() {
		var expected;
		var t = {
			template: '{{#eq ducks tenDucks "10"}}10 ducks{{else}}Not 10 ducks{{/eq}}',
			expected: "10 ducks",
			data: {
				ducks: '10',
				tenDucks: function() {
					return '10'
				}
			},
			liveData: new SimpleMap({
				ducks: '10',
				tenDucks: function() {
					return '10'
				}
			})
		};

		expected = t.expected.replace(/&quot;/g, '&#34;').replace(/\r\n/g, '\n');
		deepEqual(getText(t.template, t.data), expected);

		deepEqual(getText(t.template, t.liveData), expected);

		t.data.ducks = 5;

		deepEqual(getText(t.template, t.data), 'Not 10 ducks');

	});

	test("Handlebars helper: unless", function () {
		var t = {
			template: "{{#unless missing}}Andy is missing!{{/unless}}" +
		              "{{#unless isCool}} But he wasn't cool anyways.{{/unless}}",
			expected: "Andy is missing! But he wasn't cool anyways.",
			data: {
				name: 'Andy'
			},
			liveData: new SimpleMap({
				name: 'Andy',
				// #1202 #unless does not work with computes
				isCool: new Observation(function isCool() {
					return t.liveData.get("missing");
				})
			})
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');

		//deepEqual(getText(t.template, t.data), expected);

		// #1019 #unless does not live bind
		var div = doc.createElement('div');
		div.appendChild(stache(t.template)(t.liveData));

		deepEqual( innerHTML(div), expected, '#unless condition false = '+expected);

		t.liveData.set('missing', true);

		deepEqual( innerHTML(div), '', '#unless condition true');
	});

	test("Handlebars helper: each", function () {
		var t = {
			template: "{{#each names}}{{this}} {{/each}}",
			expected: "Andy Austin Justin ",
			data: {
				names: ['Andy', 'Austin', 'Justin']
			},
			data2: {
				names: new DefineList(['Andy', 'Austin', 'Justin'])
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');

		deepEqual( getText(t.template,t.data) , expected);

		var div = doc.createElement('div');

		div.appendChild(stache(t.template)(t.data2));

		deepEqual( innerHTML(div), expected, 'Using Observe.List');
		t.data2.names.push('What');
	});

	test("Handlebars helper: with", function () {
		var t = {
			template: "{{#with person}}{{name}}{{/with}}",
			expected: "Andy",
			data: {
				person: {
					name: 'Andy'
				}
			}
		};

		var expected = t.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual(getText(t.template,t.data), expected, '#with person');

		var v = {
			template: "{{#with person}}{{name}}{{/with}}",
			expected: "",
			data: {
				person: null,
				name: "Andy"
			}
		};

		expected = v.expected.replace(/&quot;/g, '&#34;')
			.replace(/\r\n/g, '\n');
		deepEqual(getText(v.template,v.data), expected, '#with person - person === null');
	});

	test("render with double angle", function () {
		var text = "{{& replace_me }}{{{ replace_me_too }}}" +
			"<ul>{{#animals}}" +
			"<li>{{.}}</li>" +
			"{{/animals}}</ul>";
		var compiled = getText(text,{
			animals: this.animals
		});
		equal(compiled, "<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>", "works")
	});

	test("comments", function () {
		var text = "{{! replace_me }}" +
			"<ul>{{#animals}}" +
			"<li>{{.}}</li>" +
			"{{/animals}}</ul>";

		var compiled = getText(text,{
			animals: this.animals
		});
		equal(compiled, "<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>")
	});

	test("multi line", function () {
		var text = "a \n b \n c";

		equal(getTextFromFrag( stache(text)({}) ), text)
	});

	test("multi line elements", function () {
		var text = "<div\n class=\"{{myClass}}\" />",
			result = stache(text)({myClass: 'a'});

		equal(result.firstChild.className, "a", "class name is right");
	});

	test("escapedContent", function () {
		var text = "<span>{{ tags }}</span><label>&amp;</label><strong>{{ number }}</strong><input value='{{ quotes }}'/>";

		var div = doc.createElement('div');

		div.appendChild( stache(text)({
			tags: "foo < bar < car > zar > poo",
			quotes: "I use 'quote' fingers & &amp;ersands \"a lot\"",
			number: 123
		}) );

		equal(div.getElementsByTagName('span')[0].firstChild.nodeValue, "foo < bar < car > zar > poo");
		equal(div.getElementsByTagName('strong')[0].firstChild.nodeValue, 123);
		equal(div.getElementsByTagName('input')[0].value, "I use 'quote' fingers & &amp;ersands \"a lot\"", "attributes are always safe, and strings are kept as-is without additional escaping");
		equal( innerHTML(div.getElementsByTagName('label')[0]), "&amp;", "text-based html entities work fine");
	});

	test("unescapedContent", function () {
		var text = "<span>{{{ tags }}}</span><div>{{{ tags }}}</div><input value='{{{ quotes }}}'/>";

		var div = doc.createElement('div');
		div.appendChild( stache(text)({
			tags: "<strong>foo</strong><strong>bar</strong>",
			quotes: 'I use \'quote\' fingers "a lot"'
		}) );

		equal(div.getElementsByTagName('span')[0].firstChild.nodeType, 1,"");
		equal( innerHTML(div.getElementsByTagName('div')[0]).toLowerCase(), "<strong>foo</strong><strong>bar</strong>");
		equal( innerHTML(div.getElementsByTagName('span')[0]).toLowerCase(), "<strong>foo</strong><strong>bar</strong>");
		equal(div.getElementsByTagName('input')[0].value, "I use 'quote' fingers \"a lot\"", "escaped no matter what");
	});

	test("attribute single unescaped, html single unescaped", function () {

		var text = "<div id='me' class='{{#task.completed}}complete{{/task.completed}}'>{{ task.name }}</div>";
		var task = new SimpleMap({
			name: 'dishes'
		});

		var div = doc.createElement('div');

		div.appendChild(stache(text)({
			task: task
		}));

		equal( innerHTML(div.getElementsByTagName('div')[0]), "dishes", "html correctly dishes")
		equal(div.getElementsByTagName('div')[0].className, "", "class empty")

		task.set('name', 'lawn')

		equal( innerHTML(div.getElementsByTagName('div')[0]), "lawn", "html correctly lawn")
		equal(div.getElementsByTagName('div')[0].className, "", "class empty")

		task.set('completed', true);

		equal(div.getElementsByTagName('div')[0].className, "complete", "class changed to complete")
	});

	test("select live binding", function () {
		var text = "<select>{{ #todos }}<option>{{ name }}</option>{{ /todos }}</select>";
		var todos, div;
		todos = new DefineList([{
			id: 1,
			name: 'Dishes'
		}]);

		div = doc.createElement('div');

		div.appendChild( stache(text)({todos: todos}) );

		equal(div.getElementsByTagName('option')
			.length, 1, '1 item in list')

		todos.push({
			id: 2,
			name: 'Laundry'
		});
		equal(div.getElementsByTagName('option')
			.length, 2, '2 items in list')

		todos.splice(0, 2);
		equal(div.getElementsByTagName('option')
			.length, 0, '0 items in list')
	});

	test('multiple hookups in a single attribute', function () {
		var text = '<div class=\'{{ obs.foo }}' +
			'{{ obs.bar }}{{ obs.baz }}{{ obs.nest.what }}\'></div>';

		var obs = new SimpleMap({
			foo: 'a',
			bar: 'b',
			baz: 'c',
			nest: new SimpleMap({
				what: 'd'
			})
		});


		var div = doc.createElement('div');

		div.appendChild( stache(text)({
			obs: obs
		}) );

		var innerDiv = div.firstChild;

		equal(getAttr(innerDiv, 'class'), "abcd", 'initial render');

		obs.set('bar', 'e');

		equal(getAttr(innerDiv, 'class'), "aecd", 'initial render');

		obs.set('bar', 'f');

		equal(getAttr(innerDiv, 'class'), "afcd", 'initial render');

		obs.get('nest').set('what', 'g');

		equal(getAttr(innerDiv, 'class'), "afcg", 'nested observe');
	});

	test('adding and removing multiple html content within a single element', function () {

		var text, obs;

		text = '<div>{{ obs.a }}{{ obs.b }}{{ obs.c }}</div>';

		obs = new SimpleMap({
			a: 'a',
			b: 'b',
			c: 'c'
		});


		var div = doc.createElement('div');

		div.appendChild(stache(text)({
			obs: obs
		}));

		equal( innerHTML(div.firstChild), 'abc', 'initial render');

		obs.set({
			a: '',
			b: '',
			c: ''
		});

		equal(innerHTML(div.firstChild), '', 'updated values');

		obs.set({
			c: 'c'
		});

		equal( innerHTML(div.firstChild), 'c', 'updated values');
	});

	test('live binding and removeAttr', function () {
		var text = '{{ #obs.show }}' +
				'<p {{ ../obs.attributes }} class="{{ ../obs.className }}"><span>{{ ../obs.message }}</span></p>' +
				'{{ /obs.show }}',

			obs = new SimpleMap({
				show: true,
				className: 'myMessage',
				attributes: 'some=\"myText\"',
				message: 'Live long and prosper'
			}),

			div = doc.createElement('div');

		div.appendChild(stache(text)({
			obs: obs
		}));

		var p = div.getElementsByTagName('p')[0],
			span = p.getElementsByTagName('span')[0];

		equal(p.getAttribute("some"), "myText", 'initial render attr');
		equal(getAttr(p, "class"), "myMessage", 'initial render class');
		equal( innerHTML(span), 'Live long and prosper', 'initial render innerHTML');

		obs.set('className', undefined);

		equal(getAttr(p, "class"), '', 'class is undefined');

		obs.set('className', 'newClass');

		equal(getAttr(p, "class"), 'newClass', 'class updated');

		obs.set('attributes',undefined);

		equal(p.getAttribute('some'), null, 'attribute is undefined');

		obs.set('attributes', 'some="newText"');

		//
		equal(p.getAttribute('some'), 'newText', 'attribute updated');

		obs.set('message',undefined);

		equal(innerHTML(span), '', 'text node value is empty');

		obs.set('message', 'Warp drive, Mr. Sulu');

		equal(innerHTML(span), 'Warp drive, Mr. Sulu', 'text node updated');

		obs.set('show',undefined);

		equal( innerHTML(div), '', 'value in block statement is undefined');

		obs.set('show', true);

		p = div.getElementsByTagName('p')[0];
		span = p.getElementsByTagName('span')[0];

		equal(p.getAttribute("some"), "newText", 'value in block statement updated attr');
		equal(getAttr(p, "class"), "newClass", 'value in block statement updated class');
		equal( innerHTML(span), 'Warp drive, Mr. Sulu', 'value in block statement updated innerHTML');

	});

	test('hookup within a tag', function () {
		var text = '<div {{ obs.foo }} ' + '{{ obs.baz }}>lorem ipsum</div>',

			obs = new SimpleMap({
				foo: 'class="a"',
				baz: 'some=\'property\''
			}),

			compiled = stache(text)({obs: obs})

		var div = doc.createElement('div');
		div.appendChild(compiled);
		var anchor = div.getElementsByTagName('div')[0];

		equal(getAttr(anchor, 'class'), 'a');
		equal(anchor.getAttribute('some'), 'property');

		obs.set('foo', 'class="b"');
		equal(getAttr(anchor, 'class'), 'b');
		equal(anchor.getAttribute('some'), 'property');

		obs.set('baz', 'some=\'new property\'');
		equal(getAttr(anchor, 'class'), 'b');
		equal(anchor.getAttribute('some'), 'new property');

		obs.set('foo', 'class=""');
		obs.set('baz', '');
		equal(getAttr(anchor, 'class'), "", 'anchor class blank');
		equal(anchor.getAttribute('some'), undefined, 'attribute "some" is undefined');
	});

	test('single escaped tag, removeAttr', function () {
		var text = '<div {{ obs.foo }}>lorem ipsum</div>',

			obs = new SimpleMap({
				foo: 'data-bar="john doe\'s bar"'
			}),

			compiled = stache(text)({obs: obs})

		var div = doc.createElement('div');
		div.appendChild(compiled);
		var anchor = div.getElementsByTagName('div')[0];

		equal(anchor.getAttribute('data-bar'), "john doe's bar");

		obs.set('foo',undefined);
		equal(anchor.getAttribute('data-bar'), null);

		obs.set('foo', 'data-bar="baz"');
		equal(anchor.getAttribute('data-bar'), 'baz');
	});

	test('html comments', function () {
		var text = '<!-- bind to changes in the todo list --> <div>{{obs.foo}}</div>';

		var obs = new SimpleMap({
			foo: 'foo'
		});

		var compiled = stache(text)({
			obs: obs
		});

		var div = doc.createElement('div');
		div.appendChild(compiled);
		equal( innerHTML(div.getElementsByTagName('div')[0]), 'foo', 'Element as expected');
	});

	test("hookup and live binding", function () {

		var text = "<div class='{{ task.completed }}' {{ domData 'task' task }}>" +
				"{{ task.name }}" +
				"</div>",
			task = new SimpleMap({
				completed: false,
				className: 'someTask',
				name: 'My Name'
			}),
			compiled = stache(text)({
				task: task
			}),
			div = doc.createElement('div');

		div.appendChild(compiled)
		var child = div.getElementsByTagName('div')[0];
		ok(child.className.indexOf("false") > -1, "is incomplete")
		ok( !! domData.get(child, 'task'), "has data")
		equal(innerHTML(child), "My Name", "has name")

		task.set({
			completed: true,
			name: 'New Name'
		});

		ok(child.className.indexOf("true") !== -1, "is complete")
		equal(innerHTML(child), "New Name", "has new name")

	});

	test('multiple curly braces in a block', function () {
		var text = '{{^obs.items}}' +
				'<li>No items</li>' +
				'{{/obs.items}}' +
				'{{#obs.items}}' +
				'<li>{{name}}</li>' +
				'{{/obs.items}}',

			obs = new SimpleMap({
				items: []
			}),

			compiled = stache(text)({obs: obs})

		var ul = doc.createElement('ul');
		ul.appendChild(compiled);

		equal( innerHTML(ul.getElementsByTagName('li')[0]), 'No items', 'initial observable state');

		obs.set('items', [{
			name: 'foo'
		}]);
		equal( innerHTML(ul.getElementsByTagName('li')[0]), 'foo', 'updated observable');
	});

	test("unescape bindings change", function () {
		var l = new DefineList([{
			complete: true
		}, {
			complete: false
		}, {
			complete: true
		}]);
		var completed = function () {
			l.get('length');
			var num = 0;
			l.forEach(function (item) {
				if (item.get('complete')) {
					num++;
				}
			})
			return num;
		};

		var text = '<div>{{ completed() }}</div>',

			compiled = stache(text)({
				completed: completed
			});

		var div = doc.createElement('div');
		div.appendChild(compiled);

		var child = div.getElementsByTagName('div')[0];
		equal( innerHTML(child), "2", "at first there are 2 true bindings");
		var item = new SimpleMap({
			complete: true,
			id: "THIS ONE"
		});
		l.push(item);

		equal(innerHTML(child), "3", "now there are 3 complete");

		item.set('complete', false);

		equal(innerHTML(child), "2", "now there are 2 complete");

		l.pop();

		item.set('complete', true);

		equal(innerHTML(child), "2", "there are still 2 complete");
	});

	test("escape bindings change", function () {
		var l = new DefineList([{
			complete: true
		}, {
			complete: false
		}, {
			complete: true
		}]);
		var completed = function () {
			l.get('length');
			var num = 0;
			l.forEach(function (item) {
				if (item.get('complete')) {
					num++;
				}
			})
			return num;
		};

		var text = '<div>{{{ completed() }}}</div>',

			compiled = stache(text)({
				completed: completed
			});

		var div = doc.createElement('div');
		div.appendChild(compiled);

		var child = div.getElementsByTagName('div')[0];
		equal(innerHTML(child), "2", "at first there are 2 true bindings");
		var item = new SimpleMap({
			complete: true
		})
		l.push(item);

		equal(innerHTML(child), "3", "now there are 3 complete");

		item.set('complete', false);

		equal(innerHTML(child), "2", "now there are 2 complete");
	});

	test("tag bindings change", function () {
		var l = new DefineList([{
			complete: true
		}, {
			complete: false
		}, {
			complete: true
		}]);
		var completed = function () {
			l.get('length');
			var num = 0;
			l.forEach(function (item) {
				if (item.get('complete')) {
					num++;
				}
			})
			return "items='" + num + "'";
		};

		var text = '<div {{{ completed() }}}></div>',

			compiled = stache(text)({
				completed: completed
			});

		var div = doc.createElement('div');
		div.appendChild(compiled);

		var child = div.getElementsByTagName('div')[0];
		equal(child.getAttribute("items"), "2", "at first there are 2 true bindings");
		var item = new SimpleMap({
			complete: true
		})
		l.push(item);

		equal(child.getAttribute("items"), "3", "now there are 3 complete");

		item.set('complete', false);

		equal(child.getAttribute("items"), "2", "now there are 2 complete");
	})

	test("attribute value bindings change", function () {
		var l = new DefineList([{
			complete: true
		}, {
			complete: false
		}, {
			complete: true
		}]);
		var completed = function () {
			l.get('length');
			var num = 0;
			l.forEach(function (item) {
				if (item.get('complete')) {
					num++;
				}
			});
			return num;
		};

		var text = '<div items="{{{ completed() }}}"></div>',

			compiled = stache(text)({
				completed: completed
			});

		var div = doc.createElement('div');
		div.appendChild(compiled);

		var child = div.getElementsByTagName('div')[0];
		equal(child.getAttribute("items"), "2", "at first there are 2 true bindings");
		var item = new SimpleMap({
			complete: true
		});
		l.push(item);

		equal(child.getAttribute("items"), "3", "now there are 3 complete");

		item.set('complete', false);

		equal(child.getAttribute("items"), "2", "now there are 2 complete");
	});

	test("in tag toggling", function () {
		var text = "<div {{ obs.val }}></div>"

		var obs = new SimpleMap({
			val: 'foo="bar"'
		})

		var compiled = stache(text)({
			obs: obs
		});

		var div = doc.createElement('div');

		div.appendChild(compiled);

		obs.set('val', "bar='foo'");
		obs.set('val', 'foo="bar"')
		var d2 = div.getElementsByTagName('div')[0];
		// toUpperCase added to normalize cases for IE8
		equal(d2.getAttribute("foo"), "bar", "bar set");
		equal(d2.getAttribute("bar"), null, "bar set")
	});

	// not sure about this w/ mustache
	test("nested properties", function () {

		var text = "<div>{{ obs.name.first }}</div>"

		var obs = new SimpleMap({
			name: new SimpleMap({
				first: "Justin"
			})
		})

		var compiled = stache(text)({
			obs: obs
		});

		var div = doc.createElement('div');

		div.appendChild(compiled);

		div = div.getElementsByTagName('div')[0];

		equal(innerHTML(div), "Justin")

		obs.get('name').set('first', "Brian")

		equal(innerHTML(div), "Brian")

	});

	test("tags without chidren or ending with /> do not change the state", function () {

		var text = "<table><tr><td/>{{{ obs.content }}}</tr></div>"
		var obs = new SimpleMap({
			content: "<td>Justin</td>"
		})
		var compiled = stache(text)({
			obs: obs
		});
		var div = doc.createElement('div');
		var html = compiled;
		div.appendChild(html);

		equal(div.getElementsByTagName('span')
			.length, 0, "there are no spans");
		equal(div.getElementsByTagName('td')
			.length, 2, "there are 2 td");
	})

	test("nested live bindings", function () {
		expect(0);

		var items = new DefineList([{
			title: 0,
			is_done: false,
			id: 0
		}]);

		var div = doc.createElement('div');

		var template = stache('<form>{{#items}}{{^is_done}}<div id="{{title}}"></div>{{/is_done}}{{/items}}</form>')

		div.appendChild(template({
			items: items
		}));

		items.push({
			title: 1,
			is_done: false,
			id: 1
		});
		// this will throw an error unless Mustache protects against
		// nested objects
		items[0].set('is_done', true);
	});

	test("list nested in observe live bindings", function () {
		var template = stache("<ul>{{#data.items}}<li>{{name}}</li>{{/data.items}}</ul>");
		var data = new SimpleMap({
			items: new DefineList([{
				name: "Brian"
			}, {
				name: "Fara"
			}])
		});
		var div = doc.createElement('div');
		div.appendChild(template({
			data: data
		}));
		data.get("items").push(new SimpleMap({
			name: "Scott"
		}))
		ok(/Brian/.test(innerHTML(div)), "added first name")
		ok(/Fara/.test(innerHTML(div)), "added 2nd name")
		ok(/Scott/.test(innerHTML(div)), "added name after push")
	});

	test("trailing text", function () {
		var template = stache("There are {{ length }} todos")
		var div = doc.createElement('div');
		div.appendChild(template(new DefineList([{}, {}])));
		ok(/There are 2 todos/.test(innerHTML(div)), "got all text");
	});

	if(isNormalDOM) {
		test("recursive views", function () {
			var template = stache('<div class="template">'+
				'{{#items}}'+
					'<div class="loop">'+
						'{{#item.children}}'+
							'<div class="node">'+
								'{{>recursive}}'+
							'</div>'+
						'{{/item.children}}'+
						'{{^item.children}}'+
							'<div class="leaf">L</div>'+
						'{{/item.children}}'+
					'</div>'+
				'{{/items}}'+
				'</div>');

			var data = new DefineList([{
				label: 'branch1',
				children: [{
					id: 2,
					label: 'branch2'
				}]
			}]);

			var div = doc.createElement('div');
			var frag = template({
				items: data
			},{
				partials: {
					recursive: template
				}
			})

			div.appendChild(frag);
			ok(/class="?leaf"?/.test(innerHTML(div)), "we have a leaf")

		});
	}

	test("live binding textarea", function () {
		var template = stache("<textarea>Before{{ obs.middle }}After</textarea>");

		var obs = new SimpleMap({
				middle: "yes"
			}),
			div = doc.createElement('div');

		div.appendChild(template({
			obs: obs
		}));
		var textarea = div.firstChild;

		equal(getValue(textarea), "BeforeyesAfter");

		obs.set("middle", "Middle");

		equal(getValue(textarea), "BeforeMiddleAfter");

	});

	QUnit.test("helper parameters don't convert functions", function () {
		stache.registerHelper('helperWithFn', function (fn) {
			ok(typeof fn === "function", 'Parameter is a function');
			equal(fn(), 'Hit me!', 'Got the expected function');
		});

		var renderer = stache('{{helperWithFn test}}');
		renderer({
			test: function () {
				return 'Hit me!';
			}
		});
	})

	QUnit.test("computes as helper parameters don't get converted", function () {
		stache.registerHelper('computeTest', function (no) {
			equal(no(), 5, 'Got computed calue');
			ok(no.isComputed, 'no is still a compute')
		});

		var renderer = stache('{{computeTest test}}');
		renderer({
			test: new SimpleObservable(5)
		});
	});

	test("computes are supported in default helpers", function () {

		var staches = {
			"if": "{{#if test}}if{{else}}else{{/if}}",
			"not_if": "not_{{^if test}}not{{/if}}if",
			"each": "{{#each test}}{{.}}{{/each}}",
			"with": "wit{{#with test}}<span>{{3}}</span>{{/with}}"
		};

		var template = stache("There are {{ length }} todos");
		var div = doc.createElement('div');
		div.appendChild(template(new DefineList([{}, {}])));
		ok(/There are 2 todos/.test(innerHTML(div)), "got all text");

		var renderer, result, data, actual, span;

		for (result in staches) {
			renderer = stache(staches[result]);
			data = ["e", "a", "c", "h"];
			div = doc.createElement("div");
			actual = renderer({
				test: new DefineList(data)
			});
			div.appendChild(actual);
			span = div.getElementsByTagName("span")[0];
			if (span && span.firstChild) {
				div.insertBefore(span.firstChild, span);
				div.removeChild(span);
			}
			actual = innerHTML(div);

			equal(actual, result, "canCompute resolved for helper " + result);
		}

		var inv_staches = {
			"else": "{{#if test}}if{{else}}else{{/if}}",
			"not_not_if": "not_{{^if test}}not_{{/if}}if",
			"not_each": "not_{{#each test}}_{{/each}}each"
			//"not_with": "not{{#with test}}_{{/with}}_with" //{{#with}} *always* renders non-inverse block
		};

		for (result in inv_staches) {
			renderer = stache(inv_staches[result]);
			data = null;
			div = doc.createElement("div");
			actual = renderer({
				test: null
			});
			div.appendChild(actual);
			actual = innerHTML(div);

			equal(actual, result, "canCompute resolved for helper " + result);
		}

	});

	//Issue 233
	test("multiple tbodies in table hookup", function () {
		var text = "<table>" +
				"{{#people}}" +
				"<tbody><tr><td>{{name}}</td></tr></tbody>" +
				"{{/people}}" +
				"</table>",
			people = new DefineList([{
				name: "Steve"
			}, {
				name: "Doug"
			}]),
			compiled = stache(text)({
				people: people
			});
		equal( compiled.firstChild.getElementsByTagName("tbody").length, 2, "two tbodies");
	});

	// http://forum.javascriptmvc.com/topic/live-binding-on-mustache-template-does-not-seem-to-be-working-with-nested-properties
	test("Observe with array attributes", function () {
		var renderer = stache('<ul>{{#todos}}<li>{{.}}</li>{{/todos}}</ul><div>{{message}}</div>');
		var div = doc.createElement('div');
		var data = new SimpleMap({
			todos: new DefineList( ['Line #1', 'Line #2', 'Line #3'] ),
			message: 'Hello',
			count: 2
		});
		div.appendChild(renderer(data));

		equal(innerHTML(div.getElementsByTagName('li')[1]), 'Line #2', 'Check initial array');
		equal(innerHTML(div.getElementsByTagName('div')[0]), 'Hello', 'Check initial message');

		data.get('todos').set(1, 'Line #2 changed');
		data.set('message', 'Hello again');

		equal(innerHTML(div.getElementsByTagName('li')[1]), 'Line #2 changed', 'Check updated array');
		equal(innerHTML(div.getElementsByTagName('div')[0]), 'Hello again', 'Check updated message');
	});

	test("Observe list returned from the function", function () {
		var renderer = stache('<ul>{{#todos()}}<li>{{.}}</li>{{/todos}}</ul>');
		var div = doc.createElement('div');
		var todos = new DefineList();
		var data = {
			todos: function () {
				return todos;
			}
		};
		div.appendChild(renderer(data));

		todos.push("Todo #1")

		equal(div.getElementsByTagName('li')
			.length, 1, 'Todo is successfuly created');
		equal(innerHTML(div.getElementsByTagName('li')[0]), 'Todo #1', 'Pushing to the list works');
	});

	// https://github.com/canjs/canjs/issues/228
	QUnit.test("Contexts within helpers not always resolved correctly", function () {

		stache.registerHelper("bad_context", function (context, options) {
			return ["<span>"+this.text+"</span> should not be ",options.fn(context)];
		});

		var renderer = stache('{{#bad_context next_level}}<span>{{text}}</span><br/><span>{{other_text}}</span>{{/bad_context}}'),
			data = {
				next_level: {
					text: "bar",
					other_text: "In the inner context"
				},
				text: "foo"
			},
			div = doc.createElement('div');

		div.appendChild(renderer(data));

		equal(innerHTML(div.getElementsByTagName('span')[0]), "foo", 'Incorrect context passed to helper');
		equal(innerHTML(div.getElementsByTagName('span')[1]), "bar", 'Incorrect text in helper inner template');
		equal(innerHTML(div.getElementsByTagName('span')[2]), "In the inner context", 'Incorrect other_text in helper inner template');
	});

	// https://github.com/canjs/canjs/issues/227
	QUnit.test("Contexts are not always passed to partials properly", function () {
		var inner = stache('{{#if ../other_first_level}}{{../other_first_level}}{{else}}{{second_level}}{{/if}}');

		var renderer = stache('{{#first_level}}<span>{{> inner}}</span> should equal <span>{{../other_first_level}}</span>{{/first_level}}'),
			data = {
				first_level: {
					second_level: "bar"
				},
				other_first_level: "foo"
			},
			div = doc.createElement('div');

		div.appendChild(renderer(data, {partials: {inner: inner}}));
		equal(innerHTML(div.getElementsByTagName('span')[0]), "foo", 'Incorrect context passed to helper');
		equal(innerHTML(div.getElementsByTagName('span')[1]), "foo", 'Incorrect text in helper inner template');
	});

	// https://github.com/canjs/canjs/issues/231
	QUnit.test("Functions and helpers should be passed the same context", function () {

		var textNodes = function(el, cb) {
			var cur = el.firstChild;
			while(cur){
				if(cur.nodeType === 3) {
					cb(cur)
				} else if(el.nodeType === 1) {
					textNodes(cur, cb)
				}
				cur = cur.nextSibling;
			}
		};

		stache.registerHelper("to_upper", function (options) {
			var frag = options.fn(options.context);
			textNodes(frag, function(el){
				el.nodeValue = el.nodeValue.toUpperCase();
			});
			return frag;
		});

		var renderer = stache(' "<span>{{#to_upper()}}{{next_level.text()}}{{/to_upper}}</span>"'),
			data = {
				next_level: {
					text: function () {
						return this.other_text;
					},
					other_text: "In the inner context"
				}
			},
			div = doc.createElement('div');

		div.appendChild(renderer(data));

		equal(innerHTML(div.getElementsByTagName('span')[0]), data.next_level.other_text.toUpperCase(), 'correct context passed to helper');
	});

	// https://github.com/canjs/canjs/issues/153
	test("Interpolated values when iterating through an Observe.List should still render when not surrounded by a DOM node", function () {
		var renderer = stache('{{ #todos }}{{ name }}{{ /todos }}'),
			renderer2 = stache('{{ #todos }}<span>{{ name }}</span>{{ /todos }}'),
			todos = [{
				id: 1,
				name: 'Dishes'
			}, {
				id: 2,
				name: 'Forks'
			}],
			liveData = {
				todos: new DefineList(todos)
			},
			plainData = {
				todos: todos
			},
			div = doc.createElement('div');

		div.appendChild(renderer2(plainData));

		equal(innerHTML(div.getElementsByTagName('span')[0]), "Dishes", 'Array item rendered with DOM container');
		equal(innerHTML(div.getElementsByTagName('span')[1]), "Forks", 'Array item rendered with DOM container');

		div.innerHTML = '';
		div.appendChild(renderer2(liveData));

		equal(innerHTML(div.getElementsByTagName('span')[0]), "Dishes", 'List item rendered with DOM container');
		equal(innerHTML(div.getElementsByTagName('span')[1]), "Forks", 'List item rendered with DOM container');

		div = doc.createElement('div');

		div.appendChild(renderer(plainData));
		equal(innerHTML(div), "DishesForks", 'Array item rendered without DOM container');

		div = doc.createElement('div');

		div.appendChild(renderer(liveData));
		equal(innerHTML(div), "DishesForks", 'List item rendered without DOM container');

		liveData.todos.push({
			id: 3,
			name: 'Knives'
		});
		equal(innerHTML(div), "DishesForksKnives", 'New list item rendered without DOM container');
	});

	test("objects with a 'key' or 'index' property should work in helpers", function () {
		var renderer = stache('{{ #obj }}{{ show_name(this) }}{{ /obj }}'),
			div = doc.createElement('div');

		div.appendChild(renderer({
			obj: {
				id: 2,
				name: 'Forks',
				key: 'bar'
			}
		}, {
			show_name: function (obj) {
				return obj.name;
			}
		}));
		equal(innerHTML(div), "Forks", 'item name rendered');

		div = doc.createElement('div');

		div.appendChild(renderer({
			obj: {
				id: 2,
				name: 'Forks',
				index: 'bar'
			}
		}, {
			show_name: function (obj) {
				return obj.name;
			}
		}));
		equal(innerHTML(div), "Forks", 'item name rendered');
	});

	test("2 way binding helpers", function () {

		var Value = function (el, value) {
			this.updateElement = function (ev, newVal) {
				el.value = newVal || "";
			};
			value.bind("change", this.updateElement);
			el.onchange = function () {
				value(el.value)
			}
			this.teardown = function () {
				value.unbind("change", this.updateElement);
				el.onchange = null;
			}
			el.value = value() || "";
		}
		var val;
		stache.registerHelper('myValue', function (value) {
			return function (el) {
				val = new Value(el, value);
			}
		});

		var renderer = stache('<input {{myValue user.name}}/>');

		var div = doc.createElement('div'),
			u = new SimpleMap({
				name: "Justin"
			});

		div.appendChild(renderer({
			user: u
		}));

		var input = div.getElementsByTagName('input')[0];

		equal(input.value, "Justin", "Name is set correctly")

		u.set('name', 'Eli')

		equal(input.value, "Eli", "Changing observe updates value");

		input.value = "Austin";
		input.onchange();

		equal(u.get('name'), "Austin", "Name changed by input field");

		val.teardown();

		// name is undefined
		renderer = stache('<input {{myValue user.name}}/>');
		div = doc.createElement('div');
		u = new SimpleMap({});
		div.appendChild(renderer({
			user: u
		}));
		input = div.getElementsByTagName('input')[0];

		equal(input.value, "", "Name is set correctly")

		u.set('name', 'Eli')

		equal(input.value, "Eli", "Changing observe updates value");

		input.value = "Austin";
		input.onchange();
		equal(u.get('name'), "Austin", "Name changed by input field");
		val.teardown();

		// name is null
		renderer = stache('<input {{myValue user.name}}/>');
		div = doc.createElement('div');
		u = new SimpleMap({
			name: null
		});
		div.appendChild(renderer({
			user: u
		}));
		input = div.getElementsByTagName('input')[0];

		equal(input.value, "", "Name is set correctly with null")

		u.set('name', 'Eli')

		equal(input.value, "Eli", "Changing observe updates value");

		input.value = "Austin";
		input.onchange();
		equal(u.get('name'), "Austin", "Name changed by input field");
		val.teardown();

	});

	test("can pass in partials", function () {

		var hello = stache("<p>Hello {{> name}}</p>");
		var fancyName = stache("<span class='fancy'>{{name}}</span>");

		var result = hello({
			name: "World"
		}, {
			partials: {
				name: fancyName
			}
		});



		ok(/World/.test(innerHTML(result.firstChild)), "Hello World worked");
	});

	test("can pass in helpers", function () {
		var helpers = stache("<p>Hello {{cap name}}</p>");
		var result = helpers({
			name: "world"
		}, {
			helpers: {
				cap: function (name) {
					return string.capitalize(name);
				}
			}
		});

		ok(/World/.test(innerHTML(result.firstChild)), "Hello World worked");
	});

	test("HTML comment with helper", function () {
		var text = ["<ul>",
				"{{#todos}}",
				"<li {{data 'todo'}}>",
				"<!-- html comment #1 -->",
				"{{name}}",
				"<!-- html comment #2 -->",
				"</li>",
				"{{/todos}}",
				"</ul>"
			],
			todos = new DefineList([{
				id: 1,
				name: "Dishes"
			}]),
			compiled = stache(text.join("\n"))({
				todos: todos
			}),
			div = doc.createElement("div"),
			li;

		var comments = function (el) {
			var count = 0;
			var cur = el.firstChild;
			while(cur) {
				if (cur.nodeType === 8) {
					++count;
				}
				cur = cur.nextSibling;
			}
			return count;
		};

		div.appendChild(compiled);
		li = div.getElementsByTagName("ul")[0].getElementsByTagName("li");
		equal(li.length, 1, "1 item in list");
		equal(comments(li[0]), 2, "2 comments in item #1");

		todos.push({
			id: 2,
			name: "Laundry"
		});

		li = div.getElementsByTagName("ul")[0].getElementsByTagName("li");

		equal(li.length, 2, "2 items in list");
		equal(comments(li[0]), 2, "2 comments in item #1");
		equal(comments(li[1]), 2, "2 comments in item #2");

		todos.splice(0, 2);

		li = div.getElementsByTagName("ul")[0].getElementsByTagName("li");

		equal(li.length, 0, "0 items in list");
	});

	test("Empty strings in arrays within Observes that are iterated should return blank strings", function () {
		var data = new SimpleMap({
				colors: ["", 'red', 'green', 'blue']
			}),
			compiled = stache("<select>{{#colors}}<option>{{.}}</option>{{/colors}}</select>")(data),
			div = doc.createElement('div');

		div.appendChild(compiled);
		equal(innerHTML(div.getElementsByTagName('option')[0]), "", "Blank string should return blank");
	});

	test("Null properties do not throw errors", function () {
		var renderer = stache("Foo bar {{#foo.bar}}exists{{/foo.bar}}{{^foo.bar}}does not exist{{/foo.bar}}"),
			div = doc.createElement('div'),
			div2 = doc.createElement('div'),
			frag, frag2;

		try {
			frag = renderer(new SimpleMap({
				foo: null
			}));
		} catch (e) {
			ok(false, "rendering with null threw an error");
		}
		frag2 = renderer(new SimpleMap({
			foo: {
				bar: "baz"
			}
		}));
		div.appendChild(frag);
		div2.appendChild(frag2);
		equal(innerHTML(div), "Foo bar does not exist");
		equal(innerHTML(div2), "Foo bar exists");
	});

	// Issue #288
	test("Data helper should set proper data instead of a context stack", function () {
		var partials = {
			'nested_data': stache('<span id="has_data" {{data "attr"}}></span>'),
			'nested_data2': stache('{{#this}}<span id="has_data" {{data "attr"}}></span>{{/this}}'),
			'nested_data3': stache('{{#../bar}}<span id="has_data" {{data "attr"}}></span>{{/../bar}}')
		};

		var renderer = stache("{{#bar}}{{> nested_data}}{{/bar}}"),
			renderer2 = stache("{{#bar}}{{> nested_data2}}{{/bar}}"),
			renderer3 = stache("{{#bar}}{{> nested_data3}}{{/bar}}"),
			div = doc.createElement('div'),
			data = new SimpleMap({
				foo: "bar",
				bar: new SimpleMap({})
			}),
			span;

		div = doc.createElement('div');

		div.appendChild(renderer(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domDataState.get.call(span, 'attr'), data.get('bar'), 'Nested data 1 should have correct data');

		div = doc.createElement('div');
		div.appendChild(renderer2(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domDataState.get.call(span, 'attr'), data.get('bar'), 'Nested data 2 should have correct data');

		div = doc.createElement('div');
		div.appendChild(renderer3(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domDataState.get.call(span, 'attr'), data.get('bar'), 'Nested data 3 should have correct data');
	});

	test("domData helper should set proper data instead of a context stack", function () {
		var partials = {
			'nested_data': stache('<span id="has_data" {{domData "attr"}}></span>'),
			'nested_data2': stache('{{#this}}<span id="has_data" {{domData "attr"}}></span>{{/this}}'),
			'nested_data3': stache('{{#../bar}}<span id="has_data" {{domData "attr"}}></span>{{/../bar}}')
		};

		var renderer = stache("{{#bar}}{{> nested_data}}{{/bar}}"),
			renderer2 = stache("{{#bar}}{{> nested_data2}}{{/bar}}"),
			renderer3 = stache("{{#bar}}{{> nested_data3}}{{/bar}}"),
			div = doc.createElement('div'),
			data = new SimpleMap({
				foo: "bar",
				bar: new SimpleMap({})
			}),
			span;

		div = doc.createElement('div');

		div.appendChild(renderer(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domData.get(span, 'attr'), data.get('bar'), 'Nested data 1 should have correct data');

		div = doc.createElement('div');
		div.appendChild(renderer2(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domData.get(span, 'attr'), data.get('bar'), 'Nested data 2 should have correct data');

		div = doc.createElement('div');
		div.appendChild(renderer3(data,{partials: partials}));
		span = div.getElementsByTagName('span')[0];
		strictEqual(domData.get(span, 'attr'), data.get('bar'), 'Nested data 3 should have correct data');
	});

	test("data helper should store passed values", function () {
		var template = "<span {{data('todo' todos[0])}}></span>";
		var vm = new DefineMap({
			todos: [
				{
					id: 1,
					name: "Dishes"
				}
			]
		});
		var rendered = stache(template)(vm);
		var div = doc.createElement('div');
		div.appendChild(rendered);
		var span = div.getElementsByTagName('span')[0];
		strictEqual(domDataState.get.call(span, 'todo'), vm.todos[0], 'can-dom-data-state should have the correct value');
	});

	test("domData helper should store passed values", function () {
		var template = "<span {{domData('todo' todos[0])}}></span>";
		var vm = new DefineMap({
			todos: [
				{
					id: 1,
					name: "Dishes"
				}
			]
		});
		var rendered = stache(template)(vm);
		var div = doc.createElement('div');
		div.appendChild(rendered);
		var span = div.getElementsByTagName('span')[0];
		strictEqual(domData.get(span, 'todo'), vm.todos[0], 'can-dom-data should have the correct value');
	});

	test("avoid global helpers", function () {
		var noglobals = stache("{{sometext person.name}}");

		var div = doc.createElement('div'),
			div2 = doc.createElement('div');

		var person = new SimpleMap({
			name: "Brian"
		});
		var result = noglobals({
			person: person
		}, {
			sometext: function (name) {
				return "Mr. " + name()
			}
		});

		var result2 = noglobals({
			person: person
		}, {
			sometext: function (name) {
				return name() + " rules"
			}
		});

		div.appendChild(result);
		div2.appendChild(result2);

		person.set("name", "Ajax")

		equal(innerHTML(div), "Mr. Ajax");
		equal(innerHTML(div2), "Ajax rules");
	});

	QUnit.test("scope functions should have priority over local helpers over global helpers", function() {
		stache.addHelper('help', function() { return 'global'; });

		/*
		 * if there is a local helper, a function on the scope, and a global helper
		 * the local helper takes precedence
		 */
		var result = getText(
			'{{help()}}', {
				help: function() { return 'scope'; }
			}, {
				help: function() { return 'local'; }
			}
		);

		QUnit.equal(result, 'scope', 'scope function, local, global - uses scope');

		/*
		 * if there is a function on the scope and a global helper
		 * the function on the scope takes precedence
		 */
		result = getText(
			'{{help()}}', {
			},{
				help: function() { return 'local'; }
			}
		);
		QUnit.equal(result, 'local', 'local, global - uses local');

		/*
		 * if there is only a global helper
		 * call it
		 */
		result = getText(
			'{{help()}}'
		);
		QUnit.equal(result, 'global', 'global - uses global');

	});


	test("Each does not redraw items", function () {

		var animals = new DefineList(['sloth', 'bear']),
			renderer = stache("<div>my<b>favorite</b>animals:{{#each animals}}<label>Animal=</label> <span>{{this}}</span>{{/}}!</div>");

		var div = doc.createElement('div')

		var frag = renderer({
			animals: animals
		});
		div.appendChild(frag)

		div.getElementsByTagName('label')[0].myexpando = "EXPANDO-ED";

		//animals.push("dog")
		equal(div.getElementsByTagName('label')
			.length, 2, "There are 2 labels");

		animals.push("turtle")

		equal(div.getElementsByTagName('label')[0].myexpando, "EXPANDO-ED", "same expando");

		equal(innerHTML(div.getElementsByTagName('span')[2]), "turtle", "turtle added");

	});

	test("Each works with the empty list", function () {

		var animals = new DefineList([]),
			renderer = stache("<div>my<b>favorite</b>animals:{{#each animals}}<label>Animal=</label> <span>{{this}}</span>{{/}}!</div>");

		var div = doc.createElement('div')

		var frag = renderer({
			animals: animals
		});
		div.appendChild(frag)

		animals.push('sloth', 'bear')

		//animals.push("dog")
		equal(div.getElementsByTagName('label')
			.length, 2, "There are 2 labels")

		//animals.push("turtle")

		//equal(div.getElementsByTagName('span')[2].innerHTML, "turtle", "turtle added");

	});

	test("each works within another branch", function () {
		var animals = new DefineList(['sloth']),
			template = "<div>Animals:" +
				"{{#if animals.length}}~" +
				"{{#each animals}}" +
				"<span>{{.}}</span>" +
				"{{/each}}" +
				"{{else}}" +
				"No animals" +
				"{{/if}}" +
				"!</div>";

		var renderer = stache(template);

		var div = doc.createElement('div');

		var frag = renderer({
			animals: animals
		});
		div.appendChild(frag);

		equal(div.getElementsByTagName('span')
			.length, 1, "There is 1 sloth");

		animals.pop();

		equal(innerHTML(div.getElementsByTagName('div')[0]), "Animals:No animals!");
	});

	test("a compute gets passed to a plugin", function () {

		stache.registerHelper('iamhungryforcomputes', function (value) {
			ok(value.isComputed, "value is a compute")
			return function (el) {

			}
		});

		var renderer = stache('<input {{iamhungryforcomputes userName}}/>');

		var div = doc.createElement('div'),
			u = new SimpleMap({
				name: "Justin"
			});
		var nameCompute = new Observation(function(){
			return u.get('name');
		})
		div.appendChild(renderer({
			userName: nameCompute
		}));

	});

	// CHANGED FROM MUSTACHE
	test("Object references can escape periods for key names containing periods", function () {
		var template = stache("{{#foo.bar}}" +
			"{{some\\.key\\.name}} {{some\\.other\\.key.with\\.more}}" +
			"{{/foo.bar}}"),
			data = {
				foo: {
					bar: [{
						"some.key.name": 100,
						"some.other.key": {
							"with.more": "values"
						}
					}]
				}
			};

		var div = doc.createElement('div');
		div.appendChild(template(data))

		equal(innerHTML(div), "100 values");
	});

	test("Computes should be resolved prior to accessing attributes", function () {
		var template = stache("{{list.length}}"),
			data = {
				list: new SimpleObservable(new DefineList())
			};

		var div = doc.createElement('div');
		div.appendChild(template(data))

		equal(innerHTML(div), "0");
	})

	test("Helpers can be passed . or this for the active context", function () {
		stache.registerHelper('rsvp', function (attendee, event) {
			return attendee.name + ' is attending ' + event.name;
		});
		var template = stache("{{#attendee}}{{#../events}}<div>{{rsvp .. .}}</div>{{/../events}}{{/attendee}}"),
			data = {
				attendee: {
					name: 'Justin'
				},
				events: [{
					name: 'Reception'
				}, {
					name: 'Wedding'
				}]
			};

		var div = doc.createElement('div');
		div.appendChild(template(data));
		var children = div.getElementsByTagName('div');

		equal(innerHTML(children[0]), 'Justin is attending Reception');
		equal(innerHTML(children[1]), 'Justin is attending Wedding');
	});

	test("helpers only called once (#477)", function () {

		var callCount = 0;

		stache.registerHelper("foo", function (text) {
			callCount++;
			equal(callCount, 1, "call count is only ever one")
			return "result";
		});

		var obs = new SimpleMap({
			quux: false
		});

		var template = stache("Foo text is: {{#if quux}}{{foo 'bar'}}{{/if}}");

		template(obs);

		obs.set("quux", true);

	});

	test("helpers between tags (#469)", function () {

		stache.registerHelper("itemsHelper", function () {
			return function (textNode) {
				equal(textNode.nodeType, 3, "right nodeType")
			};
		});

		var template = stache("<ul>{{itemsHelper()}}</ul>");
		template();
	});

	test("hiding image srcs (#157)", function () {
		var template = stache('<img {{#image}}src="{{.}}"{{/image}} alt="An image" />'),
			data = new SimpleMap({
				image: null
			}),
			url = "http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png";

		var frag = template(data),
			img = frag.firstChild;

		equal(img.getAttribute("src"), null, "there is no src");

		data.set("image", url);
		notEqual(img.getAttribute("src"), null, 'Image should have src');
		equal(img.getAttribute("src"), url, "images src is correct");

	});

	test("live binding in a truthy section", function () {
		var template = stache('<div {{#width}}width="{{.}}"{{/width}}></div>'),
			data = new SimpleMap({
				width: '100'
			});

		var frag = template(data),
			img = frag.firstChild;

		equal(img.getAttribute("width"), "100", "initial width is correct");

		data.set("width", "300");
		equal(img.getAttribute('width'), "300", "updated width is correct");

	});

	test("backtracks in mustache (#163)", function () {

		var template = stache(
			"{{#grid.rows}}" +
			"{{#../grid.cols}}" +
			"<div>{{columnData ../. .}}</div>" +
			"{{/../grid.cols}}" +
			"{{/grid.rows}}");

		var grid = new SimpleMap({
			rows: new DefineList([{
				first: "Justin",
				last: "Meyer"
			}, {
				first: "Brian",
				last: "Moschel"
			}]),
			cols: new DefineList([{
				prop: "first"
			}, {
				prop: "last"
			}])
		});

		var frag = template({
			grid: grid
		}, {
			columnData: function (row, col) {
				return row().get(col().get("prop"));
			}
		});

		var divs = getChildNodes(frag);
		equal(divs.length, 4, "there are 4 divs");

		var vals = canReflect.toArray(divs).map(function (div) {
			return innerHTML(div);
		});

		deepEqual(vals, ["Justin", "Meyer", "Brian", "Moschel"], "div values are the same");

	});

	test("support null and undefined as an argument", function () {

		var template = stache("{{aHelper null undefined}}")

		template({}, {
			aHelper: function (arg1, arg2) {
				ok(arg1 === null);
				ok(arg2 === undefined)
			}
		});
	});

	test("passing DefineList to helper (#438)", function () {
		var renderer = stache('<ul><li {{helper438 observeList}}>observeList broken</li>' +
		'<li {{helper438 array}}>plain arrays work</li></ul>');

		stache.registerHelper('helper438', function (classnames) {
			return function (el) {
				empty(el);
				el.appendChild(el.ownerDocument.createTextNode("Helper called"));
			};
		});

		var frag = renderer({
			observeList: new DefineList([{
				test: 'first'
			}, {
				test: 'second'
			}]),
			array: [{
				test: 'first'
			}, {
				test: 'second'
			}]
		});
		var div = doc.createElement('div');

		div.appendChild(frag);

		var ul = div.firstChild;

		equal(innerHTML( ul.childNodes.item(0)), 'Helper called', 'Helper called');
		equal(innerHTML(  ul.childNodes.item(1)), 'Helper called', 'Helper called');
	});

	test("hiding image srcs (#494)", function () {
		var template = stache('<img src="{{image}}"/>'),
			data = new SimpleMap({
				image: ""
			}),
			url = "http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png";

		var frag = template(data),
			img = frag.firstChild;

		equal(img.getAttribute("src"), "", "the src is empty");

		data.set("image", url);

		notEqual(img.getAttribute("src"), "", 'Image should have src');
		equal(img.getAttribute("src"), url, "images src is correct");
	});

	test("hiding image srcs with complex content (#494)", function () {
		var template = stache('<img src="{{#image}}http://{{domain}}/{{loc}}.png{{/image}}"/>'),
			data = new SimpleMap({}),
			imgData = {
				domain: "canjs.us",
				loc: "scripts/static/img/canjs_logo_yellow_small"
			},
			url = "http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png";


		var frag = template(data),
			img = frag.firstChild;

		equal(img.getAttribute("src"), "", "the src is empty");

		data.set("image", imgData);
		notEqual(img.getAttribute("src"), "", 'Image should have src');
		equal(img.getAttribute("src"), url, "images src is correct");
	});

	test("empty lists update", 2, function () {
		var template = stache('<p>{{#list}}{{.}}{{/list}}</p>');
		var map = new SimpleMap({
			list: ['something']
		});

		var frag = template(map);
		var div = doc.createElement('div');

		div.appendChild(frag);

		equal(innerHTML( div.childNodes.item(0)), 'something', 'initial list content set');
		map.set('list', ['one', 'two']);
		equal(innerHTML( div.childNodes.item(0)), 'onetwo', 'updated list content set');
	});

	test("attributes in truthy section", function () {
		var template = stache('<p {{#attribute}}data-test="{{this}}"{{/attribute}}></p>');
		var data1 = {
			attribute: "test-value"
		};
		var frag1 = template(data1);
		var div1 = doc.createElement('div');

		div1.appendChild(frag1);
		equal(div1.childNodes.item(0).getAttribute('data-test'), 'test-value', 'hyphenated attribute value');

		var data2 = {
			attribute: "test value"
		};
		var frag2 = template(data2);
		var div2 = doc.createElement('div');

		div2.appendChild(frag2);
		equal(div2.childNodes.item(0).getAttribute('data-test'), 'test value', 'whitespace in attribute value');
	});

	test("live bound attributes with no '='", function () {
		var template = stache('<input type="radio" {{#selected}}checked{{/selected}}>');
		var data = new SimpleMap({
			selected: false
		});
		var frag = template(data);
		var div = doc.createElement('div');

		div.appendChild(frag);
		data.set('selected', true);
		equal(div.childNodes.item(0).checked, true, 'hyphenated attribute value');

		data.set("selected", false)
		equal(div.childNodes.item(0).checked, false, 'hyphenated attribute value');
	});

	test("outputting array of attributes", function () {
		var template = stache('<p {{#attribute}}{{name}}="{{value}}"{{/attribute}}></p>');
		var data = {
			attribute: [{
				"name": "data-test1",
				"value": "value1"
			}, {
				"name": "data-test2",
				"value": "value2"
			}, {
				"name": "data-test3",
				"value": "value3"
			}]
		};
		var frag = template(data);
		var div = doc.createElement('div');

		div.appendChild(frag);
		equal(div.childNodes.item(0).getAttribute('data-test1'), 'value1', 'first value');
		equal(div.childNodes.item(0).getAttribute('data-test2'), 'value2', 'second value');
		equal(div.childNodes.item(0).getAttribute('data-test3'), 'value3', 'third value');
	});

	test("incremental updating of #each within an if", function () {
		var template = stache('{{#if items.length}}<ul>{{#each items}}<li/>{{/each}}</ul>{{/if}}');

		var items = new DefineList([{}, {}]);
		var div = doc.createElement('div');
		div.appendChild(template({
			items: items
		}));

		var ul = div.getElementsByTagName('ul')[0]
		ul.setAttribute("original", "yup");

		items.push({});
		ok(ul === div.getElementsByTagName('ul')[0], "ul is still the same")

	});

	test("stache.safeString", function () {
		var text = "Google",
			url = "http://google.com/",
			templateEscape = stache('{{link "' + text + '" "' + url + '"}}'),
			templateUnescape = stache('{{{link "' + text + '" "' + url + '"}}}');

		stache.registerHelper('link', function (text, url) {
			var link = '<a href="' + url + '">' + text + '</a>';
			return stache.safeString(link);
		});

		var div = doc.createElement('div');
		var frag = templateEscape({});
		div.appendChild(frag);

		equal(getChildNodes(div).length, 1, 'rendered a DOM node');
		equal(div.childNodes.item(0).nodeName, 'A', 'rendered an anchor tag');
		equal(innerHTML(div.childNodes.item(0)), text, 'rendered the text properly');
		equal(div.childNodes.item(0).getAttribute('href'), url, 'rendered the href properly');
		div = doc.createElement('div');
		div.appendChild(templateUnescape({}));

		equal(getChildNodes(div).length, 1, 'rendered a DOM node');
		equal(div.childNodes.item(0).nodeName, 'A', 'rendered an anchor tag');
		equal(innerHTML(div.childNodes.item(0)), text, 'rendered the text properly');
		equal(div.childNodes.item(0).getAttribute('href'), url, 'rendered the href properly');
	});

	test("nested properties binding (#525)", function () {
		var template = stache("<label>{{name.first}}</label>");

		var me = new SimpleMap();

		var label = template(me)
			.firstChild;
		me.set("name", {
			first: "Justin"
		});
		equal(innerHTML(label), "Justin", "set name object");

		me.set("name", {
			first: "Brian"
		});
		equal(innerHTML(label), "Brian", "merged name object");

		me.set("name",undefined);
		me.set({
			name: {
				first: "Payal"
			}
		});

		equal(innerHTML(label), "Payal", "works after parent removed");

	});

	test("Rendering indices of an array with scope.index", function () {
		var template = stache("<ul>{{#each list}}<li>{{scope.index}} {{.}}</li>{{/each}}</ul>");
		var list = [0, 1, 2, 3];

		var lis = template({
			list: list
		})
			.firstChild.getElementsByTagName('li');

		for (var i = 0; i < lis.length; i++) {
			equal(innerHTML(lis[i]), (i + ' ' + i), 'rendered index and value are correct');
		}
	});

	test("Rendering indices of an array with @index + offset (#1078)", function () {
		var template = stache("<ul>{{#each list}}<li>{{@index 5}} {{.}}</li>{{/each}}</ul>");
		var list = [0, 1, 2, 3];

		var lis = template({
			list: list
		})
			.firstChild.getElementsByTagName('li');

		for (var i = 0; i < lis.length; i++) {
			equal(innerHTML(lis[i]), (i+5 + ' ' + i), 'rendered index and value are correct');
		}
	});

	test("Passing indices into helpers as values", function () {
		var template = stache("<ul>{{#each list}}<li>{{test scope.index}} {{.}}</li>{{/each}}</ul>");
		var list = [0, 1, 2, 3];

		var lis = template({
			list: list
		}, {
			test: function(index) {
				return ""+index;
			}
		}).firstChild.getElementsByTagName('li');

		for (var i = 0; i < lis.length; i++) {
			equal(innerHTML(lis[i]), (i + ' ' + i), 'rendered index and value are correct');
		}
	});

	test("Rendering live bound indices with #each, scope.index and a simple DefineList", function () {
		var list = new DefineList(['a', 'b', 'c']);
		var template = stache("<ul>{{#each list}}<li>{{scope.index}} {{.}}</li>{{/each}}</ul>");

		var tpl = template({
			list: list
		}).firstChild;
		//.getElementsByTagName('li');

		var lis = tpl.getElementsByTagName('li');
		equal(lis.length, 3, "three lis");

		equal(innerHTML(lis[0]), '0 a', "first index and value are correct");
		equal(innerHTML(lis[1]), '1 b', "second index and value are correct");
		equal(innerHTML(lis[2]), '2 c', "third index and value are correct");

		// add a few more items
		list.push('d', 'e');

		lis = tpl.getElementsByTagName('li');
		equal(lis.length, 5, "five lis");

		equal(innerHTML(lis[3]), '3 d', "fourth index and value are correct");
		equal(innerHTML(lis[4]), '4 e', "fifth index and value are correct");

		// splice off a few items and add some more
		list.splice(0, 2, 'z', 'y');

		lis = tpl.getElementsByTagName('li');
		equal(lis.length, 5, "five lis");
		equal(innerHTML(lis[0]), '0 z', "first item updated");
		equal(innerHTML(lis[1]), '1 y', "second item updated");
		equal(innerHTML(lis[2]), '2 c', "third item the same");
		equal(innerHTML(lis[3]), '3 d', "fourth item the same");
		equal(innerHTML(lis[4]), '4 e', "fifth item the same");

		// splice off from the middle
		list.splice(2, 2);

		lis = tpl.getElementsByTagName('li');
		equal(lis.length, 3, "three lis");
		equal(innerHTML(lis[0]), '0 z', "first item the same");
		equal(innerHTML(lis[1]), '1 y', "second item the same");
		equal(innerHTML(lis[2]), '2 e', "fifth item now the 3rd item");
	});

	test('Rendering keys of an object with #each and scope.key', function () {
		var template = stache("<ul>{{#each obj}}<li>{{scope.key}} {{.}}</li>{{/each}}</ul>");
		var obj = {
			foo: 'string',
			bar: 1,
			baz: false
		};

		var lis = template({
			obj: obj
		})
			.firstChild.getElementsByTagName('li');

		equal(lis.length, 3, "three lis");

		equal(innerHTML(lis[0]), 'foo string', "first key value pair rendered");
		equal(innerHTML(lis[1]), 'bar 1', "second key value pair rendered");
		equal(innerHTML(lis[2]), 'baz false', "third key value pair rendered");
	});

	test('Live bound iteration of keys of a SimpleMap with #each and scope.key', function () {
		// delete stache._helpers.foo;
		var template = stache("<ul>{{#each map}}<li>{{scope.key}} {{.}}</li>{{/each}}</ul>");
		var map = new SimpleMap({
			foo: 'string',
			bar: 1,
			baz: false
		});

		var tpl = template({
			map: map
		});
		var lis = tpl.firstChild.getElementsByTagName('li');

		equal(lis.length, 3, "three lis");

		equal(innerHTML(lis[0]), 'foo string', "first key value pair rendered");
		equal(innerHTML(lis[1]), 'bar 1', "second key value pair rendered");
		equal(innerHTML(lis[2]), 'baz false', "third key value pair rendered");

		map.set('qux', true);

		lis = tpl.firstChild.getElementsByTagName('li');
		equal(lis.length, 4, "four lis");

		equal(innerHTML(lis[3]), 'qux true', "fourth key value pair rendered");

		// A hack b/c map can't delete keys
		delete map._data.foo;
		map.dispatch("can.keys")

		lis = tpl.firstChild.getElementsByTagName('li');
		equal(lis.length, 3, "three lis");

		equal(innerHTML(lis[0]), 'bar 1', "new first key value pair rendered");
		equal(innerHTML(lis[1]), 'baz false', "new second key value pair rendered");
		equal(innerHTML(lis[2]), 'qux true', "new third key value pair rendered");
	});

	test('Make sure data passed into template does not call helper by mistake', function () {
		var template = stache("<h1>{{text}}</h1>");
		var data = {
			text: 'with'
		};

		var h1 = template(data)
			.firstChild;

		equal(innerHTML(h1), "with");
	});

	test("no memory leaks with #each (#545)", function () {
		var tmp = stache("<ul id='ul-remove'>{{#each children}}<li></li>{{/each}}</ul>");

		var data = new SimpleMap({
			children: new DefineList([{
				name: 'A1'
			}, {
				name: 'A2'
			}, {
				name: 'A3'
			}])
		});
		var div = doc.createElement('div');
		this.fixture.appendChild(div);
		div.id = "div-remove";

		domMutateNode.appendChild.call(div, tmp(data));

		stop();
		setTimeout(function(){
			domMutateNode.removeChild.call(div, div.firstChild);
			var check = function(){
				var handlers = data[canSymbol.for("can.meta")].handlers.get([]);
				if(handlers.length) {
					setTimeout(check, 20);
				} else {
					QUnit.ok(true,"no handlers");
					QUnit.start();
				}
			}
			check();
		},10);
	});

	test("each directly within live html section", function () {
		var tmp = stache(
			"<ul>{{#if showing}}" +
			"{{#each items}}<li>item</li>{{/each}}" +
			"{{/if}}</ul>");

		var items = new DefineList([1, 2, 3]);
		var showing = new SimpleObservable(true);
		var frag = tmp({
			showing: showing,
			items: items
		});

		showing.set(false);

		// this would break because things had not been unbound
		items.pop();

		showing.set(true);

		items.push("a");

		equal(frag.firstChild.getElementsByTagName("li")
			.length, 3, "there are 3 elements - "+frag.firstChild.innerHTML);

	});

	test("mustache loops with 0 (#568)", function () {

		var tmp = stache("<ul>{{#array}}<li>{{.}}</li>{{/array}}");

		var data = {
			array: [0, null]
		};

		var frag = tmp(data);

		equal(innerHTML(frag.firstChild.getElementsByTagName("li")[0]), "0");
		equal(innerHTML(frag.firstChild.getElementsByTagName("li")[1]), "");

	});

	test('scope.index is correctly calculated when there are identical elements in the array', function () {
		var data = new DefineList(['foo', 'bar', 'baz', 'qux', 'foo']);
		var tmp = stache('{{#each data}}{{scope.index}} {{/each}}');

		var div = doc.createElement('div');
		var frag = tmp({
			data: data
		});
		div.appendChild(frag);

		equal(innerHTML(div), '0 1 2 3 4 ');
	});

	test("if helper within className (#592)", function () {

		var tmp = stache('<div class="fails {{#state}}animate-{{.}}{{/state}}"></div>');
		var data = new SimpleMap({
			state: "ready"
		});
		var frag = tmp(data);

		equal(frag.firstChild.className, "fails animate-ready");

		tmp = stache('<div class="fails {{#if state}}animate-{{state}}{{/if}}"></div>');
		data = new SimpleMap({
			state: "ready"
		});
		tmp(data);

		equal(frag.firstChild.className, "fails animate-ready")
	});

	test('html comments must not break mustache scanner', function () {
		canReflect.each([
			'text<!-- comment -->',
			'text<!-- comment-->',
			'text<!--comment -->',
			'text<!--comment-->'
		], function (content) {
			var div = doc.createElement('div');
			div.appendChild(stache(content)());
			equal(innerHTML(div), content, 'Content did not change: "' + content + '"');
		});
	});

	test("Rendering live bound indices with #each, scope.index and a simple CanList when remove first item (#613)", function () {
		var list = new DefineList(['a', 'b', 'c']);
		var template = stache("<ul>{{#each list}}<li>{{scope.index}} {{.}}</li>{{/each}}</ul>");

		var tpl = template({
			list: list
		});

		// remove first item
		list.shift();
		var lis = tpl.firstChild.getElementsByTagName('li');
		equal(lis.length, 2, "two lis");

		equal(innerHTML(lis[0]), '0 b', "second item now the 1st item");
		equal(innerHTML(lis[1]), '1 c', "third item now the 2nd item");
	});

	test("stache.safestring works on live binding (#606)", function () {

		var num = new SimpleObservable(1);

		stache.registerHelper("safeHelper", function () {

			return stache.safeString(
				"<p>" + num.get() + "</p>"
			)

		});

		var template = stache("<div>{{safeHelper()}}</div>")

		var frag = template();
		equal(frag.firstChild.firstChild.nodeName.toLowerCase(), "p", "got a p element");

	});

	test("directly nested subitems and each (#605)", function () {

		var template = stache("<div>" +

		"{{#item}}" +
		"<p>This is the item:</p>" +
		"{{#each subitems}}" +
		"<label>" + "item" + "</label>" +
		"{{/each}}" +
		"{{/item}}" +
		"</div>")

		var data = new SimpleMap({
			item: new SimpleMap({
				subitems: new DefineList(['first'])
			})
		});

		var frag = template(data),
			div = frag.firstChild,
			labels = div.getElementsByTagName("label");

		equal(labels.length, 1, "initially one label");
		data.get('item').get('subitems')
			.push('second');

		labels = div.getElementsByTagName("label");
		equal(labels.length, 2, "after pushing two label");

		data.set('item',undefined);

		labels = div.getElementsByTagName("label");
		equal(labels.length, 0, "after removing item no label");

	});

	test("directly nested live sections unbind without needing the element to be removed", function () {
		var template = stache(
			"<div>" +
			"{{#items}}" +
			"<p>first</p>" +
			"{{#visible}}<label>foo</label>{{/visible}}" +
			"<p>second</p>" +
			"{{/items}}" +
			"</div>");

		var data = new SimpleMap({
			items: new DefineList([{
				visible: true
			}])
		});
		var meta = data.get("items")[canSymbol.for("can.meta")]

		template(data);

		QUnit.ok(meta.handlers.get([]).length, "there is one handler");

		data.set("items", [{
			visible: true
		}]);
		QUnit.stop();
		var check = function(){
			if(!meta.handlers.get([]).length) {
				QUnit.ok(true, "there is no handler");
				QUnit.start();
			} else {
				setTimeout(check,20);
			}
		};
		check();



	});

	test("direct live section", function () {
		var template = stache("{{#if visible}}<label/>{{/if}}");

		var data = new SimpleMap({
			visible: true
		});

		var div = doc.createElement("div");
		div.appendChild(template(data));

		equal(div.getElementsByTagName("label")
			.length, 1, "there are 1 items")

		data.set("visible", false)
		equal(div.getElementsByTagName("label")
			.length, 0, "there are 0 items")

	});

	test('Rendering keys of an object with #each and scope.key in a Component', function () {

		var template = stache("<ul>" +
		"{{#each data}}" +
		"<li>{{scope.key}} : {{.}}</li>" +
		"{{/data}}" +
		"</ul>");

		var map = new SimpleMap({
			data: {
				some: 'test',
				things: false,
				other: 'things'
			}
		});

		var frag = template(map);

		var lis = frag.firstChild.getElementsByTagName("li");
		equal(lis.length, 3, "there are 3 properties of map's data property");

		equal(innerHTML(lis[0]), "some : test");

	});

	test("{{each}} does not error with undefined list (#602)", function () {
		var text = '<div>{{#each person}}{{name}}{{/each}}</div>'

		equal(getText(text,{}), '<div></div>', 'Empty text rendered');
		equal(getText(text,{
			person: false
		}), '<div></div>', 'Empty text rendered');

		equal(getText(text,{
			person: null
		}), '<div></div>', 'Empty text rendered');
		equal(getText(text,{
			person: [{
				name: 'David'
			}]
		}), '<div>David</div>', 'Expected name rendered');
	});

	test('{{#each}} helper works reliably with nested sections (#604)', function () {
		var renderer = stache('{{#if first}}<ul>{{#each list}}<li>{{name}}</li>{{/each}}</ul>' +
		'{{else}}<ul>{{#each list2}}<li>{{name}}</li>{{/each}}</ul>{{/if}}');
		var data = new SimpleMap({
			first: true,
			list: [{
				name: "Something"
			}, {
				name: "Else"
			}],
			list2: [{
				name: "Foo"
			}, {
				name: "Bar"
			}]
		});
		var div = doc.createElement('div');
		var frag = renderer(data);
		div.appendChild(frag);

		var lis = div.getElementsByTagName("li");
		deepEqual(
			canReflect.toArray(lis).map(function (li) {
				return innerHTML(li)
			}), ["Something", "Else"],
			'Expected HTML with first set');

		data.set('first', false);

		lis = div.getElementsByTagName("li");
		deepEqual(
			canReflect.toArray(lis).map(function (li) {
				return innerHTML(li)
			}), ["Foo", "Bar"],
			'Expected HTML with first false set');

	});

	test("Block bodies are properly escaped inside attributes", function () {
		var html = "<div title='{{#test}}{{.}}{{{.}}}{{/test}}'></div>",
			div = doc.createElement("div"),
			title = "Alpha&Beta";

		var frag = stache(html)(new SimpleMap({
			test: title
		}));

		div.appendChild(frag);

		equal(div.firstChild.getAttribute('title'), title + title);
	});

	test('Constructor static properties are accessible (#634)', function () {
		var Foo = SimpleMap.extend("Foo", {
			static_prop: "baz"
		}, {
			proto_prop: "thud"
		});
		var template = '\
                  Straight access: <br/> \
                      <span>{{own_prop}}</span><br/> \
                      <span>{{constructor.static_prop}}</span><br/> \
                      <span>{{constructor.proto_prop}}</span><br/> \
                      <span>{{proto_prop}}</span><br/> \
                  Helper argument: <br/> \
                      <span>{{print_prop own_prop}}</span><br/> \
                      <span>{{print_prop constructor.static_prop}}</span><br/> \
                      <span>{{print_prop constructor.proto_prop}}</span><br/> \
                      <span>{{print_prop proto_prop}}</span><br/> \
                  Helper hash argument: <br/> \
                      <span>{{print_hash prop=own_prop}}</span><br/> \
                      <span>{{print_hash prop=constructor.static_prop}}</span><br/> \
                      <span>{{print_hash prop=constructor.proto_prop}}</span><br/> \
                      <span>{{print_hash prop=proto_prop}}</span><br/>',
			renderer = stache(template),
			data = new Foo({
				own_prop: "quux"
			}),
			div = doc.createElement('div');

		div.appendChild(renderer(data, {
			print_prop: function (arg) {
				return (arg && arg.isComputed ? arg() : arg);
			},
			print_hash: function () {
				var ret = [];
				canReflect.each(
					arguments[arguments.length - 1].hash, function (arg, key) {
						while (arg && arg.isComputed) {
							arg = arg();
						}
						ret.push([key, arg].join("="));
					}
				);
				return ret.join(" ");
			}
		}));
		var spans = div.getElementsByTagName('span'),
			i = 0;

		// Straight access
		equal(innerHTML(spans[i++]), 'quux', 'Expected "quux"');
		equal(innerHTML(spans[i++]), 'baz', 'Expected "baz"');
		equal(innerHTML(spans[i++]), '', 'Expected ""');
		equal(innerHTML(spans[i++]), 'thud', 'Expected "thud"');

		// Helper argument
		equal(innerHTML(spans[i++]), 'quux', 'Expected "quux"');
		equal(innerHTML(spans[i++]), 'baz', 'Expected "baz"');
		equal(innerHTML(spans[i++]), '', 'Expected ""');
		equal(innerHTML(spans[i++]), 'thud', 'Expected "thud"');

		// Helper hash argument
		equal(innerHTML(spans[i++]), 'prop=quux', 'Expected "prop=quux"');
		equal(innerHTML(spans[i++]), 'prop=baz', 'Expected "prop=baz"');
		equal(innerHTML(spans[i++]), 'prop=', 'Expected "prop="');
		equal(innerHTML(spans[i++]), 'prop=thud', 'Expected "prop=thud"');
	});

	test("{{#each}} handles an undefined list changing to a defined list (#629)", function () {

		var renderer = stache('    {{description}}: \
          <ul> \
          {{#each list}} \
                  <li>{{name}}</li> \
          {{/each}} \
          </ul>');

		var div = doc.createElement('div'),
			data1 = new SimpleMap({
				description: 'Each without list'
			}),
			data2 = new SimpleMap({
				description: 'Each with empty list',
				list: []
			});

		div.appendChild(renderer(data1));
		div.appendChild(renderer(data2));

		equal(div.getElementsByTagName('ul')[0].getElementsByTagName('li')
			.length, 0, "there are no lis in the undefined list");
		equal(div.getElementsByTagName('ul')[1].getElementsByTagName('li')
			.length, 0, "there are no lis in the empty list");

		stop();
		setTimeout(function () {

			start();
			data1.set('list', [{
				name: 'first'
			}]);
			data2.set('list', [{
				name: 'first'
			}]);

			equal(div.getElementsByTagName('ul')[0].getElementsByTagName('li')
				.length, 1, "there should be an li as we set an attr to an array");

			equal(div.getElementsByTagName('ul')[1].getElementsByTagName('li')
				.length, 1);
			equal(innerHTML(div.getElementsByTagName('ul')[0].getElementsByTagName('li')[0]), 'first');
			equal(innerHTML(div.getElementsByTagName('ul')[1].getElementsByTagName('li')[0]), 'first');
		}, 250);
	});

	test('canCompute should live bind when the value is changed to a Construct (#638)', function () {
		var renderer = stache('<p>{{#counter}} Clicked <span>{{count}}</span> times {{/counter}}</p>'),
			div = doc.createElement('div'),
		// canCompute(null) will pass
			counter = new SimpleObservable(),
			data = {
				counter: counter
			};

		div.appendChild(renderer(data));

		equal(div.getElementsByTagName('span')
			.length, 0);
		stop();
		setTimeout(function () {
			start();
			counter.set({
				count: 1
			});
			equal(div.getElementsByTagName('span')
				.length, 1);
			equal(innerHTML(div.getElementsByTagName('span')[0]), '1');
		}, 10);
	});

	test("scope.index in partials loaded from script templates", function () {

		if (doc === window.document) {
			// add template as script

			var script = doc.createElement("script");
			script.type = "text/mustache";
			script.id = "itempartial";
			script.text = "<label></label>";

			doc.body.appendChild(script);

			//stache("itempartial","<label></label>")

			var itemsTemplate = stache(
				"<div>" +
				"{{#each items}}" +
				"{{>itempartial}}" +
				"{{/each}}" +
				"</div>");

			var items = new DefineList([{}, {}]);

			var frag = itemsTemplate({
					items: items
				}),
				div = frag.firstChild,
				labels = div.getElementsByTagName("label");

			equal(labels.length, 2, "two labels");

			items.shift();

			labels = div.getElementsByTagName("label");
			equal(labels.length, 1, "first label removed")

		} else {
			expect(0);
		}
	});

	test("#each with #if directly nested (#750)", function(){
		var template = stache("<ul>{{#each list}} {{#if visible}}<li>{{name}}</li>{{/if}} {{/each}}</ul>");
		var data = new SimpleMap(
			{
				list: new DefineList([
					{
						name: 'first',
						visible: true
					},
					{
						name: 'second',
						visible: false
					},
					{
						name: 'third',
						visible: true
					}
				])
			});

		var frag = template(data);

		data.get('list').pop();

		equal(frag.firstChild.getElementsByTagName('li').length, 1, "only first should be visible")

	});

	test("viewCallbacks.tag", function(){

		expect(3);

		viewCallbacks.tag("stache-tag", function(el, tagData){
			ok(tagData.scope instanceof Scope, "got scope");
			equal(typeof tagData.subtemplate, "function", "got subtemplate");
			var frag = tagData.subtemplate(tagData.scope.add({last: "Meyer"}));

			equal( innerHTML(frag.firstChild), "Justin Meyer", "rendered right");
		});

		var template = stache("<stache-tag><span>{{../first}} {{last}}</span></stache-tag>")

		template({first: "Justin"});

	});

	test("viewCallbacks.attr", function(){

		expect(2);

		viewCallbacks.attr("stache-attr", function(el, attrData){
			ok(attrData.scope instanceof Scope, "got scope");
			equal(attrData.attributeName, "stache-attr", "got attribute name");

		});

		var template = stache("<div stache-attr='foo'></div>");

		template({});

	});

	test("viewCallbacks passes parent node list", function(){
		expect(1);

		var nodeList = [];
		var template = stache("<node-list-passed />");

		viewCallbacks.tag("node-list-passed", function(el, tagData){
			strictEqual(tagData.parentNodeList, nodeList, "got parentNodeList");
		});

		template({}, nodeList);
	});

	test("./ in key", function(){
		var template = stache( "<div><label>{{name}}</label>{{#children}}<span>{{./name}}-{{name}}</span>{{/children}}</div>");

		var data = {
			name: "CanJS",
			children: [{},{name: "stache"}]
		};
		var res =  template(data);
		var spans = res.firstChild.getElementsByTagName('span');
		equal( innerHTML(spans[0]), "-", "not found in current level" );
		equal( innerHTML(spans[1]), "stache-stache", "found in current level" );
	});

	test("self closing tags callback custom tag callbacks (#880)", function(){

		viewCallbacks.tag("stache-tag", function(el, tagData){
			ok(true,"tag callback called");
			equal(tagData.scope.peek("this").foo, "bar", "got scope");
			ok(!tagData.subtemplate, "there is no subtemplate");
		});

		var template = stache("<div><stache-tag/></div>");

		template({
			foo: "bar"
		});

	});

	test("empty custom tags do not have a subtemplate (#880)", function(){

		viewCallbacks.tag("stache-tag", function(el, tagData){
			ok(true,"tag callback called");
			equal(tagData.scope.peek("this").foo, "bar", "got scope");
			ok(!tagData.subtemplate, "there is no subtemplate");
		});

		var template = stache("<div><stache-tag></stache-tag></div>");

		template({
			foo: "bar"
		});

	});

	test("inverse in tag", function(){
		var template = stache('<span {{^isBlack}} style="display:none"{{/if}}>Hi</span>');

		var res = template({
			isBlack: false
		});


		ok(/display:\s*none/.test( res.firstChild.getAttribute('style') ), "display none is not set");

	});

	testHelpers.dev.devOnlyTest("Logging: Helper not found in stache template(#726)", function () {
		var teardown = testHelpers.dev.willWarn('foo.stache:1: Unable to find helper "helpme".');

		stache('foo.stache', '<li>{{helpme name}}</li>')({
			name: 'Hulk Hogan'
		});

		QUnit.equal(teardown(), 1, 'got expected warning');
	});

	testHelpers.dev.devOnlyTest("Logging: Variable not found in stache template (#720)", function () {
		var teardown = testHelpers.dev.willWarn(/bar.stache:1: Unable to find key "user.name"./);

		stache('bar.stache', '<li>{{user.name}}</li>')({
			user: {}
		});

		QUnit.equal(teardown(), 1, 'got expected warning');
	});

	testHelpers.dev.devOnlyTest("Logging: Variable not found in stache template should not happen for falsey values", function () {
		var teardown = testHelpers.dev.willWarn(/Unable to find key/);

		stache('{{bool}} {{emptyString}}')({
			bool: false,
			emptyString: ''
		});

		QUnit.equal(teardown(), 0, 'no warnings shown');
	});

	testHelpers.dev.devOnlyTest("Logging: hashes in #each helper should not trigger warning", function () {
		var teardown = testHelpers.dev.willWarn(
			/Unable to find key/
		);

		var tpl = stache("{{#each(panels, panel=value)}} {{panel.label}} {{/each}}");
		tpl({
			panels: [
				{ label: "foo" },
				{ label: "bar" },
				{ label: "baz" },
			]
		});

		QUnit.equal(teardown(), 0, 'no warnings shown');
	});

	test("Calling .fn without arguments should forward scope by default (#658)", function(){
		var tmpl = "{{#foo()}}<span>{{bar}}</span>{{/foo}}";
		var frag = stache(tmpl)(new SimpleMap({
			bar : 'baz'
		}), {
			foo : function(opts){
				return opts.fn();
			}
		});
		var node = frag.firstChild;

		equal(innerHTML(node), 'baz', 'Context is forwarded correctly');
	});

	test("Calling .fn with falsey value as the context will render correctly (#658)", function(){
		var tmpl = "{{#zero()}}<span>{{ this }}</span>{{/zero}}" +
					"{{#emptyString()}}<span>{{ this }}</span>{{/emptyString}}" +
					"{{#nullVal()}}<span>{{ this }}</span>{{/nullVal}}";

		var frag = stache(tmpl)({ foo: 'bar' }, {
			zero : function(opts){
				return opts.fn(0);
			},
			emptyString : function(opts){
				return opts.fn("");
			},
			nullVal : function(opts){
				return opts.fn(null);
			}

		});

		equal(innerHTML(frag.firstChild), '0', 'Context is set correctly for falsey values');
		equal(innerHTML(frag.childNodes.item(1)), '', 'Context is set correctly for falsey values');
		equal(innerHTML(frag.childNodes.item(2)), '', 'Context is set correctly for falsey values');
	});

	test("Custom elements created with default namespace in IE8", function(){
		// Calling viewCallbacks.tag so that this tag is shived
		viewCallbacks.tag('my-tag', function(){});

		var tmpl = "<my-tag></my-tag>";

		var frag = stache(tmpl)({});
		this.fixture.appendChild(frag);

		equal(this.fixture.getElementsByTagName("my-tag").length, 1,
			"Element created in default namespace");
	});

	test("Partials are passed helpers (#791)", function () {
		var t = {
				template: "{{>partial}}",
				expected: "foo",
				partials: {
					partial: '{{ help() }}'
				},
				helpers: {
					'help': function(){
						return 'foo';
					}
				}
			},
			frag;
		for (var name in t.partials) {
			stache.registerPartial(name, t.partials[name]);
		}

		frag = stache(t.template)({}, t.helpers);
		equal(frag.firstChild.nodeValue, t.expected);
	});

	test("{{else}} with {{#unless}} (#988)", function(){
		var tmpl = "<div>{{#unless noData}}data{{else}}no data{{/unless}}</div>";

		var frag = stache(tmpl)({ noData: true });
		equal(innerHTML(frag.firstChild), 'no data', 'else with unless worked');
	});

	test("{{else}} within an attribute (#974)", function(){
		var tmpl = '<div class="{{#if color}}{{color}}{{else}}red{{/if}}"></div>',
			data = new SimpleMap({
				color: 'orange'
			}),
			frag = stache(tmpl)(data);

		equal(frag.firstChild.className, 'orange', 'if branch');
		data.set('color', false);
		equal(frag.firstChild.className, 'red', 'else branch');
	});

	test("returns correct value for DOM attributes (#1065)", 3, function() {
		var template = '<h2 class="{{#if shown}}foo{{/if}} test1 {{#shown}}muh{{/shown}}"></h2>' +
			'<h3 class="{{#if shown}}bar{{/if}} test2 {{#shown}}kuh{{/shown}}"></h3>' +
			'<h4 class="{{#if shown}}baz{{/if}} test3 {{#shown}}boom{{/shown}}"></h4>';

		var frag = stache(template)({ shown: true });

		equal(frag.firstChild.className, 'foo test1 muh');
		equal(frag.childNodes.item(1).className, 'bar test2 kuh');
		equal(frag.childNodes.item(2).className, 'baz test3 boom');
	});

	test("single character attributes work (#1132)", function () {
		if(doc.createElementNS) {
			var template = '<svg width="50" height="50">' +
				'<circle r="25" cx="25" cy="25"></circle>' +
				'</svg>';
			var frag = stache(template)({});
			equal(frag.firstChild.firstChild.getAttribute("r"), "25");
		} else {
			expect(0);
		}
	});

	test("single property read does not infinitely loop (#1155)",function(){
		stop();

		var map = new SimpleMap({state: false});
		var current = false;
		var source = new SimpleObservable(1);
		var number = new Observation(function(){

			map.set("state", current = !current);

			return source.get();
		});
		canReflect.onValue(number,function(){});

		var template = stache("<div>{{#if map.state}}<span>Hi</span>{{/if}}</div>")

		template({
			map: map
		});
		source.set(2);
		map.set("state", current = !current);
		ok(true,"no error at this point");
		start();

	});

	test("methods become observable (#1164)", function(){

		var TeamModel = SimpleMap.extend({

			shortName : function() {
				return (this.get('nickname') && this.get('nickname').length <= 8) ? this.get('nickname') : this.get('abbreviation');
			}
		});

		var team = new TeamModel({
			nickname : 'Arsenal London',
			abbreviation : 'ARS'
		});

		var template = stache('<span>{{team.shortName()}}</span>');
		var frag = template({
			team : team
		});

		equal(innerHTML(frag.firstChild), "ARS", "got value");

	});

	test("<col> inside <table> renders correctly (#1013)", 1, function() {
		var template = '<table><colgroup>{{#columns}}<col class="{{class}}" />{{/columns}}</colgroup><tbody></tbody></table>';
		var frag = stache(template)({
			columns: new DefineList([
				{ 'class': 'test' }
			])
		});

		// Only node in IE is <table>, text in other browsers
		var index = getChildNodes(frag).length === 2 ? 1 : 0;
		var tagName = frag.childNodes.item(index).firstChild.firstChild.tagName.toLowerCase();

		equal(tagName, 'col', '<col> nodes added in proper position');
	});

	test('splicing negative indices works (#1038)', function() {
		// http://jsfiddle.net/ZrWVQ/2/
		var template = '{{#each list}}<p>{{.}}</p>{{/each}}';
		var list = new DefineList(['a', 'b', 'c', 'd']);
		var frag = stache(template)({
			list: list
		});
		var children = getChildNodes(frag).length;

		list.splice(-1);
		equal(getChildNodes(frag).length, children - 1, 'Child node removed');
	});

	test('stache can accept an intermediate (#1387)', function(){
		var template = "<div class='{{className}}'>{{message}}</div>";
		var intermediate = parser(template,{}, true);

		var renderer = stache(intermediate);
		var frag = renderer({className: "foo", message: "bar"});
		equal(frag.firstChild.className, "foo", "correct class name");
		equal(innerHTML(frag.firstChild), "bar", "correct innerHTMl");
	});

	test("Passing Partial set in options (#1388 and #1389). Support live binding of partial", function () {
		var data = new SimpleMap({
			name: "World",
			greeting: "hello"
		});

		stache.registerPartial("hello", "hello {{name}}", ".stache");
		stache.registerPartial("goodbye", "goodbye {{name}}", ".stache");

		var template = stache("<div>{{>greeting}}</div>")(data);

		var div = doc.createElement("div");
		div.appendChild(template);
		equal(innerHTML(div.firstChild), "hello World", "partial retreived and rendered");

		data.set("greeting", "goodbye");
		equal(innerHTML(div.firstChild), "goodbye World", "Partial updates when attr is updated");

	});

	test("#each with null or undefined and then a list", function(){
		var template = stache("<ul>{{#each items}}<li>{{name}}</li>{{/each}}");
		var data = new SimpleMap({items: null});
		var frag = template(data);

		var div = doc.createElement("div");
		div.appendChild(frag);


		data.set("items", [{name: "foo"}]);

		equal(div.getElementsByTagName("li").length, 1, "li added");
	});

	test("promises work (#179)", function(){

		var template = stache(
			"{{#if promise.isPending}}<span class='pending'></span>{{/if}}"+
			"{{#if promise.isRejected}}<span class='rejected'>{{promise.reason.message}}</span>{{/if}}"+
			"{{#if promise.isResolved}}<span class='resolved'>{{promise.value.message}}</span>{{/if}}");

		var def = {};
		var promise = new Promise(function(resolve, reject){
			def.resolve = resolve;
			def.reject = reject;
		});
		var data = {
			promise: promise
		};

		var frag = template(data);
		var rootDiv = doc.createElement("div");
		rootDiv.appendChild(frag);

		var spans = rootDiv.getElementsByTagName("span");

		equal(spans.length, 1);
		equal(spans[0].getAttribute("class"), "pending");

		stop();

		def.resolve({message: "Hi there"});

		// better than timeouts would be using can-inserted, but we don't have can/view/bindings
		setTimeout(function(){
			spans = rootDiv.getElementsByTagName("span");
			equal(spans.length, 1);
			equal(spans[0].getAttribute("class"), "resolved");
			equal(innerHTML(spans[0]), "Hi there");


			var def = {};
			var promise = new Promise(function(resolve, reject){
				def.resolve = resolve;
				def.reject = reject;
			});
			var data = {
				promise: promise
			};

			var frag = template(data);
			var div = doc.createElement("div");
			div.appendChild(frag);
			spans = div.getElementsByTagName("span");

			def.reject({message: "BORKED"});

			setTimeout(function(){
				spans = div.getElementsByTagName("span");
				equal(spans.length, 1);
				equal(spans[0].getAttribute("class"), "rejected");
				equal(innerHTML(spans[0]), "BORKED");

				start();
			}, 30);
		},30);

	});

	test("{#list} works right (#1551)", function(){
		var data = new SimpleMap({});
		var template = stache("<div>{{#items}}<span/>{{/items}}</div>");
		var frag = template(data);

		data.set("items",new DefineList());

		data.get("items").push("foo");

		var spans = frag.firstChild.getElementsByTagName("span");

		equal(spans.length,1, "one span");

	});

	test("promises are not rebound (#1572)", function(){
		stop();
		var d = {};
		var promise = new Promise(function(resolve, reject){
			d.resolve = resolve;
			d.reject = reject;
		});

		var compute = new SimpleObservable(promise);

		var template = stache("<div>{{#if promise.isPending}}<span/>{{/if}}</div>");
		var frag = template({
			promise: compute
		});
		var div = frag.firstChild,
			spans = div.getElementsByTagName("span");

		var d2 = {};
		var promise2 = new Promise(function(resolve, reject){
			d2.resolve = resolve;
			d2.reject = reject;
		});
		compute.set(promise2);

		setTimeout(function(){
			d2.resolve("foo");

			setTimeout(function(){
				spans = div.getElementsByTagName("span")
				equal(spans.length, 0, "there should be no spans");
				start();
			},30);
		},10);

	});

	test("reading alternate values on promises (#1572)", function(){
		var promise = new Promise(function(resolve, reject){});
		promise.myAltProp = "AltValue";

		var template = stache("<div>{{d.myAltProp}}</div>");

		var frag = template({d: promise});

		equal(innerHTML(frag.firstChild), "AltValue", "read value");

	});

	test("possible to teardown immediate nodeList (#1593)", function(){
		expect(3);
		var map = new SimpleMap({show: true});



		var template = stache("{{#if show}}<span/>TEXT{{/if}}");
		var nodeList = nodeLists.register([], undefined, true);
		var frag = template(map,{},nodeList);
		nodeLists.update(nodeList, getChildNodes(frag));

		equal(nodeList.length, 1, "our nodeList has the nodeList of #if show");
		var meta = map[canSymbol.for("can.meta")];
		QUnit.ok(meta.handlers.get([]).length, "there is one handler");

		nodeLists.unregister(nodeList);

		// has to be async b/c of the temporary bind for performance
		QUnit.stop();
		var check = function(){
			if(!meta.handlers.get([]).length) {
				QUnit.ok(true, "there is no handler");
				QUnit.start();
			} else {
				setTimeout(check,20);
			}
		};
		check();

	});

	// the define test doesn't include the stache plugin and
	// the stache test doesn't include define plugin, so have to put this here
	test('#1590 #each with surrounding block and setter', function(){
		// the problem here ... is that a batch is happening
		// the replace is going to happen after
		// we need to know when to respond
		var product = new SimpleObservable();
		var people = new Observation(function(){
			var newList = new DefineList();
			newList.replace(['Brian']);
			return newList;
		});
		var frag = stache('<div>{{#if product}}<div>{{#each people}}<span/>{{/each}}</div>{{/if}}</div>')({
			people: people,
			product: product
		});

		queues.batch.start();
		product.set(1);
		queues.batch.stop();

		equal(frag.firstChild.getElementsByTagName('span').length, 1, "no duplicates");

	});

	if(doc.createElementNS && System.env !== 'canjs-test') {
		test("svg elements for (#1327)", function(){

			var template = stache('<svg height="120" width="400">'+
			'<circle cx="50" cy="50" r="{{radius}}" stroke="black" stroke-width="3" fill="blue" />'+
			'</svg>');
			var frag = template({
				radius: 6
			});

			equal(frag.firstChild.namespaceURI, "http://www.w3.org/2000/svg", "svg namespace");

		});
	}

	test('using #each when toggling between list and null', function() {
		var state = new SimpleMap();
		var div = doc.createElement('div');
		var frag = stache('{{#each deepness.rows}}<div></div>{{/each}}')(state);
		div.appendChild(frag);

		state.set('deepness', {
			rows: new DefineList(['test'])
		});
		state.set('deepness', null);

		equal(div.getElementsByTagName('div').length, 0, "only the placeholder textnode");
	});

	test("compute defined after template (#1617)", function(){
		var myMap = new SimpleMap();

		// 1. Render a stache template with a binding to a key that is not a canCompute
		var frag = stache('<span>{{ myMap.test }}</span>')({myMap: myMap});

		// 2. Set that key to a canCompute
		myMap.set('test', new Observation(function() { return "def"; }));

		equal(frag.firstChild.firstChild.nodeValue, "def", "correct value");
	});

	test('template with a block section and nested if doesnt render correctly', function() {
		var myMap = new SimpleMap({
			bar: true
		});

		var frag = stache(
			"{{#bar}}<div>{{#if ../foo}}My Meals{{else}}My Order{{/if}}</div>{{/bar}}"
		)(myMap);

		equal(innerHTML(frag.firstChild), 'My Order', 'shows else case');
		myMap.set('foo', true);
		equal(innerHTML(frag.firstChild), 'My Meals', 'shows if case');
	});

	test('addHelper', 3, function() {
		var template = stache('<div>Result: {{simple first second}}</div>');
		stache.addHelper('simple', function (first, second) {
			equal(first, 2);
			equal(second, 4);
			return first + second;
		});
		var frag = template(new SimpleMap({
			first: 2,
			second: 4
		}));
		equal(innerHTML(frag.firstChild), 'Result: 6');
	});

	test('Helper handles list replacement (#1652)', 3, function () {
		var state = new SimpleMap({
			list: new DefineList([])
		});

		var helpers = {
			listHasLength: function (options) {
				ok(true, 'listHasLength helper evaluated');
				return this.get('list').get('length') ?
					options.fn() :
					options.inverse();
			}
		};

		// Helper evaluated 1st time...
		stache('{{#listHasLength()}}{{/listHasLength}}')(state, helpers);

		// Helper evaluated 2nd time...
		state.set('list', new DefineList([]));

		// Helper evaluated 3rd time...
		state.get('list').push('...')
	});

	test('Helper binds to nested properties (#1651)', function () {

		var nestedAttrsCount = 0,
			state = new SimpleMap({
				parent: null
			});

		var helpers = {
			bindViaNestedAttrs: function (options) {

				nestedAttrsCount++;

				if (nestedAttrsCount === 3) {
					ok(true, 'bindViaNestedAttrs helper evaluated 3 times');
				}

				return this.get('parent') && this.get('parent').get('child') ?
					options.fn() :
					options.inverse();
			}
		};

		// Helpers evaluated 1st time...
		stache('{{#bindViaNestedAttrs()}}{{/bindViaNestedAttrs}}')(state, helpers);

		// Helpers evaluated 2nd time...
		state.set('parent', new SimpleMap({
			child: 'foo'
		}));

		// Helpers evaluated 3rd time...
		state.get('parent').set('child', 'bar');
	});

	test("Using a renderer function as a partial", function(){
		var template = stache("{{> other}}");
		var partial = stache("hello there");
		var map = new SimpleMap({ other: null });

		var frag = template(map);

		equal(frag.firstChild.nodeValue, "", "Initially it is a blank textnode");

		map.set("other", partial);

		equal(frag.firstChild.nodeValue, "hello there", "partial rendered");
	});

	test("Handlebars helper: switch/case", function() {
		var expected;
		var t = {
			template: '{{#switch ducks}}{{#case "10"}}10 ducks{{/case}}' +
			'{{#default}}Not 10 ducks{{/default}}{{/switch}}',
			expected: "10 ducks",
			data: {
				ducks: '10',
				tenDucks: function() {
					return '10'
				}
			},
			liveData: new SimpleMap({
				ducks: '10',
				tenDucks: function() {
					return '10'
				}
			})
		};

		expected = t.expected.replace(/&quot;/g, '&#34;').replace(/\r\n/g, '\n');
		deepEqual(getText(t.template, t.data), expected);

		deepEqual(getText(t.template, t.liveData), expected);

		t.data.ducks = 5;

		deepEqual(getText(t.template, t.data), 'Not 10 ducks');
	});

	test("Handlebars helper: switch - changing to default (#1857)", function(){
		var template = stache('{{#switch ducks}}{{#case "10"}}10 ducks{{/case}}' +
		'{{#default}}Not 10 ducks{{/default}}{{/switch}}');
		var map = new SimpleMap({
			ducks: "10"
		});

		var frag = template(map);

		deepEqual(getTextFromFrag(frag), "10 ducks");

		map.set("ducks", "12");

		deepEqual(getTextFromFrag(frag), "Not 10 ducks");
	});

	test("joinBase helper joins to the baseURL", function(){

		var baseUrl = System.baseURL || getBaseURL();
		var template = stache("{{joinBase 'hello/' name}}");
		var map = new SimpleMap({ name: "world" });

		var frag = template(map);

		equal(frag.firstChild.nodeValue, joinURIs(baseUrl, "hello/world"), "joined from baseUrl");

	});

	test("joinBase helper can be relative to template module", function(){
		var baseUrl = "http://foocdn.com/bitovi";

		var template = stache("{{joinBase '../hello/' name}}");
		var map = new SimpleMap({ name: "world" });

		var frag = template(map, { module: { uri: baseUrl } });

		equal(frag.firstChild.nodeValue, "http://foocdn.com/hello/world", "relative lookup works");
	});

	test('Custom attribute callbacks are called when in a conditional within a live section', 6, function () {
		viewCallbacks.attr('test-attr', function(el, attrData) {
			ok(true, "test-attr called");
			equal(attrData.attributeName, 'test-attr', "attributeName set correctly");
			ok(attrData.scope, "scope isn't undefined");
		});

		var state = new SimpleMap({
			showAttr: true
		});

		var template = stache('<button id="find-me" {{#if showAttr}}test-attr{{/if}}></button>');
		template(state);

		state.set('showAttr', false);
		state.set('showAttr', true);
	});

	test("inner expressions (#1769)", function(){

		var template = stache("{{helperA helperB(1,valueA,propA=valueB propC=2) 'def' outerPropA=helperC(2, ~valueB)}}");

		var frag = template(new SimpleMap({
			valueA: "A",
			valueB: "B"
		}),{
			helperA: function(arg1, arg2, options){
				equal(arg1(), "helperB value", "call expression argument to helperA");
				equal(arg2, "def", "scope argument");
				equal(options.hash.outerPropA(), "helperC value", "scope hash");
				return "helperA value";
			},
			helperB: function(arg1, arg2, options){
				equal(arg1, 1, "static argument");
				equal(arg2, "A", "scope argument");
				equal(options.propA, "B", "scope hash");
				equal(options.propC, 2, "static hash");
				return "helperB value";
			},
			helperC: function(arg1, arg2){
				equal(arg1, 2, "helperC static argument");
				equal(arg2(), "B", "helperC scope argument");
				return "helperC value";
			}
		});

		equal(frag.firstChild.nodeValue, "helperA value");
	});

	test("inner expressions with computes", function(){
		var template = stache("{{helperA helperB(1,valueA,propA=valueB propC=2) 'def' outerPropA=helperC(2,valueB)}}");


		var valueB = new SimpleObservable("B");
		var changes = 0;

		var frag = template({
			valueA: "A",
			valueB: valueB
		},{
			helperA: function(arg1, arg2, options){

				if(changes === 0) {
					equal(arg1(), "helperB=B", "static argument");
					equal(options.hash.outerPropA(), "helperC=B", "scope hash 0");
				} else {
					equal(arg1(), "helperB=X", "static argument");
					equal(options.hash.outerPropA(), "helperC=X", "scope hash 1");
				}

				equal(arg2, "def", "scope argument");

				return arg1()+"-"+options.hash.outerPropA();
			},
			helperB: function(arg1, arg2, options){
				equal(arg1, 1, "static argument");
				equal(arg2, "A", "scope argument");
				if(changes === 0) {
					equal(options.propA, "B", "scope hash");
				} else {
					equal(options.propA, "X", "scope hash");
				}

				equal(options.propC, 2, "static hash");
				return "helperB="+options.propA;
			},
			helperC: function(arg1, arg2){
				equal(arg1, 2, "helperC static argument");
				if(changes === 0) {
					equal(arg2, "B", "helperC scope argument");
				} else {
					equal(arg2, "X", "helperC scope argument");
				}
				return "helperC="+arg2;
			}
		});

		equal(frag.firstChild.nodeValue, "helperB=B-helperC=B");

		changes++;
		queues.batch.start();
		valueB.set("X");
		queues.batch.stop();

		equal(frag.firstChild.nodeValue, "helperB=X-helperC=X");
	});

	test("parent scope functions not called with arguments (#1833)", function(){
		var data = {
			child: {value: 1},
			method: function(arg){
				equal(arg, 1, "got the right arg");
			}
		};

		var template = stache("{{#child}}{{../method value}}{{/child}}");
		template(data);
	});

	test("call expression - simple", function(){

		var template = stache("{{method(arg)}}");
		var age = new SimpleObservable(32);
		var frag = template({
			method: function(num){
				return num*2;
			},
			arg: age
		});

		equal( frag.firstChild.nodeValue, "64", "method call works");

	});

	test("call expression #each passed list", function () {

		var animals = new DefineList(['sloth', 'bear']),
			renderer = stache("<div>my<b>favorite</b>animals:{{#eachOf(animals)}}<label>Animal=</label> <span>{{this}}</span>{{/}}!</div>");

		var div = doc.createElement('div');

		var frag = renderer({
			animals: animals
		});
		div.appendChild(frag);

		div.getElementsByTagName('label')[0].myexpando = "EXPANDO-ED";

		//animals.push("dog")
		equal(div.getElementsByTagName('label')
			.length, 2, "There are 2 labels");

		animals.push("turtle");

		equal(div.getElementsByTagName('label')[0].myexpando, "EXPANDO-ED", "same expando");

		equal(innerHTML(div.getElementsByTagName('span')[2]), "turtle", "turtle added");

	});

	test("call expression #each passed compute", function () {

		var animals = new SimpleObservable( new DefineList(['sloth', 'bear']) ),
			renderer = stache("<div>my<b>favorite</b>animals:{{#eachOf(~animals)}}<label>Animal=</label> <span>{{this}}</span>{{/}}!</div>");

		var div = doc.createElement('div');

		var frag = renderer({
			animals: animals
		});
		div.appendChild(frag);

		div.getElementsByTagName('label')[0].myexpando = "EXPANDO-ED";

		//animals.push("dog")
		equal(div.getElementsByTagName('label')
			.length, 2, "There are 2 labels");

		animals.set( new DefineList(['sloth', 'bear','turtle']) );

		equal(div.getElementsByTagName('label')[0].myexpando, "EXPANDO-ED", "same expando");

		equal(innerHTML(div.getElementsByTagName('span')[2]), "turtle", "turtle added");

	});

	test("call expression with #if", function(){

		var truthy = new SimpleObservable(true);
		var template = stache("{{#if(truthy)}}true{{else}}false{{/if}}");
		var frag = template({truthy: truthy});

		equal( frag.firstChild.nodeValue, "true", "set to true");

		truthy.set(false);

		equal( frag.firstChild.nodeValue, "false", "set to false");
	});

	test('getHelper w/o optional options argument (#1497)', function() {
		var helper = stache.getHelper('each');
		ok(typeof helper === 'function', 'each helper returned');
	});

	test("methods don't update correctly (#1891)", function() {
		var map = new SimpleMap({
			num1: 1,
			num2: function () { return this.get('num1') * 2; }
		});
		var frag = stache(
			'<span class="num1">{{num1}}</span>' +
			'<span class="num2">{{num2()}}</span>')(map);

		equal(frag.firstChild.firstChild.nodeValue, '1', 'Rendered correct value');
		equal(frag.lastChild.firstChild.nodeValue, '2', 'Rendered correct value');

		map.set('num1', map.get('num1') * 2);

		equal(frag.firstChild.firstChild.nodeValue, '2', 'Rendered correct value');
		equal(frag.lastChild.firstChild.nodeValue, '4', 'Rendered correct value');
	});

	test('eq called twice (#1931)', function() {
		expect(1);

		var origEq = overwriteGlobalHelper('eq', function() {
			ok(true, 'comparator invoked only once during setup');
			return origEq.apply(this, arguments);
		});

		var a = new SimpleObservable(0),
			b = new SimpleObservable(0);

		stache('{{eq a b}}')({ a: a, b: b });
		queues.batch.start();
		a.set(1);
		b.set(1);
		queues.batch.stop();

		overwriteGlobalHelper('eq', origEq);
	});

	test("#each with else works (#1979)", function(){
		var list = new DefineList(["a","b"]);
		var template = stache("<div>{{#each list}}<span>{{.}}</span>{{else}}<label>empty</label>{{/each}}</div>");
		var frag = template({list: list});
		list.replace([]);
		var spans = frag.firstChild.getElementsByTagName("span");
		var labels = frag.firstChild.getElementsByTagName("label");
		equal(spans.length, 0, "truthy case doesn't render");
		equal(labels.length, 1, "empty case");
	});

	test("Re-evaluating a case in a switch (#1988)", function(){
		var template = stache(
			"{{#switch page}}" +
				"{{#case 'home'}}" +
					"<h1 id='home'>Home</h1>" +
				"{{/case}}" +
				"{{#case 'users'}}" +
					"{{#if slug}}" +
						"<h1 id='user'>User - {{slug}}</h1>" +
					"{{else}}" +
						"<h1 id='users'>Users</h1>" +
						"<ul>" +
							"<li>User 1</li>" +
							"<li>User 2</li>" +
						"</ul>" +
					"{{/if}}" +
				"{{/case}}" +
			"{{/switch}}"
		);

		var map = new SimpleMap({
			page: "home"
		});

		var frag = template(map);

		equal(frag.firstChild.getAttribute("id"), "home", "'home' is the first item shown");

		map.set("page", "users");
		equal(frag.firstChild.nextSibling.getAttribute("id"), "users", "'users' is the item shown when the page is users");

		map.set("slug", "Matthew");
		equal(frag.firstChild.nextSibling.getAttribute("id"), "user", "'user' is the item shown when the page is users and there is a slug");

		queues.batch.start();
		map.set("page", "home");
		map.set("slug", undefined);
		queues.batch.stop();

		equal(frag.firstChild.getAttribute("id"), "home", "'home' is the first item shown");
		equal(frag.firstChild.nextSibling.nodeType, 3, "the next sibling is a TextNode");
		equal(frag.firstChild.nextSibling.nextSibling, undefined, "there are no more nodes");
	});

	test("Rendering live bound indices with #each, scope.index and a simple CanList (#2067)", function () {
		var list = new DefineList([{value:'a'}, {value:'b'}, {value: 'c'}]);
		var template = stache("<ul>{{#each list}}<li>{{scope.index}} {{value}}</li>{{/each}}</ul>");

		var tpl = template({
			list: list
		}).firstChild;
		//.getElementsByTagName('li');

		var lis = tpl.getElementsByTagName('li');
		equal(lis.length, 3, "three lis");

		equal(innerHTML(lis[0]), '0 a', "first index and value are correct");
		equal(innerHTML(lis[1]), '1 b', "second index and value are correct");
		equal(innerHTML(lis[2]), '2 c', "third index and value are correct");

	});

	test("scope.index content should be skipped by ../ (#1554)", function(){
		var list = new DefineList(["a","b"]);
		var tmpl = stache('{{#each items}}<li>{{.././items.indexOf(this)}}</li>{{/each}}');
		var frag = tmpl({items: list});
		equal(frag.lastChild.firstChild.nodeValue, "1", "read indexOf");
	});

	test("rendering style tag (#2035)",function(){
		var map = new SimpleMap({color: 'green'});
		var frag = stache('<style>body {color: {{color}} }</style>')(map);
		var content = frag.firstChild.firstChild.nodeValue;
		equal(content,"body {color: green }","got the right style text");

		map = new SimpleMap({showGreen: true});
		frag = stache('<style>body {color: {{#showGreen}}green{{/showGreen}} }</style>')(map);
		content = frag.firstChild.firstChild.nodeValue;
		equal(content,"body {color: green }","sub expressions work");

	});

	test("checked as a custom attribute", function(){
		var map = new SimpleMap({
			preview: true
		});
		var frag = stache("<div {{#if preview}}checked{{/if}}></div>")(map);
		equal(frag.firstChild.getAttribute("checked"), "", "got attribute");
	});

	test("sections with attribute spacing (#2097)", function(){
		var template = stache('<div {{#foo}} disabled {{/foo}}>');
		var frag = template({foo: true});
		equal(frag.firstChild.getAttribute("disabled"),"","disabled set");
	});

	test("readonly as a custom attribute", function() {
		var map = new DefineMap({
			conditions: false
		});
		var frag = stache('<input {{^conditions}}readonly{{/conditions}} name="password" type="password" />')(map);
		equal(frag.firstChild.getAttribute("readonly"),"","readonly set");
	});

	test("keep scope.index working with multi-dimensional arrays (#2127)", function() {
		var data = new SimpleMap({
			array2 : [['asd'], ['sdf']]
		});

		var template = stache('<div>{{#each array2}}<span>{{scope.index}}</span>{{/each}}</div>');

		var frag = template(data);

		var spans = frag.firstChild.getElementsByTagName("span");
		equal( spans[0].firstChild.nodeValue, "0");
	});

	test("partials are not working within an {{#each}} (#2174)", function() {

		var data = new SimpleMap({
			items : new DefineList([{
				name : 'foo'
			}]),
			itemRender: stache('{{name}}')
		});

		var renderer = stache('<div>{{#each items}}{{name}}{{/each}}</div>');

		var frag = renderer(data);

		data.get('items').get(0).set('name', 'WORLD');

		equal( innerHTML(frag.firstChild), "WORLD", "updated to world");


		data.get('items').splice(0, 0, {
			name : 'HELLO'
		});
		equal( innerHTML(frag.firstChild), "HELLOWORLD");
	});

	test("partials don't leak (#2174)", function() {

		stache.registerHelper("somethingCrazy", function(name, options){
			return function(el){
				var nodeList = [el];
				nodeList.expression = "something crazy";
				nodeLists.register(nodeList, function(){
					ok(true, "nodeList torn down");
				}, options.nodeList, true);
				nodeLists.update(options.nodeList, [el]);
			};
		});
		var data = new SimpleMap({
			items : new DefineList([{
				name : 'foo'
			}]),
			itemRender: stache('{{somethingCrazy name}}')
		});

		var renderer = stache('<div>{{#each items}}{{>../itemRender}}{{/each}}</div>');

		renderer(data);

		data.get('items').pop();
	});

	test("partials should leave binding to helpers and properties (#2174)", function() {
		stache.registerPartial('test', '<input id="one"> {{name}}');
		var renderer = stache('{{#each items}}{{>test}}{{/each}}');

		var data = new SimpleMap({ items: new DefineList([]) });
		var frag = renderer(data);
		data.get('items').splice(0, 0, {name: 'bob'});

		// simulate the user entering text
		frag.firstChild.nextSibling.setAttribute('value', 'user text');
		// re-render the partial for the 0th element
		data.set('items.0.name', 'dave');

		equal(frag.firstChild.nextSibling.getAttribute('value'), 'user text');
      });

	test("nested switch statement fail (#2188)", function(){

		var template  = stache("<div>{{#switch outer}}"+
			'{{#case "outerValue1"}}'+
				"{{#switch inner}}"+
					"{{#case 'innerValue1'}}"+
						"INNER1"+
					"{{/case}}"+
				"{{/switch}}"+
			"{{/case}}"+
			'{{#case "outerValue2"}}'+
				"OUTER2"+
			"{{/case}}"+
	    "{{/switch}}</div>");


		var vm = new SimpleMap({
			outer : "outerValue1",
			inner : "innerValue1"
		});

		var frag = template(vm);

		queues.batch.start();
		vm.set("inner",undefined);
		vm.set("outer", "outerValue2");
		queues.batch.stop();


	    ok( innerHTML(frag.firstChild).indexOf("OUTER2") >= 0, "has OUTER2");
	    ok( innerHTML(frag.firstChild).indexOf("INNER1") === -1, "does not have INNER1");


	});

	test('Child bindings are called before the parent', function() {
		var template = "{{#eq page 'todos'}}" +
				"{{#eq action   'view'}} {{trace 'view todos'}} {{/eq}}" +
				"{{#eq action   'edit'}} {{trace 'edit todos'}} {{/eq}}" +
			"{{/eq}}" +
			"{{#eq page 'recipes'}}" +
				"{{#eq action 'view'}} {{trace 'view recipes'}} {{/eq}}" +
				"{{#eq action 'edit'}} {{trace 'edit recipes'}} {{/eq}}" +
			"{{/eq}}";

		var state = new SimpleMap({
			action: 'view',
			page: 'todos'
		});
		var counter = 0;

		stache(template)(state, {
			trace: function(value, options) {

				if(counter === 0) {
					equal(value, 'view todos');
				} else if(counter === 1) {
					equal(value, 'edit recipes')
				} else {
					ok(false, 'Traced an unexpected template call: '+value);
				}
				counter++;
			}
		});
		queues.batch.start();
		state.set({
			action: 'edit',
			page: 'recipes'
		});
		queues.batch.stop();

		equal(counter, 2, 'Counter incremented twice');
	});

	test("scope.index is double wrapped compute in helper (#2179)", function(){
		var appState = new SimpleMap({
			todos: [
				{ description: "Foo" },
				{ description: "Bar" },
			]
		});

		var template =  stache('{{#each todos}}<div>{{indexPlusOne scope.index}}</div>{{/each}}');

		stache.registerHelper("indexPlusOne", function(val, options) {
			var resolved = val();
			equal(typeof resolved,"number", "should be a number");
			return resolved + 2;
		});

		template(appState);
	});

	test("scope.index is double wrapped compute in helper (#2179)", function(){
		var appState = new SimpleMap({
			todos: [
				{ description: "Foo" },
				{ description: "Bar" },
			]
		});

		var template =  stache('{{#each todos}}<div>{{indexPlusOne scope.index}}</div>{{/each}}');

		stache.registerHelper("indexPlusOne", function(val, options) {
			var resolved = val();
			equal(typeof resolved,"number", "should be a number");
			return resolved + 2;
		});

		template(appState);
	});

	test("content within {{#if}} inside partial surrounded by {{#if}} should not display outside partial (#2186)", function() {
		stache.registerPartial('partial', '{{#showHiddenSection}}<div>Hidden</div>{{/showHiddenSection}}');
		var renderer = stache('<div>{{#showPartial}}{{>partial}}{{/showPartial}}</div>');
		var data = new SimpleMap({
			showPartial: true,
			showHiddenSection: false
		});
		var frag = renderer(data);
		data.set('showHiddenSection', true);
		data.set('showPartial', false);

		equal( innerHTML(frag.firstChild), '');
	});

	test("nested sections work (#2229)", function(){
		var template = stache('<div {{#a}}' +
              '{{#../b}}f="f"' +
              '{{else}}' +
                  '{{#../c}}f="f"{{/../c}}' +
              '{{/../b}}' +
          '{{/a}}/>');

          var frag = template(new SimpleMap({
			  a: true,
			  b: false,
			  c: true
          }));

          equal(frag.firstChild.getAttribute("f"),"f", "able to set f");
	});

	test("Partials with custom context", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("{{>dude dudes}}");

		var data = new SimpleMap({
			dudes: [
				{ name: "austin" },
				{ name: "justin" }
			]
		});
		var dom = template(data,{
			partials: {
				dude: stache("{{#this}}<span>{{name}}</span>{{/this}}")
			}
		});
		div.appendChild(dom);
		var spans = div.getElementsByTagName('span');

		equal(spans.length, 2, 'Got two dudes');
		equal(innerHTML(spans[0]), 'austin', 'custom context inside');
		equal(innerHTML(spans[1]), 'justin', 'custom context inside');
	});

	test("Partials with nested custom context and parent lookup", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("{{#theData}}{{>dude dudes}}{{/theData}}");

		var dom = template({
			theData: new SimpleMap({
				hello: "Hello",
				dudes: [
					{ name: "austin" },
					{ name: "justin" }
				]
			})
		},{
			helpers: {
				cap: function (name) {
					return string.capitalize(name());
				}
			},
			partials: {
				dude: stache("{{#this}}<span>{{../../hello}} {{name}}</span>{{/this}}")
			}
		});
		div.appendChild(dom);
		var spans = div.getElementsByTagName('span');

		equal(spans.length, 2, 'Got two dudes');
		equal(innerHTML(spans[0]), 'Hello austin', 'correct context');
		equal(innerHTML(spans[1]), 'Hello justin', 'and parent lookup worked also');
	});

	test("Partials with custom context and helper", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("{{>dude dudes}}");

		var data = new SimpleMap({
			dudes: new DefineList([
				{ name: "austin" },
				{ name: "justin" }
			])
		});
		var dom = template(data,{
			helpers: {
				cap: function (name) {
					return string.capitalize(name());
				}
			},
			partials: {
				dude: stache("{{#this}}<span>{{cap name}}</span>{{/this}}")
			}
		});
		div.appendChild(dom);
		var spans = div.getElementsByTagName('span');

		equal(spans.length, 2, 'Got two dudes');
		equal(innerHTML(spans[0]), 'Austin', 'correct context');
		equal(innerHTML(spans[1]), 'Justin', 'and helpers worked also');
	});

	test("Bracket expression", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ foo[bar] }}</p>");

		var data = new SimpleMap({
			bar: "name",
			foo: {
				name: "Kevin",
				fullName: "Kevin Phillips"
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'Kevin', 'correct value for foo[bar]');

		data.set('bar', 'fullName');

		equal(innerHTML(p[0]), 'Kevin Phillips', 'updated value for foo[bar]');
	});

	test("Bracket expression as argument to helper", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{#if [bar]}}if{{else}}else{{/if}}</p>");

		var data = new SimpleMap({
			bar: "key",
			key: false
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'else', 'correctly displays {{else}} section');

		data.set('key', true);

		equal(innerHTML(p[0]), 'if', 'correctly displays {{#if}} section');
	});

	test("Bracket expression in attributes", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p id='{{ foo[bar] }}' class='{{ foo[\'bar:baz\'] }}'></p>");

		var data = new SimpleMap({
			bar: "name",
			foo: new SimpleMap({
				"bar:baz": "zulu",
				name: "Kevin",
				fullName: "Kevin Phillips"
			})
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p')[0];

		equal(getAttr(p, 'id'), 'Kevin', 'correct value for foo[bar]');
		equal(getAttr(p, 'class'), 'zulu', 'correct value for foo[\'bar:baz\']');

		data.set('bar', 'fullName');
		data.get('foo').set('bar:baz', 'tango');

		equal(getAttr(p, 'id'), 'Kevin Phillips', 'correct value for foo[bar]');
		equal(getAttr(p, 'class'), 'tango', 'correct value for foo[\'bar:baz\']');
	});

	test("Bracket expression - DefineMap", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ foo[bar] }}</p>");

		var data = new DefineMap({
			bar: "name",
			foo: {
				name: "Kevin",
				fullName: "Kevin Phillips"
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'Kevin', 'correct value for foo[bar]');

		data.bar = 'fullName';

		equal(innerHTML(p[0]), 'Kevin Phillips', 'updated value for foo[bar]');
	});

	test("context is observable (#38)", function(){
		var computes = [];
		stache.registerHelper("contextHelper", function(context){
			QUnit.equal(typeof context, "function","got a compute");
			computes.push(context);
			return context();
		});
		var template = stache("<ul>{{#each .}}<li>{{contextHelper .}}</li>{{/each}}</ul>");
		var items = new DefineList(["one","two"]);
		var frag = template(items);
		var lis = frag.firstChild.getElementsByTagName("li");

		items.set(1,"TWO");
		lis = frag.firstChild.getElementsByTagName("li");
		//QUnit.equal(computes[1](), "TWO", "compute value is right");
		QUnit.equal( lis[1].innerHTML, "TWO", "is TWO");

		computes[1]("2");
		lis = frag.firstChild.getElementsByTagName("li");
		QUnit.equal( lis[1].innerHTML, "2", "is 2");
	});

	if(window.console && window.console.log) {
		test("log", function(){
			var oldLog = console.log;
			var FIRST = {},
				SECOND = {};
			console.log = function(first, second){
				QUnit.equal(first, FIRST);
				QUnit.equal(second, SECOND);
			};
			var template1 = stache("{{console.log first second}}"),
				template2 = stache("{{ console.log(first, second) }}");


			template1({first: FIRST, second: SECOND});
			template2({first: FIRST, second: SECOND});
			console.log = oldLog;
		});
	}

	test('Nested if-s inside a text section (#9)', function(assert){
		var template = stache('<div class="{{#if sorting}}sort{{#if ascending}}-ascend{{/if}}{{/if}}"></div>');

		var vm = new SimpleMap({
			sorting: true,
			ascending: false
		});
		var frag = template(vm);
		var className = frag.firstChild.className;

		assert.equal( className, 'sort');

		vm.set('ascending', true);
		className = frag.firstChild.className;

		assert.equal( className, 'sort-ascend');
	});

	test('Helper each inside a text section (attribute) (#8)', function(assert){
		var template = stache('<div class="{{#each list}}{{.}} {{/each}}"></div>');

		var vm = new SimpleMap({
			list: new DefineList(['one','two'])
		});
		var frag = template(vm);
		var className = frag.firstChild.className;

		assert.equal( className, 'one two ' );

		vm.get('list').push('three');
		className = frag.firstChild.className;

		assert.equal( className, 'one two three ' );
	});

	test("stache.from works (#57)", function(assert){
		var script = DOCUMENT().createElement("script");
		script.type = "type/stache";
		script.innerHTML = "{{message}}";

		script.setAttribute("id", "some-template");
		DOCUMENT().body.appendChild(script);
		var template = stache.from("some-template");
		var frag = template({message: "Hello"});

		assert.equal(frag.firstChild.nodeValue, "Hello");
	});

	test("foo().bar", function () {
		var template = stache("<p>{{ person().name }}</p>");
		var div = doc.createElement('div');

		var data = new SimpleMap({
			name: "Kevin",
			person: function() {
				return {
					name: this.get('name')
				};
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'Kevin', 'correct value for person().name');

		data.set('name', 'Kevin Phillips');

		equal(innerHTML(p[0]), 'Kevin Phillips', 'updated value for person().name');
	});

	test("foo().bar - DefineMap", function () {
		var template = stache("<p>{{ person().name }}</p>");
		var div = doc.createElement('div');

		var data = new DefineMap({
			name: "Kevin",
			person: function() {
				return {
					name: this.name
				};
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'Kevin', 'correct value for person().name');

		data.name = 'Kevin Phillips';

		equal(innerHTML(p[0]), 'Kevin Phillips', 'updated value for person().name');
	});

	test("each values update when replaced in a SimpleMap (#62)", function () {
		var template = stache("{{#each this}}<p>{{.}}</p>{{/each}}");
		var div = doc.createElement('div');
		var vm = new SimpleMap({
			foo: 'foo-value'
		});
		var dom = template(vm);
		div.appendChild(dom);

		vm.set('foo', 'bar-value');
		var p = div.getElementsByTagName('p');
		equal(innerHTML(p[0]), 'bar-value', 'updated the value inside #each');
	});

	test("Bracket expression as argument to Call expression", function () {
		var template = stache("{{ foo([bar]) }}");
		var div = doc.createElement('div');
		var vm = new SimpleMap({
			foo: function(key) {
				return key + '!';
			},
			bar: 'name',
			name: 'Kevin'
		});
		var dom = template(vm);
		div.appendChild(dom);

		equal(innerHTML(div), 'Kevin!', 'works');
	});

	test("Bracket expression with undefined value", function() {
		var template = stache("{{ place['place:name'] }}");
		var div = doc.createElement('div');
		var vm = new SimpleMap({
			'place:name': 'foo'
		});
		var dom = template(vm);
		div.appendChild(dom);

		equal(innerHTML(div), '', 'empty');

		vm.set('place', { 'place:name': 'bar' });

		equal(innerHTML(div), 'bar', 'updated');
	});

	test("Bracket expression in multi-argument helpers (Literals)", function() {
		var template = stache("{{#eq place['place:name'] 'foo' }}yes{{else}}no{{/eq}}");
		var div = doc.createElement('div');
		var vm = new SimpleMap({
			place: new SimpleMap({
				'place:name': 'foo'
			})
		});
		var dom = template(vm);
		div.appendChild(dom);

		equal(innerHTML(div), 'yes', 'initially true');

		vm.get('place').set('place:name', 'bar' );

		equal(innerHTML(div), 'no', 'updated');
	});

	test("Bracket expression in multi-argument helpers (Lookups)", function() {
		var template = stache("{{#eq place[foo] foo }}yes{{else}}no{{/eq}}");
		var div = doc.createElement('div');
		var vm = new SimpleMap({
			place: new SimpleMap({
				'foo': 'foo'
			}),
			foo: 'foo'
		});
		var dom = template(vm);
		div.appendChild(dom);

		equal(innerHTML(div), 'yes', 'initially true');

		vm.get('place').set('foo', 'bar' );

		equal(innerHTML(div), 'no', 'updated');
	});

	test("Bracket expression followed by bracket expression", function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ foo[bar][baz] }}</p>");

		var data = new SimpleMap({
			baz: 'first',
			bar: 'name',
			foo: {
				name: {
					first: 'K',
					last: 'P'
				},
				fullName: {
					first: 'Kevin',
					last: 'Phillips'
				}
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'K', 'correct value for foo[bar][baz]');

		data.set('bar', 'fullName');

		equal(innerHTML(p[0]), 'Kevin', 'updated value for bar in foo[bar][baz]');

		data.set('baz', 'last');

		equal(innerHTML(p[0]), 'Phillips', 'updated value for baz in foo[bar][baz]');
	});

	test("Bracket expression with numeric index", function () {
		var template, dom, p;
		var div = doc.createElement('div');

		template = stache("<p>{{ foo[0] }}</p>");

		var data = new SimpleMap({
			bar: new DefineList([
				'thud',
				'jeek'
			]),
			foo: new DefineList([
				'baz',
				'quux'
			])
		});

		dom = template(data);
		div.appendChild(dom);
		p = div.getElementsByTagName('p');
		equal(innerHTML(p[0]), 'baz', 'correct value for foo[0]');

		div.innerHTML = '';

		template = stache("<p>{{#each foo}}{{ ../bar[scope.index] }}{{/each}}</p>")
		dom = template(data);
		div.appendChild(dom);
		p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'thudjeek', 'correct value for bar[scope.index] when iterating foo (Map/List data)');

		div.innerHTML = '';

		dom = template(data.get());
		div.appendChild(dom);
		p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'thudjeek', 'correct value for bar[scope.index] when iterating foo (plain object data)');
	});

	test("Bracket expression followed by Lookup expression", function () {
		var template;
		var div = doc.createElement('div');

		template = stache('<p>{{ foo[bar].first }}</p><p>{{#is foo[bar].first "K"}}short{{else}}long{{/is}}</p>');

		var data = new SimpleMap({
			baz: 'first',
			bar: 'name',
			foo: {
				name: {
					first: 'K'
				},
				fullName: {
					first: 'Kevin'
				}
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'K', 'correct value for foo[bar].first');
		equal(innerHTML(p[1]), 'short', 'correct value for `is foo[bar].first "K"`');

		data.set('bar', 'fullName');

		equal(innerHTML(p[0]), 'Kevin', 'updated value for foo[bar].first');
		equal(innerHTML(p[1]), 'long', 'updated value for `is foo[bar].first "K"`');
	});

	test("renderer itself is not observable", function() {
		var first = new SimpleObservable("Justin"),
			last = new SimpleObservable("Meyer");

		var renderer = stache("{{first}} {{last}}");

		var fullNameFrag = new Observation(function(){
			return renderer({first: first, last: last});
		});

		canReflect.onValue( fullNameFrag, function(){
			QUnit.ok(false);
		});

		this.fixture.appendChild(fullNameFrag.get());

		first.set("Josh");
		equal(this.fixture.innerHTML, "Josh Meyer");
	});

	QUnit.test("content is registered (#163)",function(){
		QUnit.ok( viewCallbacks.tag("content"),"registered content" );
	});

	test("whitespace control (#60)", function() {
		equal(core.cleanWhitespaceControl(
			"<foo> {{-message-}} </foo>"),
			"<foo>{{message}}</foo>");
		equal(core.cleanWhitespaceControl(
			"<foo> {{{-message-}}} </foo>"),
			"<foo>{{{message}}}</foo>");
		equal(core.cleanWhitespaceControl(
			"<foo> {{- name -}} </foo><foo> {{{- name -}}} </foo>"),
			"<foo>{{ name }}</foo><foo>{{{ name }}}</foo>");
		equal(core.cleanWhitespaceControl(
			"<foo> {{-#data-}} {{->list-}} {{-/data-}} </foo>"),
			"<foo>{{#data}}{{>list}}{{/data}}</foo>");
		equal(core.cleanWhitespaceControl(
			"<foo>\n\t{{-! comment -}}\n</foo>"),
			"<foo>{{! comment }}</foo>");

		var div = doc.createElement('div');
		div.appendChild(stache("<foo>\n\t{{-! comment -}}\n</foo>")());
		equal(div.innerHTML, '<foo></foo>');

		if (typeof div.querySelectorAll === 'function') {
			equal(div.querySelectorAll(':empty').length, 1);
		}
	});

	testHelpers.dev.devOnlyTest("warn on missmatched tag (canjs/canjs#1476)", function() {
		var teardown = testHelpers.dev.willWarn("filename.stache:3: unexpected closing tag {{/foo}} expected {{/if}}");
		stache("filename.stache", "{{#if someCondition}}\n...\n{{/foo}}");
		QUnit.equal(teardown(), 1, "{{#if someCondition}}");

		teardown = testHelpers.dev.willWarn("filename.stache:3: unexpected closing tag {{/foo}} expected {{/if}}");
		stache("filename.stache", "{{^if someCondition}}\n...\n{{/foo}}");
		QUnit.equal(teardown(), 1, "{{^if someCondition}}");

		teardown = testHelpers.dev.willWarn("filename.stache:3: unexpected closing tag {{/foo}} expected {{/call}}");
		stache("filename.stache", "{{#call()}}\n...\n{{/foo}}");
		QUnit.equal(teardown(), 1, "{{#call()}}");

		teardown = testHelpers.dev.willWarn(/filename.stache/);
		stache("filename.stache", "{{#if}}...{{/}}");
		stache("filename.stache", "{{#if someCondition}}...{{/if}}");
		stache("filename.stache", "{{^if someCondition}}...{{/if}}");
		stache("filename.stache", "{{#call()}}...{{/call}}");
		QUnit.equal(teardown(), 0, "matching tags should not have warnings");
	});

	testHelpers.dev.devOnlyTest("warn on unknown attributes (canjs/can-stache#139)", function(assert) {
		var done = assert.async();
		var teardown = testHelpers.dev.willWarn(
			"unknown attribute binding ($weirdattribute). Is can-stache-bindings imported?",
			function(message, matched) {
				if(matched) {
					QUnit.ok(true, "warning logged");
					teardown();
					done();
				}
			}
		);
		clone({
			'can-stache-bindings': {},
			'can-log/dev/dev': {
				warn: canDev.warn
			}
		})
		.import('can-stache')
		.then(function(stache) {
			stache("<button ($weirdattribute)='showMessage()'>Click</button>");
		});
	});

	test("@arg functions are not called (#172)", function() {
		var data = new DefineMap({
			func1: function() {
				return "called";
			},
			func2: function() {
				ok(false, "this method should not be called.");
				return true;
			},
			noop: undefined
		});

		equal(getText("{{func1()}}", data), "called");
		equal(getText("{{#if func1()}}yes{{else}}no{{/if}}", data), "yes");
		equal(getText("{{#if func2}}yes{{else}}no{{/if}}", data), "yes");

		equal(getText("{{noop}}", data), "");
		equal(getText("{{#if noop}}yes{{else}}no{{/if}}", data), "no");

	});

	test("can-template works", function() {
		var frag;

		var template = stache(
			'<my-email>' +
				'<can-template name="subject">' +
					'<h2>{{subject}}</h2>' +
				'</can-template>' +
			'</my-email>');

		viewCallbacks.tag("my-email", function(el, tagData){
			ok(tagData.templates, "has templates");
			frag = tagData.templates.subject({subject: "Hello"})
			QUnit.equal(frag.firstChild.nodeName, 'H2');
			QUnit.equal(frag.firstChild.firstChild.nodeValue, "Hello");
		});

		frag = template({});
	});

	test("can-template works with multiple can-templates of the same name", function() {
		var count = 2,
			frag;

		var template = stache(
			'<my-email>' +
				'<can-template name="subject">' +
					'<h2>{{subject}}</h2>' +
				'</can-template>' +
			'</my-email>' +
			'<my-email>' +
				'<can-template name="subject">' +
					'<h3>{{subject}}</h3>' +
				'</can-template>' +
			'</my-email>');

		viewCallbacks.tag("my-email", function(el, tagData){
			ok(tagData.templates, "has templates");
			frag = tagData.templates.subject({subject: "Hello"})
			QUnit.equal(frag.firstChild.nodeName, 'H' + count++);
			QUnit.equal(frag.firstChild.firstChild.nodeValue, "Hello");
		});

		frag = template({});
	});

	test("can-template works with no content (#418)", function() {
		var frag;

		var template = stache(
			'<my-email>' +
				'<can-template name="subject">' +
				'</can-template>' +
			'</my-email>');

		viewCallbacks.tag("my-email", function(el, tagData){
			QUnit.ok(tagData.templates, "has templates");
			QUnit.notOk(tagData.templates.subject, 'no subject template');
		});

		frag = template({});
	});

	test("#each with arrays (#215)", function(){
		var which = new SimpleObservable(false);
		var a = {}, b = {}, c = {};

		var list = new Observation(function(){
		  return which.get() ? [a,b,c]: [a,c];
		});

		var template = stache("<ul>{{#each list}}<li/>{{/each}}</ul>");
		var frag = template({list: list});

		var ul = frag.firstChild;
		var lis = ul.getElementsByTagName("li");
		var aLI = lis[0],
			cLI = lis[1];

		which.set(true);

		lis = ul.getElementsByTagName("li");
		var aLI2 = lis[0],
			cLI2 = lis[2];

		QUnit.equal(aLI, aLI2, "a li was reused");
		QUnit.equal(cLI, cLI2, "c li was reused");
	});

	test("Plain JS object scope works with subtemplate (#208)", function(){

		expect(3);

		viewCallbacks.tag("stache-tag", function(el, tagData){
			ok(tagData.scope instanceof Scope, "got scope");
			equal(typeof tagData.subtemplate, "function", "got subtemplate");
			var frag = tagData.subtemplate({last: "Meyer"});

			equal( innerHTML(frag.firstChild), "Meyer", "rendered right");
		});

		var template = stache("<stache-tag><span>{{last}}</span></stache-tag>")

		template({});

	});

	test( "named partials don't render (canjs/can-stache/issues/3)", function () {
		var renderer = stache( "{{<foo}}bar{{/foo}}<div></div>" );
		var data = new SimpleMap( {} );
		var frag = renderer( data );

		equal( innerHTML( frag.firstChild ), "" );
	});

	test( "named partials can be inserted (canjs/can-stache/issues/3)", function () {
		var renderer = stache( "{{<foo}}bar{{/foo}} <span>Test:</span><div>{{>foo}}</div>" );
		var data = new SimpleMap( {} );
		var frag = renderer( data );

		equal( innerHTML( frag.lastChild ), "bar" );
	});

	test( "named partials can be inserted with an initial scope (canjs/can-stache/issues/3)", function () {
		var renderer = stache( "{{<personPartial}}{{lname}}, {{fname}}{{/personPartial}} <span>Test:</span><div>{{>personPartial person}}</div>" );
		var data = new SimpleMap({
			person: {
				fname: "Darryl",
				lname: "Anka"
			}
		});
		var frag = renderer( data );

		equal( innerHTML( frag.lastChild ), "Anka, Darryl" );
	});

	test( "named partials work with live binding (canjs/can-stache/issues/3)", function () {
		var renderer = stache( "{{<foo}}{{.}}{{/foo}}<span>Test: {{nested.prop.test}}</span>{{#each greatJoy}}<div>{{>foo}}</div>{{/each}}" );
		var data = new SimpleMap({
			nested: new SimpleMap({
				prop: new SimpleMap({
					test: "works?"
				})
			}),
			greatJoy: new DefineList([
				"happy",
				"thrilled",
				"ecstatic"
			])
		});
		var frag = renderer( data );
		var div = doc.createElement( "div" );
		div.appendChild( frag );

		equal( innerHTML( div.getElementsByTagName( "span" )[ 0 ] ), "Test: works?", "Named partial property rendered" );
		equal( div.getElementsByTagName( "div" ).length, 3, "Named partial list rendered");

		data.get( "nested").get("prop").set("test", "works!" );
		equal( innerHTML( div.getElementsByTagName( "span" )[ 0 ] ), "Test: works!", "Named partial updates when attr is updated" );

		data.get( "greatJoy").set(0, "quite happy" );
		equal( innerHTML( div.getElementsByTagName( "div" )[ 0 ] ), "quite happy", "Named partial list updates when list item attr is updated" );

		data.get( "greatJoy" ).push( "Nintendo Sixty-FOOOOOOOOOOUR" );
		equal( div.getElementsByTagName( "div" ).length, 4, "Named partial list updates with new item" );
	});

	test('stache can accept an intermediate with a named partial (canjs/can-stache/issues/3)', function(){
		var template = "{{<foo}}bar{{/foo}} <span>Test:</span><div>{{>foo}}</div>";
		var intermediate = parser( template, {}, true );

		var renderer = stache(intermediate);
		var data = new SimpleMap( {} );
		var frag = renderer( data );

		equal( innerHTML( frag.lastChild ), "bar" );
	});

	test('named partials can reference each other (canjs/can-stache/issues/3)', function(){
		var template = "{{<foo}}hello {{>bar}}{{/foo}} {{<bar}}world{{/bar}} <span>Test:</span><div>{{>foo}}</div>";
		var intermediate = parser( template, {}, true );

		var renderer = stache(intermediate);
		var data = new SimpleMap( {} );
		var frag = renderer( data );

		equal( innerHTML( frag.lastChild ), "hello world" );
	});

	test( "recursive named partials work (canjs/can-stache/issues/3)", function () {
		var renderer = stache( "{{<foo}}<li>{{name}}<ul>{{#each descendants}}{{>foo}}{{/each}}</ul></li>{{/foo}} <ul>{{#with ychromosome}}{{>foo}}{{/with}}</ul>" );
		var data = new SimpleMap({
			ychromosome: {
				name: "AJ",
				descendants: [
					{
						name: "tim",
						descendants: []
					},
					{
						name: "joe",
						descendants: [
							{
								name: "chad",
								descendants: []
							},
							{
								name: "goku",
								descendants: [
									{
										name: "gohan",
										descendants: []
									}
								]
							}
						]
					},
					{
						name: "sam",
						descendants: []
					}
				]
			}
		});
		var frag = renderer( data );
		var fraghtml = innerHTML( frag.lastChild );

		equal( (fraghtml.match(/<li>/g) || []).length, 7 );
		ok( fraghtml.indexOf( "<li>goku<ul><li>gohan<ul><\/ul><\/li><\/ul><\/li>" ) !== -1 );
	});

	testHelpers.dev.devOnlyTest("warn when using on:, :to:on:, :to, :from or :bind without importing can-stache-bindings (#273)", function(assert) {
		stop();
		expect(6);
		var teardown = testHelpers.dev.willWarn(/unknown attribute binding/, function(message, matched) {
			if(matched) {
				QUnit.ok(matched, message);
			}
		});
		clone({
			'can-stache-bindings': {},
			'can-log/dev/dev': {
				warn: canDev.warn
			}
		})
		.import('can-stache')
		.then(function(stache) {
			stache('<a on:click="theProp" value:to:on:click="theProp"  value:to="theProp" value:from="theProp" value:bind="theProp">a link</a>');
			QUnit.equal(teardown(), 5, "Every type of warning logged");
			start();
		});
	});

	testHelpers.dev.devOnlyTest("Don't warn about tag mismatch for Call expressions with dots in the method lookup (#214)", function() {
		var teardown = testHelpers.dev.willWarn(/unexpected closing tag/, function(message, matched) {
			if(matched) {
				QUnit.ok(false, "Should not have warned about matching tags");
			}
		});
		stache(
			'{{#games.getAvailableCourts(selectedRound)}}' +
	   		'<option value="{{.}}">{{.}}</option>' +
			'{{/games.getAvailableCourts}}'
		);

		QUnit.equal(teardown(), 0, "No warnings fired");
	});

	test('Bracket expression after `this` (canjs/can-stache/issues/173)', function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ this[bar] }}</p>");

		var data = new SimpleMap({
			bar: "name",
			name: "James",
			"name.full": "James Atherton"
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'James', 'correct value for this[bar]');

		data.set('bar', 'name.full');

		equal(innerHTML(p[0]), 'James Atherton', 'updated bar value for this[bar]');

		data.set('name.full', 'Lunch time');

		equal(innerHTML(p[0]), 'Lunch time', 'updated `name.full` value for this[bar]');

	});

	test('Bracket expression with dot using DefineMap (canjs/can-stache/issues/173)', function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ this[bar] }}</p><p>{{ this['name.full'] }}</p>");

		var data = new DefineMap({
			bar: "name.full",
			"name.full": "James Atherton"
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'James Atherton', 'correct value for this[bar]');
		equal(innerHTML(p[1]), 'James Atherton', 'correct value for this["name.full"]');

		data['name.full'] = 'Lunch time';

		equal(innerHTML(p[0]), 'Lunch time', 'updated `name.full` value for this[bar]');
		equal(innerHTML(p[1]), 'Lunch time', 'updated `name.full` value for this["name.full"]');
	});

	test('Bracket expression after `.` with dot using DefineMap (canjs/can-stache/issues/173)', function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ .[bar] }}</p><p>{{ .['name.full'] }}</p>");

		var data = new DefineMap({
			bar: "name.full",
			"name.full": "James Atherton"
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'James Atherton', 'correct value for .[bar]');
		equal(innerHTML(p[1]), 'James Atherton', 'correct value for .["name.full"]');

		data['name.full'] = 'Lunch time';

		equal(innerHTML(p[0]), 'Lunch time', 'updated `name.full` value for .[bar]');
		equal(innerHTML(p[1]), 'Lunch time', 'updated `name.full` value for .["name.full"]');
	});

	test('Bracket expression by itself with dot using DefineMap (canjs/can-stache/issues/173)', function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ [bar] }}</p><p>{{ ['name.full'] }}</p><p>{{name.full}}</p>{{#with person}}<p>{{['name.full']}}</p>{{/with}}");

		var data = new DefineMap({
			bar: "name.full",
			"name.full": "James Atherton",
			name: {
				full: "Yep yep"
			},
			person: {
				"name.full": "Tim Tim"
			}
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'James Atherton', 'correct value for [bar]');
		equal(innerHTML(p[1]), 'James Atherton', 'correct value for ["name.full"]');
		equal(innerHTML(p[2]), 'Yep yep', 'correct value for name.full');
		equal(innerHTML(p[3]), 'Tim Tim', 'correct value for ["name.full"] in a #with expression');

		data['name.full'] = 'Lunch time';
		data.name.full = 'Lunch time 2';
		data.person["name.full"] = 'Lunch time 3';

		equal(innerHTML(p[0]), 'Lunch time', 'updated `name.full` value for [bar]');
		equal(innerHTML(p[1]), 'Lunch time', 'updated `name.full` value for ["name.full"]');
		equal(innerHTML(p[2]), 'Lunch time 2', 'updated value for name.full');
		equal(innerHTML(p[3]), 'Lunch time 3', 'updated value for ["name.full"] in a #with expression');
	});

	test('Bracket expression by itself with dot using can.Map (canjs/can-stache/issues/173)', function () {
		var template;
		var div = doc.createElement('div');

		template = stache("<p>{{ [bar] }}</p><p>{{ ['name.full'] }}</p><p>{{name2.full}}</p>{{#with person}}<p>{{['name.full']}}</p>{{/with}}");

		var data = new SimpleMap({
			bar: "name.full",
			"name.full": "James Atherton",
			name2: new SimpleMap({
				full: "Yep yep"
			}),
			person: new SimpleMap({
				"name.full": "Tim Tim"
			})
		});
		var dom = template(data);
		div.appendChild(dom);
		var p = div.getElementsByTagName('p');

		equal(innerHTML(p[0]), 'James Atherton', 'correct value for [bar]');
		equal(innerHTML(p[1]), 'James Atherton', 'correct value for ["name.full"]');
		equal(innerHTML(p[2]), 'Yep yep', 'correct value for name.full');
		equal(innerHTML(p[3]), 'Tim Tim', 'correct value for ["name.full"] in a #with expression');

		data.set('name.full', 'Lunch time');
		data.get("name2").set("full", 'Lunch time 2');
		data.get("person").set("name.full", 'Lunch time 3');

		equal(innerHTML(p[0]), 'Lunch time', 'updated `name.full` value for [bar]');
		equal(innerHTML(p[1]), 'Lunch time', 'updated `name.full` value for ["name.full"]');
		equal(innerHTML(p[2]), 'Lunch time 2', 'updated value for name.full');
		equal(innerHTML(p[3]), 'Lunch time 3', 'updated value for ["name.full"] in a #with expression');
	});

	test("Templates can refer to themselves with {{>scope.view .}} (#159)", function() {
		var thing = new DefineMap({
			child: {
				hasThing: true,
				child: {
					hasThing: false,
					child: {
						hasThing: true
					}
				}
			}
		});

		var renderer = stache(
			"{{#child}}" +
				"<span>" +
					"{{#if hasThing}}" +
						"{{>scope.view .}}" +
					"{{/if}}" +
				"</span>" +
			"{{/child}}"
		);

		var view = renderer(thing);

		equal(view.firstChild.firstChild.innerHTML, "", "Got the second span");
		equal(view.firstChild.firstChild.firstChild.firstChild, undefined, "It stopped there");
	});

	test("Self-referential templates assume 'this'", function() {
		var thing = new DefineMap({
			child: {
				hasThing: true,
				child: {
					hasThing: false,
					child: {
						hasThing: true
					}
				}
			}
		});

		var renderer = stache(
			"{{#child}}" +
				"<span>" +
					"{{#if hasThing}}" +
						"{{>scope.view}}" +
					"{{/if}}" +
				"</span>" +
			"{{/child}}"
		);

		var view = renderer(thing);

		equal(view.firstChild.firstChild.innerHTML, "", "Got the second span");
		equal(view.firstChild.firstChild.firstChild.firstChild, undefined, "It stopped there");
	});

	test("Self-referential templates work with partial templates", function() {
		var thing = new DefineMap({
			child: {
				hasThing: true,
				child: {
					hasThing: false,
					child: {
						hasThing: true
					}
				}
			}
		});

		var renderer = stache(
			"{{<somePartial}}" +
				"foo" +
			"{{/somePartial}}" +
			"{{#child}}" +
				"<span>" +
					"{{#if hasThing}}" +
						"{{>somePartial}}" +
						"{{>scope.view}}" +
					"{{/if}}" +
				"</span>" +
			"{{/child}}"
		);

		var view = renderer(thing);

		equal(view.firstChild.firstChild.nodeValue, "foo", "Got the second span");
	});

	test("Self-referential templates can be given scope", function() {
		var thing = new DefineMap({
			child: {
				someProp: 1,
				hasThing: true,
				child: {
					hasThing: false,
					child: {
						hasThing: true
					}
				}
			}
		});

		var renderer = stache(
			"{{#child}}" +
				"<span>" +
					"{{someProp}}" +
					"{{#if hasThing}}" +
						"{{>scope.view someProp}}" +
					"{{/if}}" +
				"</span>" +
			"{{/child}}"
		);

		var view = renderer(thing);

		equal(view.firstChild.firstChild.nodeValue, "1", "It got the passed scope");
	});

	test("newline is a valid special tag white space", function() {
		var renderer = stache('<div\n\t{{#unless ./hideIt}}\n\t\thidden\n\t{{/unless}}\n>peekaboo</div>');
		var html = renderer({ hideIt: true });

		QUnit.ok(html, "markup was generated");

		// almost the same, but no leading spaces before {{#unless
		renderer = stache('<div\n{{#unless ./hideIt}}\n\t\thidden\n\t{{/unless}}\n>peekaboo</div>');
		html = renderer({ hideIt: true });

		QUnit.ok(html, "markup was generated");
	});

	test("numbers can be used as hash keys (#203)", function() {
		stache.registerHelper("globalValue", function(prop, options) {
			return prop + ":" + (options.hash[0] || options.hash.zero);
		});

		var renderer = stache("<p>{{globalValue 'value' 0='indexed'}}</p>");
		var frag = renderer({});

		var fraghtml = innerHTML(frag.lastChild);

		equal(fraghtml, "value:indexed");

		// sanity check -- exact same thing should work for string key here
		renderer = stache("<p>{{globalValue 'value' zero='strung'}}</p>");
		frag = renderer({});

		fraghtml = innerHTML(frag.lastChild);

		equal(fraghtml, "value:strung");
	});

	test("Can assign multiple keys using with (#274)", function() {
		var viewModel = new DefineMap({
			person: {
				first: "John",
				last: "Gardner"
			}
		});

		var renderer = stache(
			"{{#with firstName=person.first lastName=person.last}}" +
				"<span>{{firstName}}</span>" +
				"<span>{{lastName}}</span>" +
			"{{/with}}"
		);

		var view = renderer(viewModel);

		equal(view.firstChild.firstChild.nodeValue, "John", "Got the first name");
		equal(view.firstChild.nextSibling.firstChild.nodeValue, "Gardner", "Got the last name");

		// second case: object AND hash values

		renderer = stache(
			"{{#with person firstName=person.first}}" +
				"<span>{{firstName}}</span>" +
				"<span>{{./last}}</span>" +
			"{{/with}}"
		);

		view = renderer(viewModel);

		equal(view.firstChild.firstChild.nodeValue, "John", "Object AND hash values - Got the first name");
		equal(view.firstChild.nextSibling.firstChild.nodeValue, "Gardner", "Object AND hash values - Got the last name");


	});

	test("can assign hash using each #300", function () {
		var viewModel = new DefineMap({
			people: [{
				first: "John",
				last: "Gardner"
			}, {
				first: "Juan",
				last: "Orozco"
			}, {
				first: "B",
				last: "Rad"
			}]
		});

		var renderer = stache(
			"{{#each people person=value num=index}}" +
				"<div class=\"person\" data-index=\"{{num}}\"><span>{{person.first}}</span>" +
				"<span>{{person.last}}</span></div>" +
			"{{/each}}"
		);

		var view = renderer(viewModel);

		equal(view.lastChild.getAttribute('data-index'), "2", "Got the index");
		equal(view.firstChild.nextSibling.firstChild.firstChild.nodeValue, "John", "Got aliased value");
	});

	test("can assign hash using each on an iterable map #300", function () {
		var viewModel = new DefineMap({
			flags: {
				isJSCool: "yep",
				canJS: "yep"
			}
		});

		var renderer = stache(
			"{{#each flags flagValue=value flagKey=key}}" +
				"<span>{{flagKey}}: {{flagValue}}</span>" +
			"{{/each}}"
		);

		var view = renderer(viewModel);

		equal(view.firstChild.firstChild.nodeValue, "isJSCool", "Got the key");
		equal(view.firstChild.lastChild.nodeValue, "yep", "Got aliased value");
	});

	test('check if <content> is already registred #165', function () {
		stop();
		viewCallbacks.tag("content", function() {});

		var teardown = testHelpers.dev.willWarn(/Custom tag: content is already defined/, function(message, matched) {
			QUnit.notOk(matched, message);
		});

		clone({
			'can-view-callbacks': viewCallbacks
		})
		.import('can-stache')
		.then(function(stache) {
			stache('<content>foo</content>');
			QUnit.equal(teardown(), 0, "Warning was not logged");
			start();
		});
	});

	testHelpers.dev.devOnlyTest("partials warn on missing context (#328)", function() {
		stop();
		var teardown = testHelpers.dev.willWarn(/is not defined in the scope/, function(message, matched) {
			if(matched) {
				QUnit.ok(true, "Warning fired");
				QUnit.equal(teardown(), 1, "One matching warning fired");
				start();
			}
		});

		var renderer = stache("{{>foo bar}}");
		renderer({ foo: stache("baz") });
	});

	test("#if works with call expressions", function(){
		var template = stache("{{#if(foo)}}foo{{else}}bar{{/if}}");
		var map = new DefineMap({
			foo: true
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "foo");
		map.foo = false;
		QUnit.equal(innerHTML(div), "bar");
	});

	test("#unless works with call expressions", function(){
		var template = stache("{{#unless(foo)}}foo{{else}}bar{{/unless}}");
		var map = new DefineMap({
			foo: false
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "foo");
		map.foo = true;
		QUnit.equal(innerHTML(div), "bar");
	});

	test("log works with call expressions", function(){
		var map = new DefineMap({
			foo: "bar"
		});
		var log = console.log;

		QUnit.stop();
		console.log = function(value){
			QUnit.equal(value, map);
			console.log = log;
			QUnit.start();
		};

		var template = stache("{{console.log(this)}}");
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
	});

	test("debugger works with call expressions", function(){
		debug.__testing.allowDebugger = false;
		var log = canLog.log;
		var warn = canLog.warn;

		var logs = [
			"Use `get(<path>)` to debug this template",
			"Forgotten {{debugger}} helper"
		];
		canLog.log = canLog.warn = function(message){
			QUnit.equal(message, logs.shift());
		}

		var template = stache("{{debugger()}}");
		var div = doc.createElement("div");
		var frag = template();

		div.appendChild(frag);

		canLog.log = log;
		canLog.warn = warn;
		debug.__testing.allowDebugger = true;
	});

	test("debugger Lookup Expression calls debugger helper (#469)", function(){
		debug.__testing.allowDebugger = false;
		var log = canLog.log;
		var warn = canLog.warn;

		var logs = [
			"Use `get(<path>)` to debug this template",
			"Forgotten {{debugger}} helper"
		];
		canLog.log = canLog.warn = function(message){
			QUnit.equal(message, logs.shift());
		}

		var template = stache("{{debugger}}");
		var div = doc.createElement("div");
		var frag = template();

		div.appendChild(frag);

		canLog.log = log;
		canLog.warn = warn;
		debug.__testing.allowDebugger = true;
	});

	test("#eq works with call expressions", function(){
		var template = stache("{{#eq(foo, true)}}foo{{else}}bar{{/eq}}");
		var map = new DefineMap({
			foo: true
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "foo");
		map.foo = false;
		QUnit.equal(innerHTML(div), "bar");
	});

	test("#is works with call expressions", function(){
		var template = stache("{{#is(foo, true)}}foo{{else}}bar{{/eq}}");
		var map = new DefineMap({
			foo: true
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "foo");
		map.foo = false;
		QUnit.equal(innerHTML(div), "bar");
	});

	test("#switch, #case, and #default work with call expressions", function(){
		var template = stache("{{#switch(type)}}{{#case('admin')}}admin{{/case}}{{#default()}}peasant{{/default}}{{/switch}}");
		var map = new DefineMap({
			type: "admin"
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "admin");
		map.type = "peasant";
		QUnit.equal(innerHTML(div), "peasant");
	});

	test("joinbase works with call expressions", function(){
		var baseUrl = System.baseURL || getBaseURL();
		var template = stache("{{joinBase('hello/', name, '.png')}}");
		var map = new DefineMap({
			name: "world"
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), joinURIs(baseUrl, "hello/world.png"));
	});

	test("#each works with hash expression in call expression", function(){
		var template = stache("{{#each(todos, todo=value num=index)}}<p data-index=\"{{num}}\">{{todo.name}}</p>{{/each}}");
		var map = new DefineMap({
			todos: [
				{
					name: "foo"
				},
				{
					name: "bar"
				}
			]
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);

		var p = div.getElementsByTagName("p");
		for(var i = 0; i < p.length; i++){
			QUnit.equal(innerHTML(p[i]), map.todos[i].name);
			QUnit.equal(p[i].getAttribute("data-index"), i);
		}
	});

	test("#each with call expression should be optimized for performance", function(){
		var div = doc.createElement('div');
		var count = 0;

		var origEach = overwriteGlobalHelper('each', function() {
			count++;
			return origEach.apply(this, arguments);
		}, 'addLiveHelper');
		var template = stache("{{#each(this)}}{{this}} {{/each}}");
		var listCompute = new SimpleObservable([ "one", "two" ]);

		var frag = template(listCompute);
		div.appendChild(frag);

		QUnit.equal(innerHTML(div), "one two ");

		listCompute.set(["one", "two", "three"]);
		QUnit.equal(innerHTML(div), "one two three ");

		QUnit.equal(count, 1, "#each helper should only be called once");
		overwriteGlobalHelper('each', origEach);
	});

	test("#each(asyncGetter) should only call async getter once (#402)", function(){
		var div = doc.createElement('div');
		var count = 0;
		var RESOLVE;

		var promise = new Promise(function(resolve) {
			RESOLVE = resolve;
		});

		var Data = DefineMap.extend({
			items: {
				get: function(last, resolve) {
					count++;
					// setTimeout is needed to cause binging to set up and tear down
					setTimeout(function() {
						resolve([ "one", "two", "three" ]);
						RESOLVE();
					}, 10);
					return null;
				}
			}
		});
		var data = new Data();

		var template = stache("{{#each(items)}}{{this}} {{/each}}");

		var frag = template(data);
		div.appendChild(frag);

		QUnit.equal(innerHTML(div), "", "initially empty");

		QUnit.stop();
		promise.then(function() {
			// setTimeout so DOM will update
			setTimeout(function() {
				QUnit.equal(innerHTML(div), "one two three ", "one two three ");
				QUnit.equal(count, 1, "AsyncObservable should only be called once");
				QUnit.start();
			}, 10);
		});
	});

	test("#with works with hash expression in call expression", function(){
		var template = stache("{{#with(bar=foo qux=baz)}}{{bar}} {{qux}}{{/with}}");
		var map = new DefineMap({
			foo: "hello",
			baz: "world"
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), map.foo + " " + map.baz);
	});

	test("#with works with hash expression and objects in call expression", function(){
		var template = stache("{{#with(bar=foo qux=baz)}}{{bar}} {{qux}}{{/with}}");
		var map = {
			foo: "hello",
			baz: "world"
		};
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), map.foo + " " + map.baz);
	});

	test("call expression works with hash expression", function(){
		var exprData = core.expression.parse("helper(todos, todo=value num=index)");
		var args = core.expression.Call.prototype.args.call(exprData, new Scope({}));

		equal(args().hashExprs.todo.key, "value");
		equal(args().hashExprs.num.key, "index");
	});

	test("#each with hash expression in call expression should not warn", function(){
		var template = stache("{{#each(todos, todo=value)}}<p>{{todo}}</p>{{/each}}");
		var map = new DefineMap({todos: ["foo", "bar", "baz"]});
		var warn1 = testHelpers.dev.willWarn(/can-stache: Using the `as`/i);
		var warn2 = testHelpers.dev.willWarn(/can-stache: Do not use/i);

		template(map);

		equal(warn1(), 0);
		equal(warn2(), 0);
	});


	test('#each with call expression and arrays should work with hash expressions', function(){
		var list = ['foo', 'bar', 'baz'];
		var template = stache('{{#each(this, item=value, itemIndex=index)}}{{itemIndex}}:{{item}}{{/each}}');
		var div = doc.createElement('div');
		var frag = template(list);

		div.appendChild(frag);

		equal(innerHTML(div), '0:foo1:bar2:baz');
	});

	test('#each with call expression and objects should work with hash expressions', function(){
		var map = {'foo': 'bar', 'baz': 'qux'};
		var template = stache('{{#each(this, itemKey=key itemValue=value)}}{{itemKey}}:{{itemValue}}{{/each}}');
		var div = doc.createElement('div');
		var frag = template(map);

		div.appendChild(frag);

		equal(innerHTML(div), 'foo:barbaz:qux');
	});

	testHelpers.dev.devOnlyTest("scope has lineNumber", function(){
		var template = stache('<p>{{scope.lineNumber}}</p>\n<p>{{scope.lineNumber}}</p>');
		var frag = template();

		equal(frag.firstChild.firstChild.nodeValue, '1');
		equal(frag.lastChild.firstChild.nodeValue, '2');
	});

	testHelpers.dev.devOnlyTest("scope has filename", function(){
		var template = stache('some-file', '{{scope.filename}}');
		var frag = template();

		equal(frag.firstChild.nodeValue, 'some-file');
	});

	testHelpers.dev.devOnlyTest("scope has correct filename after calling a partial", function(){
		var innerTemplate = stache('some-partial', '<span>{{scope.filename}}</span>');
		var outerTemplate = stache('some-file', '{{#if foo}}{{scope.filename}}{{/if}}{{>somePartial}}');
		var vm = new DefineMap()
		var frag = outerTemplate(vm, {
			partials: {
				somePartial: innerTemplate
			}
		});
		vm.set('foo', 'bar');

		equal(frag.firstChild.nodeValue, 'some-file');
		equal(frag.firstChild.nextSibling.firstChild.nodeValue, 'some-partial');
	});

	QUnit.test("using scope.index works when using #each with arrays", function() {
		var data = {
			itemsArray: [ "zero", "one", "two" ]
		};

		var renderer = stache("index.stache",
			"<ul>\n" +
				"{{#each itemsArray}}\n" +
					"<li>{{scope.index}}: {{.}}</li>\n" +
				"{{/each}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer(data);
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "0: zero" );
		QUnit.equal( innerHTML(lis[1]), "1: one" );
		QUnit.equal( innerHTML(lis[2]), "2: two" );
	});

	QUnit.test("using scope.key works when using #each with DefineMap", function() {
		var data = new DefineMap({
			itemsObj: {
				zero: 0,
				one: 1,
				two: 2
			}
		});

		var renderer = stache("index.stache",
			"<ul>\n" +
				"{{#each itemsObj}}\n" +
					"<li>{{scope.key}}: {{.}}</li>\n" +
				"{{/each}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer(data);
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "zero: 0" );
		QUnit.equal( innerHTML(lis[1]), "one: 1" );
		QUnit.equal( innerHTML(lis[2]), "two: 2" );
	});

	QUnit.test("using scope.key works when using #each with SimpleMap", function() {
		var itemsObj = new SimpleMap({
			zero: 0,
			one: 1,
			two: 2
		});

		var renderer = stache("index.stache",
			"<ul>\n" +
				"{{#each itemsObj}}\n" +
					"<li>{{scope.key}}: {{.}}</li>\n" +
				"{{/each}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer({ itemsObj: itemsObj });
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "zero: 0" );
		QUnit.equal( innerHTML(lis[1]), "one: 1" );
		QUnit.equal( innerHTML(lis[2]), "two: 2" );
	});

	QUnit.test("using scope.key works when using #each with objects", function() {
		var itemsObj = {
			zero: 0,
			one: 1,
			two: 2
		};

		var renderer = stache("index.stache",
			"<ul>\n" +
				"{{#each itemsObj}}\n" +
					"<li>{{scope.key}}: {{.}}</li>\n" +
				"{{/each}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer({ itemsObj: itemsObj });
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "zero: 0" );
		QUnit.equal( innerHTML(lis[1]), "one: 1" );
		QUnit.equal( innerHTML(lis[2]), "two: 2" );
	});

	QUnit.test("using scope.index works when using #array", function() {
		var data = new DefineMap({
			itemsArray: [ "zero", "one", "two" ]
		});

		var renderer = stache("index.stache",
			"<ul>\n" +
			"{{#itemsArray}}\n" +
			"<li>{{scope.index}}: {{.}}</li>\n" +
			"{{/itemsArray}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer(data);
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "0: zero" );
		QUnit.equal( innerHTML(lis[1]), "1: one" );
		QUnit.equal( innerHTML(lis[2]), "2: two" );
	});

	QUnit.test("values can be read from the scope passed to a stache renderer using {{scope.root}}", function() {
		var data = new DefineMap({
			itemsArray: [ "zero", "one", "two" ],
			exclamation: "!!!"
		});

		var renderer = stache("index.stache",
			"<ul>\n" +
				"{{#each itemsArray}}\n" +
					"<li>{{.}}{{scope.root.exclamation}}</li>\n" +
				"{{/each}}\n" +
			"</ul>"
		);

		var div = doc.createElement('div');
		var frag = renderer(data);
		div.appendChild(frag);

		var lis = div.getElementsByTagName('li');

		QUnit.equal( innerHTML(lis[0]), "zero!!!" );
		QUnit.equal( innerHTML(lis[1]), "one!!!" );
		QUnit.equal( innerHTML(lis[2]), "two!!!" );
	});

	QUnit.test("scope.index works after updating the source list", function(){
		var div = doc.createElement('div');
		var list = new DefineList(["a", "c", "d", "e", "f"]);
		var template = stache("{{#each(this)}}{{scope.index}}{{/each}}");
		var frag = template(list);

		div.appendChild(frag);

		list.splice(1, 0, "b")

		QUnit.equal(innerHTML(div), "012345");
	});

	testHelpers.dev.devOnlyTest("section iteration of property using bracket notation should not warn about unexpected closing tag", function (){
		var teardown = testHelpers.dev.willWarn(/unexpected closing tag/);

		stache("{{#items['foo:bar']}}{{this}}{{/items}}");

		equal(teardown(), 0);
	});

	testHelpers.dev.devOnlyTest("passing bracket notation to method should not warn about unexpected closing tag", function (){
		var teardown = testHelpers.dev.willWarn(/unexpected closing tag/);

		stache("{{#eq(items['foo:bar'], 'baz')}}qux{{/eq}}");

		equal(teardown(), 0);
	});

	testHelpers.dev.devOnlyTest("reading current scope with bracket notation should not warn about unexpected closing tag", function (){
		var teardown = testHelpers.dev.willWarn(/unexpected closing tag/);

		stache("{{#['foo:bar']}}qux{{/['foo:bar']}}");

		equal(teardown(), 0);
	});

	testHelpers.dev.devOnlyTest("section iteration of property using bracket notation should warn about unexpected closing tag", function (){
		var teardown = testHelpers.dev.willWarn("1: unexpected closing tag {{/items['foo:bar']}} expected {{/items}}");

		stache("{{#items['foo:bar']}}{{this}}{{/items['foo:bar']}}");

		equal(teardown(), 1);
	});

	testHelpers.dev.devOnlyTest("lineNumber should be set on the scope at 'end' before passing it to viewCallbacks.tagHandler (#373)", function (){
		var tagHandler = viewCallbacks.tagHandler;

		viewCallbacks.tagHandler = function (context, tagName, options){
			equal(options.scope.peek('scope.lineNumber'), 3);
		}

		stache("foo\nbar\n<cust-elem/>\nbaz")();

		viewCallbacks.tagHandler = tagHandler;
	});

	testHelpers.dev.devOnlyTest("lineNumber should be set on the scope at 'close' before passing it to viewCallbacks.tagHandler (#373)", function (){
		var tagHandler = viewCallbacks.tagHandler;

		viewCallbacks.tagHandler = function (context, tagName, options){
			equal(options.scope.peek('scope.lineNumber'), 3);
		}

		stache("foo\nbar\n<cust-elem></cust-elem>\nbaz")();

		viewCallbacks.tagHandler = tagHandler;
	});

	testHelpers.dev.devOnlyTest("lineNumber should be set on the scope at 'attrEnd' before passing it to viewCallbacks.tagHandler (#373)", function (){
		var attribute = 'toProp:from';
		var encodedAttribute = encoder.encode(attribute);
		viewCallbacks.attr(encodedAttribute, function (el, attrData){
			equal(attrData.scope.peek('scope.lineNumber'), 3);
		});

		stache("foo\nbar\n<div " + attribute + "=\"fromProp\"/></div>\nbaz")();

		// Remove handler to prevent side effect of other tests from calling this assertion
		delete viewCallbacks._attributes[encodedAttribute];
	});

	QUnit.test("{{bar}} should not call `bar`", function(){
		var div = doc.createElement('div');
		var data = {
			bar: function() {
				QUnit.ok(false, 'bar should not be called');
				return 'bar value';
			}
		};
		var template = stache("{{bar}}");
		var frag = template(data);

		div.appendChild(frag);

		QUnit.equal(innerHTML(div), data.bar.bind(data).toString());
	});

	QUnit.test("{{bar 'foo'}} should call `bar` and pass 'foo'", function(){
		var div = doc.createElement('div');
		var data = {
			bar: function(key) {
				QUnit.ok(true, 'bar should be called');
				return key;
			}
		};
		var template = stache("{{bar 'foo'}}");
		var frag = template(data);

		div.appendChild(frag);

		QUnit.equal(innerHTML(div), "foo");
	});

	QUnit.test('#scope.helpers can be used to call a built-in helper if the scope has a property of the same name', function(){
		var template = stache('{{#scope.helpers.if truthy}}truthy{{else}}falsey{{/scope.helpers.if}}');
		var div = doc.createElement('div');
		var frag = template({
			truthy: true,
			if: function(val) {
				QUnit.ok(false, 'should not be called');
				return false;
			}
		});

		div.appendChild(frag);

		equal(innerHTML(div), 'truthy');
	});

	QUnit.test('functions called on nested observables should have the correct context', function() {
		var person = new DefineMap({
			name: "Mick",
			getName: function(msg) {
				return msg ? msg + this.name : this.name;
			}
		});

		var data = new DefineMap({
			person: person
		});

		var div = doc.createElement("div");
		var template = stache("{{person.getName()}}");
		var frag = template(data);

		div.appendChild(frag);

		equal(innerHTML(div), 'Mick', 'works with Call Expressions');

		div = doc.createElement("div");
		template = stache("{{person.getName 'Hello '}}");
		frag = template(data);

		div.appendChild(frag);
		equal(innerHTML(div), 'Hello Mick');
	});

	QUnit.test("Inverse {{if}} doesn't render truthy section when value is truthy", function(){
		var div = doc.createElement("div");
		var view = stache("{{^if(isTrue())}}did not work{{/if}}");
		var frag = view({
			isTrue: function() { return true; }
		});
		div.appendChild(frag);
		equal(innerHTML(div), "", "No textnode rendered");
	});

	testHelpers.dev.devOnlyTest("lineNumber should be set on the scope inside of a rendered string (#415)", function() {
		var scope = new Scope({ foo: "classVal" });
		var template = stache("<div class='{{foo}}'>Hello</div>");
		template(scope);

		QUnit.equal(scope.get("scope.lineNumber"), 1);
	});

	testHelpers.dev.devOnlyTest("should not warn for keys that exist but are `undefined` (#427)", function () {
		var VM = DefineMap.extend({
			propWithoutValue: 'string'
		});
		var vm = new VM();
		var teardown = testHelpers.dev.willWarn('can-stache/expressions/lookup.js: Unable to find key "propWithoutValue".');

		stache('<li>{{propWithoutValue}}</li>')(vm);

		QUnit.equal(teardown(), 0, 'did not get warning');
	});

	testHelpers.dev.devOnlyTest("should not warn for dotted keys that exist", function () {
		var ENV = DefineMap.extend({
			NODE_ENV: "any"
		});

		var VM = DefineMap.extend({
			env: "any"
		});

		// First without anything
		var vm = new VM();
		var teardown = testHelpers.dev.willWarn(/Unable to find key/);
		stache('{{env.NODE_ENV}}')(vm);

		QUnit.equal(teardown(), 0, "did not warn");

		// Then with an env but no prop
		vm = new VM({env: new DefineMap()})
		teardown = testHelpers.dev.willWarn(/Unable to find key/);
		stache('{{env.NODE_ENV}}')(vm);

		QUnit.equal(teardown(), 1, "did warn");

		// Then with everything
		vm = new VM({env: new ENV()});
		teardown = testHelpers.dev.willWarn(/Unable to find key/);
		stache('{{env.NODE_ENV}}')(vm);

		QUnit.equal(teardown(), 0, "did not warn");
	});

	testHelpers.dev.devOnlyTest("should not warn for scope.<key> keys that exist", function () {
		var VM = DefineMap.extend({
			name: "string",
			list: {
				default: function() {
					return [ "one", "two" ]
				}
			}
		});

		var vm = new VM();
		var scope = new Scope(vm, null, { viewModel: true });
		var teardown = testHelpers.dev.willWarn(/Unable to find key/);
		stache('{{#each list}}{{scope.vm.name}}{{/each}}')(scope);

		QUnit.equal(teardown(), 0, "did not warn");
	});

	testHelpers.dev.devOnlyTest("should not warn for ../<key> keys that exist (#519)", function () {
		var VM = DefineMap.extend({
			name: "string",
			list: {
				default: function() {
					return [ "one", "two" ]
				}
			}
		});

		var vm = new VM();
		var scope = new Scope(vm, null, { viewModel: true });
		var teardown = testHelpers.dev.willWarn(/Unable to find key/);
		stache('{{#each list}}{{../name}}{{/each}}')(scope);

		QUnit.equal(teardown(), 0, "did not warn");
	});

	testHelpers.dev.devOnlyTest("Warnings for nested properties should not suggest using the same key (#536)", function () {
		var Abc = DefineMap.extend({});
		var VM = DefineMap.extend({
			abc: {
				Default: Abc
			}
		});

		var vm = new VM();
		var scope = new Scope(vm, null, { viewModel: true });
		var warningTeardown = testHelpers.dev.willWarn(/Unable to find key/);
		var suggestionTeardown = testHelpers.dev.willWarn(/will read from/);
		stache('{{abc.def}}')(scope);

		QUnit.equal(warningTeardown(), 1, "gave warning");
		QUnit.equal(suggestionTeardown(), 0, "did not give suggestions");
	});

	testHelpers.dev.devOnlyTest("Variable not found warning should suggest correct keys", function () {
		var origGetPaths = Scope.prototype.getPathsForKey;
		Scope.prototype.getPathsForKey = function(key) {
			var paths = {};
			paths["foo/" + key] = {};
			paths["../bar/" + key] = {};
			return paths;
		};

		var considerTeardown = testHelpers.dev.willWarn(/bar.stache:1: Unable to find key "name".* Did you mean one of these\?/);
		var fooOptionTeardown = testHelpers.dev.willWarn(/"foo\/name" which will read from/);
		var barOptionTeardown = testHelpers.dev.willWarn(/"..\/bar\/name" which will read from/);

		stache('bar.stache', '<p>{{#with user}}{{name}}{{/with}}</p>')({
			name: 'app',
			user: {}
		});

		QUnit.equal(considerTeardown(), 1, 'got expected warning');
		QUnit.equal(fooOptionTeardown(), 1, 'got foo/name option');
		QUnit.equal(barOptionTeardown(), 1, 'got ../bar/name option');

		Scope.prototype.getPathsForKey = function(key) {
			var paths = {};
			paths["../baz/" + key] = {};
			return paths;
		};

		considerTeardown = testHelpers.dev.willWarn(/bar.stache:1: Unable to find key "name".* Did you mean\?/);
		var bazOptionTeardown = testHelpers.dev.willWarn(/"..\/baz\/name" which will read from/);

		stache('bar.stache', '<p>{{#with user}}{{name}}{{/with}}</p>')({
			name: 'app',
			user: {}
		});

		QUnit.equal(considerTeardown(), 1, 'got expected warning');
		QUnit.equal(bazOptionTeardown(), 1, 'got baz/name option');

		Scope.prototype.getPathsForKey = origGetPaths;
	});

	testHelpers.dev.devOnlyTest("Variable not found warning should suggest correct keys for nested properties (#519)", function () {
		var origGetPaths = Scope.prototype.getPathsForKey;
		Scope.prototype.getPathsForKey = function(key) {
			var paths = {};
			paths["foo/name.first"] = {};
			paths["../bar/name.first"] = {};
			return paths;
		};

		var considerTeardown = testHelpers.dev.willWarn(/bar.stache:1: Unable to find key "name.first".* Did you mean one of these\?/);
		var fooOptionTeardown = testHelpers.dev.willWarn(/"foo\/name.first" which will read from/);
		var barOptionTeardown = testHelpers.dev.willWarn(/"..\/bar\/name.first" which will read from/);

		stache('bar.stache', '<p>{{#with user}}{{name.first}}{{/with}}</p>')({
			name: {},
			user: {}
		});

		QUnit.equal(considerTeardown(), 1, 'got expected warning');
		QUnit.equal(fooOptionTeardown(), 1, 'got foo/name option');
		QUnit.equal(barOptionTeardown(), 1, 'got ../bar/name option');

		Scope.prototype.getPathsForKey = origGetPaths;

	});

	testHelpers.dev.devOnlyTest("Variable not found warning should suggest correct keys for functions (#529)", function () {
		var origGetPaths = Scope.prototype.getPathsForKey;
		Scope.prototype.getPathsForKey = function(key) {
			var paths = {};
			if (key === "name") {
				paths["foo/" + key + "()"] = {};
				paths["../bar/" + key + "()"] = {};
			}
			return paths;
		};

		var considerTeardown = testHelpers.dev.willWarn(/bar.stache:1: Unable to find key "name\(\)".* Did you mean one of these\?/);
		var fooOptionTeardown = testHelpers.dev.willWarn(/"foo\/name\(\)" which will read from/);
		var barOptionTeardown = testHelpers.dev.willWarn(/"..\/bar\/name\(\)" which will read from/);

		stache('bar.stache', '<p>{{#with user}}{{name()}}{{/with}}</p>')({
			name: function() { return 'app'; },
			user: {}
		});

		QUnit.equal(considerTeardown(), 1, 'got expected warning');
		QUnit.equal(fooOptionTeardown(), 1, 'got foo/name option');
		QUnit.equal(barOptionTeardown(), 1, 'got ../bar/name option');

		Scope.prototype.getPathsForKey = origGetPaths;

	});

	QUnit.test("Inverse {{if}} doesn't render truthy section when value is truthy", function(){
		var div = doc.createElement("div");
		var view = stache("{{^if(isTrue())}}did not work{{/if}}");
		var frag = view({
			isTrue: function() { return true; }
		});
		div.appendChild(frag);
		equal(innerHTML(div), "", "No textnode rendered");
	});

	QUnit.test("tag callbacks get called with directly nested data", function(){
		var expectedResult,
			testMessage;
		viewCallbacks.tag("directly-nested-test", function(el, tagData){
			QUnit.equal(tagData.directlyNested, expectedResult, testMessage);
		});

		expectedResult = true;
		stache(testMessage = "{{#if true}}<directly-nested-test/>{{/if}}")();

		expectedResult = true;
		stache(testMessage = "<directly-nested-test/>")();

		expectedResult = false;
		stache(testMessage = "<div><directly-nested-test/></div>")();

		expectedResult = true;
		stache(testMessage = "{{#if true}}<directly-nested-test>abc</directly-nested-test>{{/if}}")();

		expectedResult = true;
		stache(testMessage = "<directly-nested-test>abc</directly-nested-test>")();

		expectedResult = false;
		stache(testMessage = "<div><directly-nested-test>abc</directly-nested-test></div>")();

	});

	QUnit.test("Can call helpers (helper expressions) within attributes", function(){
		var vm = {
			name: function(first) { return first; }
		};
		var frag = stache("<div id='{{name \"matthew\"}}'></div>")(vm);
		QUnit.equal(frag.firstChild.getAttribute("id"), "matthew", "able to set the attribute");
	});

	test("#case and #default should not change context (#475)", function(){
		var template = stache("{{#switch(type)}}{{#case('admin')}}admin: {{name}}{{/case}}{{#default()}}peasant: {{name}}{{/default}}{{/switch}}");
		var map = new DefineMap({
			name: "Johnny",
			type: "admin"
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "admin: Johnny", "{{#case('Johnny')}}");
		map.type = "peasant";
		QUnit.equal(innerHTML(div), "peasant: Johnny", "{{#default()}}");
	});

	test("#case and #default with Helper Expressions should not change context (#475)", function(){
		var template = stache("{{#switch type}}{{#case 'admin'}}admin: {{name}}{{/case}}{{#default}}peasant: {{name}}{{/default}}{{/switch}}");
		var map = new DefineMap({
			name: "Johnny",
			type: "admin"
		});
		var div = doc.createElement("div");
		var frag = template(map);

		div.appendChild(frag);
		QUnit.equal(innerHTML(div), "admin: Johnny", "{{#case 'Johnny'}}");
		map.type = "peasant";
		QUnit.equal(innerHTML(div), "peasant: Johnny", "{{#default}}");
	});

	QUnit.test("Can use magic tags within attributes (#470)", function(){
		var vm = new DefineMap({
			name: ""
		});
		var frag = stache("<input value='{{name}}'>")(vm);
		QUnit.equal(frag.firstChild.value, "", "initially empty");

		vm.name = "matthew";
		QUnit.equal(frag.firstChild.value, "matthew", "set to matthew");

		frag.firstChild.value = "mark"
		QUnit.equal(frag.firstChild.value, "mark", "set to mark");

		vm.name = "paul";
		QUnit.equal(frag.firstChild.value, "paul", "set to paul");
	});

	testHelpers.dev.devOnlyTest("Can use magic tags within attributes without warnings (#477)", function(){
		var teardown = testHelpers.dev.willWarn(/Unable to find helper/);

		var vm = new DefineMap({ name: "" });
		stache("<input value='{{name}}'>")(vm);

		QUnit.equal(teardown(), 0, "no warning");
	});

	testHelpers.dev.devOnlyTest("{{data}} helper shows deprecation warning", function () {
		var teardown = testHelpers.dev.willWarn(/{{data}} helper has been deprecated; use {{domData}} instead/, function(message, matched) {
			if (matched) {
				ok(true, "received warning");
			}
		});

		stache("<span {{data('attr')}}></span>")();

		QUnit.equal(teardown(), 1, "Exactly one warning called");
	});

	test("missing partial error (#506)", function(){

		var map = new SimpleMap({});

		var renderer = stache("<div>{{>foo}}</div>");

		var frag = renderer(map);

		QUnit.ok(true, "no error");
		QUnit.equal( innerHTML(frag.firstChild), "", "no content");

		map.set("foo", function(){
			return "bar";
		});
		QUnit.equal( innerHTML(frag.firstChild), "bar", "updated to bar");
	});

	test("each should premptively bind values", function(){
		var calls = 0;
		var template = stache("{{#each(someMethod())}}<div/>{{/each}}");

		var value = new SimpleObservable(["a","b"]);

		var obs = new Observation(function(){
			calls++;
			return canReflect.getValue(value)
		});

		var methodCalls = 0;

		template({
			someMethod: function() {
				methodCalls++;
				return canReflect.getValue(obs)
			}
		});

		QUnit.equal(methodCalls, 1, "one method call");
		QUnit.equal(calls, 1, "one observation call");
	});

	QUnit.test("render objects with can.viewInsert symbol (#502)", function(assert) {
		var viewInsertSymbol = canSymbol.for("can.viewInsert");
		var objectWithSymbol = {};
		objectWithSymbol[viewInsertSymbol] = function() {
			return doc.createTextNode("Hello world");
		};
		var fragment = stache("<p>{{{objectWithSymbol}}}</p>")({
			objectWithSymbol: objectWithSymbol
		});

		// Basics look correct
		assert.equal(innerHTML(fragment.firstChild), "Hello world", "fragment has correct text content");
	});

	test("addHelper can take an object of helpers", function(){
		var helpers = {
			helperOne: function(){
				return "one";
			},
			helperTwo: function(){
				return "two";
			}
		};

		stache.addHelper(helpers);
		var template = stache("<span>{{helperOne()}}</span><span>{{helperTwo()}}</span>");
		var frag = template();

		var spanOne = frag.firstChild;
		var spanTwo = spanOne.nextSibling;

		QUnit.equal(spanOne.firstChild.nodeValue, "one");
		QUnit.equal(spanTwo.firstChild.nodeValue, "two");
	});

	test("addBindings takes a map of bindings", function(){
		var map = new Map();
		map.set("foo", function(el, attrData) {
			el.appendChild(DOCUMENT().createTextNode("foo"));
		});
		map.set(/bar/, function(el, attrData) {
			el.appendChild(DOCUMENT().createTextNode("bar"));
		});

		stache.addBindings(map);
		var template = stache("<span foo></span><span bar></span>");
		var frag = template();

		var firstSpan = frag.firstChild;
		var secondSpan = firstSpan.nextSibling;

		QUnit.equal(firstSpan.firstChild.nodeValue, "foo");
		QUnit.equal(secondSpan.firstChild.nodeValue, "bar");
	});

	test("addBindings will use can.callbackMap symbol if available.", function(){
		var map = new Map();
		map.set("foo2", function(el, attrData) {
			el.appendChild(DOCUMENT().createTextNode("foo"));
		});
		map.set(/bar2/, function(el, attrData) {
			el.appendChild(DOCUMENT().createTextNode("bar"));
		});

		var bindings = {
			bindings: map
		};
		bindings[canSymbol.for("can.callbackMap")] = map;
		stache.addBindings(bindings);

		var template = stache("<span foo2></span><span bar2></span>");
		var frag = template();

		var firstSpan = frag.firstChild;
		var secondSpan = firstSpan.nextSibling;

		QUnit.equal(firstSpan.firstChild.nodeValue, "foo");
		QUnit.equal(secondSpan.firstChild.nodeValue, "bar");
	});

	test("able to put in helpers without overwriting them", function(){
		var template = stache("{{foo()}}");

		var foo = function(){ return "foo" };
		var templateContext = new Scope.TemplateContext({
			helpers: {foo: foo}
		});
		var scope = new Scope( templateContext ).add({});

		template(scope, {
			helpers: {
				foo: function(){ return "bar" }
			}
		} );
		QUnit.equal( templateContext.helpers.get("foo"), foo );
	});

	QUnit.test("nested expressions get the right number of arguments (#581)", function(){
		stache.addHelper( "argumentsLength", function() {
			QUnit.equal(arguments.length, 2, "got the right number of arguments")
			return arguments.length;
		} );

		stache.addHelper( "echo", function(value) {
			return value;
		} );

		stache("<p>{{ echo( argumentsLength(0,1) ) }}</p>")();

	});

	// PUT NEW TESTS RIGHT BEFORE THIS!

}
