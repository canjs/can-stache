var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineList = require("can-define/list/list");
require("./-for-in");


QUnit.module("can-stache #each helper");

test("for-in basics", function(){

    var template = stache("<div>{{#for(value in list)}}<p>{{this.vmProp}}{{value}}</p>{{/for}}</div>");
    var list = new DefineList([34234,2,1,3]);
    var frag = template({
		list: list,
		vmProp: "1"
	});
    list.sort();
    // list.splice(0,4,1,2,3,34234);

    var order = [].map.call( frag.firstChild.getElementsByTagName("p"), function(p){
        return +p.innerHTML;
    });

    deepEqual(order, [11,12,13,134234]);
});
