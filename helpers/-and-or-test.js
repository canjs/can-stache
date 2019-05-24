var QUnit = require("steal-qunit");
var stache = require("can-stache");
var SimpleMap = require("can-simple-map");
var canReflect = require("can-reflect");
var Observation = require("can-observation");

var stacheTestHelpers = require("../test/helpers")(document);

QUnit.module("can-stache and/or helper");



QUnit.test("and standalone", function(){

	var renders = [];
	var view = stache("<div>{{#and(a,b)}}{{truthy(this)}}{{else}}{{falsey(this)}}{{/and}}</div>");

	var map = new SimpleMap({
		a: 1,
		b: 1
	});

	map.set("truthy", function(that){
		QUnit.equal(that, map, "truthy this is right");
		renders.push("truthy");
		return "truthy";
	});
	map.set("falsey", function(that){
		QUnit.equal(that, map, "falsey this is right");
		renders.push("falsey");
		return "falsey";
	});
	var frag = view(map);
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "1,1" );

	// 2,2 ... stays truthy
	canReflect.assign(map, {
		a: 2,
		b: 2
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "2,2" );
	QUnit.deepEqual(renders,["truthy"], "2,2 render");
	renders = [];

	// 0,2
	canReflect.assign(map, {
		a: 0,
		b: 2
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "0,2" );
	QUnit.deepEqual(renders,["falsey"], "0,2 render");
	renders = [];

	// false, ""
	canReflect.assign(map, {
		a: false,
		b: ""
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "false,''" );
	QUnit.deepEqual(renders,[]);
});

QUnit.test("and as call expression", function(){

	var renders = [];
	var view = stache("<div>{{#eq( and(a,b), c) }}{{truthy(this)}}{{else}}{{falsey(this)}}{{/eq}}</div>");

	var map = new SimpleMap({
		a: 1,
		b: 1,
		c: 1
	});

	map.set("truthy", function(that){
		QUnit.equal(that, map, "truthy this is right");
		renders.push("truthy");
		return "truthy";
	});
	map.set("falsey", function(that){
		QUnit.equal(that, map, "falsey this is right");
		renders.push("falsey");
		return "falsey";
	});
	var frag = view(map);
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "(1 && 1 ) === 1" );

	// 2,2 ... stays truthy
	canReflect.assign(map, {
		a: 2,
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "(2 && 1 ) === 1" );
	QUnit.deepEqual(renders,["truthy"]);
	renders = [];

	// 2,0
	canReflect.assign(map, {
		a: 2,
		b: 0
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "(2 && 0 ) === 1" );
	QUnit.deepEqual(renders,["falsey"]);
	renders = [];

	// false, ""
	canReflect.assign(map, {
		a: false,
		b: ""
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "(false && '' ) === 1" );
	QUnit.deepEqual(renders,[]);
});


QUnit.test("or standalone", function(){

	var renders = [];
	var view = stache("<div>{{#or(a,b)}}{{truthy(this)}}{{else}}{{falsey(this)}}{{/or}}</div>");

	var map = new SimpleMap({
		a: 1,
		b: 1
	});

	map.set("truthy", function(that){
		QUnit.equal(that, map, "truthy this is right");
		renders.push("truthy");
		return "truthy";
	});
	map.set("falsey", function(that){
		QUnit.equal(that, map, "falsey this is right");
		renders.push("falsey");
		return "falsey";
	});
	var frag = view(map);
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "1,1" );

	// 2,2 ... stays truthy
	canReflect.assign(map, {
		a: 0,
		b: 2
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "truthy", "0,2" );
	QUnit.deepEqual(renders,["truthy"], "0,2 render");
	renders = [];

	// 0,2
	canReflect.assign(map, {
		a: 0,
		b: 0
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "0,0" );
	QUnit.deepEqual(renders,["falsey"], "0,0 render");
	renders = [];

	// false, ""
	canReflect.assign(map, {
		a: false,
		b: ""
	});
	QUnit.equal( stacheTestHelpers.cloneAndClean(frag).firstChild.innerHTML, "falsey", "false,''" );
	QUnit.deepEqual(renders,[]);
});

QUnit.test("and is lazy", function(){
	var view = stache("<div>{{#and(this.isFalse, this.shouldNotBeRead)}}TRUE{{else}}FALSE{{/and}}</div>");

	var fragment = view({
		isFalse: false,
		shouldNotBeRead: new Observation(function avoidReadingThis(){
			QUnit.ok(false, "should not be read");
		})
	});

	QUnit.equal(stacheTestHelpers.cloneAndClean(fragment).firstChild.innerHTML,"FALSE", "evaled to false");

	view = stache("<div>{{#and(this.isFalse, this.functionCall() )}}TRUE{{else}}FALSE{{/and}}</div>");

	fragment = view({
		isFalse: false,
		functionCall: function(){
			QUnit.ok(false, "should not be read");
		}
	});

	QUnit.equal(stacheTestHelpers.cloneAndClean(fragment).firstChild.innerHTML,"FALSE", "evaled to false");
});
