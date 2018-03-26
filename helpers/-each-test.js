var QUnit = require("steal-qunit");
var stache = require("can-stache");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var queues = require("can-queues");

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


QUnit.test("#each throws error (can-stache-bindings#444)", function(){
    var list = new DefineList([
        {name: 'A'},
        {name: 'B'},
        {name: 'C'}
    ]);
    var data = new DefineMap({
        list: list,
        item : list[1]
    });

    var template = stache(

        "<div>"+
        // The space after }} is important here
            "{{#each list}} "+
            "{{^is(., ../item)}}"+
            "<div>{{name}}</div>"+
            "{{/is}}"+
            "{{/each}}"+
        "</div>");

    template(data);


    queues.batch.start();
    queues.mutateQueue.enqueue(function clearItemAndSplice() {

      this.item = null;
      this.list.splice(1, 1);
    }, data, []);
    queues.batch.stop();

    QUnit.ok(true, "no errors");
});
