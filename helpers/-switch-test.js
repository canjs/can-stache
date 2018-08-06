var QUnit = require("steal-qunit");
var SimpleMap = require('can-simple-map');
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
var queues = require("can-queues");
var nodeLists = require('can-view-nodelist');

QUnit.module("can-stache #switch");

var innerHTML = function(node){
	return "innerHTML" in node ?
		node.innerHTML :
		undefined;
};

var getText = function(template, data, options){
		var div = document.createElement("div");
		div.appendChild( stache(template)(data, options) );
		return cleanHTMLTextForIE( innerHTML(div) );
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

QUnit.test("Handlebars helper: switch/case", function() {
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

QUnit.test("Handlebars helper: switch - changing to default (#1857)", function(){
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

QUnit.test("#switch, #case, and #default work with call expressions", function(){
	var template = stache("{{#switch(type)}}{{#case('admin')}}admin{{/case}}{{#default()}}peasant{{/default}}{{/switch}}");
	var map = new DefineMap({
		type: "admin"
	});
	var div = document.createElement("div");
	var frag = template(map);

	div.appendChild(frag);
	QUnit.equal(innerHTML(div), "admin");
	map.type = "peasant";
	QUnit.equal(innerHTML(div), "peasant");
});


QUnit.test("#case and #default should not change context (#475)", function(){
	var template = stache("{{#switch(type)}}{{#case('admin')}}admin: {{name}}{{/case}}{{#default()}}peasant: {{name}}{{/default}}{{/switch}}");
	var map = new DefineMap({
		name: "Johnny",
		type: "admin"
	});
	var div = document.createElement("div");
	var frag = template(map);

	div.appendChild(frag);
	QUnit.equal(innerHTML(div), "admin: Johnny", "{{#case('Johnny')}}");
	map.type = "peasant";
	QUnit.equal(innerHTML(div), "peasant: Johnny", "{{#default()}}");
});

QUnit.test("#case and #default with Helper Expressions should not change context (#475)", function(){
	var template = stache("{{#switch type}}{{#case 'admin'}}admin: {{name}}{{/case}}{{#default}}peasant: {{name}}{{/default}}{{/switch}}");
	var map = new DefineMap({
		name: "Johnny",
		type: "admin"
	});
	var div = document.createElement("div");
	var frag = template(map);

	div.appendChild(frag);
	QUnit.equal(innerHTML(div), "admin: Johnny", "{{#case 'Johnny'}}");
	map.type = "peasant";
	QUnit.equal(innerHTML(div), "peasant: Johnny", "{{#default}}");
});

QUnit.test("Re-evaluating a case in a switch (#1988)", function(){
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

QUnit.test("nested switch statement fail (#2188)", function(){

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

QUnit.test("nested switch works if no default is selected (#576)", function(){

	var template = stache(
		"{{# switch(page)}}"+
			"{{# case 'main-menu'}} Main Menu {{/ case}}"+
			"{{# case 'a-page'}}"+
				"{{# switch(action) }}"+
					"{{# case 'index'}} List Page {{/ case }}"+
				"{{/ switch}}"+
			"{{/ case}}"+
		"{{/ switch}}");

	var viewModel = new DefineMap({
		page: "a-page",
		action: "index"
	});
	//nodeLists._debug = true;
	var frag = template(viewModel);
	document.body.appendChild(frag);
	//var nodeList = nodeLists.getNodeLists("switch(page)")[0];
	//nodeLists.logNodeList(nodeList);
	//debugger;
	//console.log("action");
	viewModel.action = undefined;
	//console.log("page");
	//queues.log("flush");
	viewModel.page = "main-menu";
});
