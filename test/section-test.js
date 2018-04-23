var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");
var define = require("can-define");

QUnit.module("can-stache - {{#section}} tests");

QUnit.test("function values treated the same", function(assert){
    var obj = {func: function(){ return "Hello"; }};

    var inHTML = stache("<div>{{#func}}FN{{/func}}</div>");
    var res = inHTML(obj);
    assert.equal(res.firstChild.innerHTML, "FN", "works in HTML");

    var inTag = stache("<div {{#func}}FN{{/func}}></div>");
    var frag = inTag(obj);
    assert.ok(frag.firstChild.hasAttribute("FN"));
    assert.notOk(frag.firstChild.hasAttribute("FN"));
});
