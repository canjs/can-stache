var testHelpers = require('can-test-helpers');
var stache = require('../can-stache');
var DefineMap = require("can-define/map/map");

QUnit.module("can-stache: filename");

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

testHelpers.dev.devOnlyTest("work in a text section (#628)", function() {
	var teardown = testHelpers.dev.willWarn(/filename.stache:1: Unable to find key/);
	stache("filename.stache", "<div class='{{aValue}}'></div>")();
	QUnit.equal(teardown(), 1, "{{#if someCondition}}");
});


testHelpers.dev.devOnlyTest("scope has filename", function(){
	var template = stache('some-file', '{{scope.filename}}');
	var frag = template();

	equal(frag.firstChild.nodeValue, 'some-file');
});

testHelpers.dev.devOnlyTest("scope has correct filename after calling a partial", function(){
	var innerTemplate = stache('some-partial', '<span>{{scope.filename}}</span>');
	var outerTemplate = stache('some-file', '{{#if foo}}{{scope.filename}}{{/if}}{{>somePartial}}');
	var vm = new DefineMap();
	var frag = outerTemplate(vm, {
		partials: {
			somePartial: innerTemplate
		}
	});
	vm.set('foo', 'bar');

	equal(frag.firstChild.nodeValue, 'some-file');
	equal(frag.firstChild.nextSibling.firstChild.nodeValue, 'some-partial');
});
