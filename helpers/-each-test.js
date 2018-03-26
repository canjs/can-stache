var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineList = require("can-define/list/list");

QUnit.module("can-stache #each helper");

test("each with sort (#498)", function(){
    var template = stache("<div>{{#each(list)}}<p>{{.}}</p>{{/each}}</div>");
    var list = new DefineList([34234,2,1,3]);

    var frag = template({list: list});

    list.sort();
    // list.splice(0,4,1,2,3,34234);

    var order = [].map.call( frag.firstChild.getElementsByTagName("p"), function(p){
        return +p.firstChild.nodeValue;
    });

    deepEqual(order, [1,2,3,34234]);
});
