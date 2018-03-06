var QUnit = require('steal-qunit');
var SimpleMap = require('can-simple-map');
var stache = require('can-stache');
QUnit.module("can-stache nodeList");

QUnit.test("nodeList not cleaned (#486)", function(){
    var template = stache("<div>"+
	  "{{#showHome}}"+
		  "<h1> home </h1>"+
	  "{{else}}"+
		 "{{#if(startsFalse)}}"+
          "{{other}}"+
        "{{/if}}"+
	  "{{/eq}}"+
	"</div>");

    var state = new SimpleMap({
        showHome: false,
        startsFalse: false
    });

    template(state);

    state.set("showHome", true);
    state.set("startsFalse", true);

    QUnit.ok(true,"no errors at this point");
});
