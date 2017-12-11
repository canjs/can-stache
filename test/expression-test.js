var expression = require('../src/expression');
var QUnit = require('steal-qunit');
var Scope = require('can-view-scope');
var helpers = require('../helpers/converter');
var canReflect = require("can-reflect");
var SimpleObservable = require('can-simple-observable');
var SimpleMap = require('can-simple-map');
var DefineList = require('can-define/list/list');
var assign = require("can-assign");
var queues = require("can-queues");
var testHelpers = require('can-test-helpers');

QUnit.module("can-stache/src/expression");

QUnit.test("expression.tokenize", function(){
	var literals = "'quote' \"QUOTE\" 1 undefined null true false 0.1";
	var res = expression.tokenize(literals);

	deepEqual(res, literals.split(" "));

	var keys = "key foo.bar foo@bar %foo *foo foo/bar";
	res = expression.tokenize(keys);
	deepEqual(res, keys.split(" "));

	var syntax = "( ) , ~ =";
	res = expression.tokenize(syntax);
	deepEqual(res, syntax.split(" "));

	var curly = "{{ }}";
	res = expression.tokenize(curly);
	deepEqual(res, []);

	var bracket = "[foo] bar [baz]";
	res = expression.tokenize(bracket);
	deepEqual(res, ["[", "foo", "]", " ", "bar", " ", "[", "baz", "]", " "]);

});

test("expression.ast - helper followed by hash", function(){
	var ast = expression.ast("print_hash prop=own_prop");

	deepEqual(ast, {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "print_hash"
		},
		children: [
			{
				type: "Hashes",
				children: [
					{
						type: "Hash",
						prop: "prop",
						children: [{type: "Lookup", key: "own_prop"}]
					}
				]
			}
		]
	});

});

test("expression.ast - everything", function(){
	var ast = expression.ast("helperA helperB(1, valueA, propA=~valueB propC=2, 1).zed() 'def' nested@prop outerPropA=helperC(2,valueB)");

	var helperBCall = {
		type: "Call",
		method: {type: "Lookup", key: "@helperB"},
		children: [
			{type: "Literal", value: 1},
			{type: "Lookup", key: "valueA"},
			{
				type: "Hashes",
				children: [
					{
						type: "Hash",
						prop: "propA",
						children: [{type: "Arg", key: "~", children: [{type: "Lookup", key: "valueB"} ]}]
					},
					{
						type: "Hash",
						prop: "propC",
						children: [{type: "Literal", value: 2}]
					}
				]
			},
			{type: "Literal", value: 1}
		]
	};
	var helperCCall = {
		type: "Call",
		method: {type: "Lookup", key: "@helperC"},
		children: [
			{type: "Literal", value: 2},
			{type: "Lookup", key: "valueB"}
		]
	};

	deepEqual(ast, {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "helperA"
		},
		children: [
			{
				type: "Call",
				method: {
					type: "Lookup",
					root: helperBCall,
					key: "@zed"
				}
			},
			{type: "Literal", value: 'def'},
			{type: "Lookup", key: "nested@prop"},
			{
				type: "Hashes",
				children: [
					{
						type: "Hash",
						prop: "outerPropA",
						children: [helperCCall]
					}
				]
			}
		]
	});
});

test("expression.parse - everything", function(){

	var exprData = expression.parse("helperA helperB(1, valueA, propA=~valueB propC=2, 1).zed 'def' nested.prop() outerPropA=helperC(2,valueB)");

	var oneExpr = new expression.Literal(1),
		twoExpr = new expression.Literal(2),
		def = new expression.Literal('def'),

		valueA = new expression.Lookup("valueA"),
		valueB = new expression.Lookup("valueB"),

		helperA = new expression.Lookup("helperA"),
		helperB = new expression.Lookup("@helperB"),
		helperC = new expression.Lookup("@helperC");

	var helperBHashArg = new expression.Hashes({
		propA: new expression.Arg(valueB, {compute: true}),
		propC: twoExpr
	});

	var callHelperB = new expression.Call(
		helperB,
		[oneExpr, valueA, helperBHashArg, oneExpr]
	);

	var callHelperBdotZed = new expression.Lookup("zed", callHelperB);

	var callNestedProp = new expression.Call(
		new expression.Lookup("nested@prop"),
		[],
		{}
	);

	var callHelperC = new expression.Call(
		helperC,
		[twoExpr, valueB],
		{}
	);

	var callHelperA = new expression.Helper(
		helperA,
		[callHelperBdotZed, def, callNestedProp],
		{
			outerPropA: callHelperC
		}
	);

	deepEqual(callHelperB, exprData.argExprs[0].rootExpr, "call helper b");

	deepEqual(callHelperC, exprData.hashExprs.outerPropA, "helperC call");

	deepEqual(callHelperBdotZed, exprData.argExprs[0], "call helper b.zed");

	var expectedArgs = [callHelperBdotZed, def, callNestedProp];
	canReflect.each(exprData.argExprs, function(arg, i){
		deepEqual(arg, expectedArgs[i], "helperA arg["+i+"]");
	});

	deepEqual(exprData, callHelperA, "full thing");
});

test("expression.parse(str, {lookupRule: 'method', methodRule: 'call'})",
		 function(){

	var exprData = expression.parse("withArgs content=content", {
		lookupRule: "method",
		methodRule: "call"
	});

	var valueContent = new expression.Lookup("content");
	var hashArg = new expression.Arg(new expression.Hashes({
		content: valueContent
	}));

	equal(exprData.argExprs.length, 1, "there is one arg");
	deepEqual(exprData.argExprs[0], hashArg, "correct hashes");
});

test("numeric expression.Literal", function(){
	var exprData = expression.parse("3");

	var result = new expression.Literal(3);
	deepEqual( exprData, result);

});

test("expression.Helper:value non-observable values", function(){
	// {{fullName 'marshall' 'thompson'}}

	var scope = new Scope({
		fullName: function(first, last){
			return first+" "+last;
		}
	});

	var callFullName = new expression.Helper(
		new expression.Lookup("fullName"),
		[new expression.Literal('marshall'), new expression.Literal('thompson')],
		{}
	);

	var result = callFullName.value(scope, new Scope({}),  {});

	equal(expression.toComputeOrValue(result)(), "marshall thompson");
});

test("expression.Helper:value observable values", function(){
	// {{fullName first 'thompson'}}
	var obj = {
		fullName: function(first, last){
			QUnit.equal(this, obj, "this is right");
			return first()+" "+last;
		},
		first: new SimpleObservable("marshall")
	};
	var scope = new Scope(obj);

	var callFullName = new expression.Helper(
		new expression.Lookup("fullName"),
		[new expression.Lookup("first"), new expression.Literal('thompson')],
		{}
	);

	var result = callFullName.value(scope, new Scope({}) );

	equal(result(), "marshall thompson");
});

test("methods can return values (#1887)", function(){
	var MyMap = SimpleMap.extend({
		getSomething: function(arg){
			return this.attr("foo") + arg();
		}
	});

	var scope =
		new Scope(new MyMap({foo: 2, bar: 3}));

	var callGetSomething = new expression.Helper(
		new expression.Lookup("getSomething"),
		[new expression.Lookup("bar")],
		{}
	);

	var result = callGetSomething.value(scope, new Scope({}), {asCompute: true});

	equal(result(), 5);
});

test("methods don't update correctly (#1891)", function(){
	var map = new SimpleMap({
	  num: 1
	});
	assign(map,{
  	  num2: function () {
  	    return this.get('num') * 2;
  	  },
  	  runTest: function () {
  	    this.attr('num', this.get('num') * 2);
  	  }
    });
	var scope =
		new Scope(map);

	var num2Expression = new expression.Lookup("num2");
	var num2 = num2Expression.value( scope, {asCompute: true} );

	canReflect.onValue(num2,function(){});


	map.runTest();

	var func = canReflect.getValue( num2 );
	equal( func() , 4, "num2 updated correctly");

});

test("call expressions called with different scopes give different results (#1791)", function(){
	var exprData = expression.parse("doSomething(number)");

	var res = exprData.value(new Scope({
		doSomething: function(num){
			return num*2;
		},
		number: new SimpleObservable(2)
	}));

	equal( res.get(), 4);

	res = exprData.value(new Scope({
		doSomething: function(num){
			return num*3;
		},
		number: new SimpleObservable(4)
	}));

	equal( res.get(), 12);
});

test("convertKeyToLookup", function(){

	equal( expression.convertKeyToLookup("../foo"), "../@foo" );
	equal( expression.convertKeyToLookup("foo"), "@foo" );
	equal( expression.convertKeyToLookup(".foo"), "@foo" );
	equal( expression.convertKeyToLookup("./foo"), "./@foo" );
	equal( expression.convertKeyToLookup("foo.bar"), "foo@bar" );

});


test("expression.ast - [] operator", function(){
	deepEqual(expression.ast("['propName']"), {
		type: "Bracket",
		children: [{type: "Literal", value: "propName"}]
	}, "['propName'] valid");

	deepEqual(expression.ast("[propName]"), {
    	type: "Bracket",
    	children: [{type: "Lookup", key: "propName"}]
	}, "[propName] valid");

	deepEqual(expression.ast("foo['bar']"), {
	    type: "Bracket",
			root: {type: "Lookup", key: "foo"},
	    children: [{type: "Literal", value: "bar"}]
	}, "foo['bar'] valid");

	deepEqual(expression.ast("foo[bar]"), {
	    type: "Bracket",
			root: {type: "Lookup", key: "foo"},
	    children: [{type: "Lookup", key: "bar"}]
	}, "foo[bar] valid");

	deepEqual(expression.ast("foo[bar()]"), {
    type: "Bracket",
		root: {type: "Lookup", key: "foo"},
    children: [{type: "Call", method: {key: "@bar", type: "Lookup" }}]
	}, "foo[bar()] valid");

	deepEqual(expression.ast("foo()[bar]"), {
		type: "Bracket",
		root: {type: "Call", method: {key: "@foo", type: "Lookup" } },
		children: [{type: "Lookup", key: "bar"}]
	}, "foo()[bar] valid");

	deepEqual(expression.ast("foo [bar]"), {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "foo"
		},
		children: [{
			type: "Bracket",
			children: [{type: "Lookup", key: "bar"}]
		}]
	}, "foo [bar] valid");

	deepEqual(expression.ast("eq foo['bar'] 'foo'"), {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "eq"
		},
		children: [{
			type: "Bracket",
			root: {type: "Lookup", key: "foo"},
			children: [{type: "Literal", value: "bar"}]
		},
		{
			type: "Literal",
			value: "foo"
		}]
	},
	"eq foo['bar'] 'foo' valid"
	);

	deepEqual(expression.ast("eq foo[bar] foo"), {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "eq"
		},
		children: [{
			type: "Bracket",
			root: {type: "Lookup", key: "foo"},
			children: [{type: "Lookup", key: "bar"}]
		},
		{
			type: "Lookup",
			key: "foo"
		}]
	}, "eq foo[bar] foo valid");

	deepEqual(expression.ast("foo[bar][baz]"), {
		type: "Bracket",
		root: {
				type: "Bracket",
				root: {type: "Lookup", key: "foo"},
				children: [{type: "Lookup", key: "bar"}]
		},
		children: [{type: "Lookup", key: "baz"}]
	}, "foo[bar][baz] valid");

	deepEqual(expression.ast("foo[bar].baz"), {
		type: "Lookup",
		key: "baz",
		root: {
			type: "Bracket",
			root: {type: "Lookup", key: "foo"},
			children: [{type: "Lookup", key: "bar"}]
		}
	}, "foo[bar].baz");

	deepEqual(expression.ast("eq foo[bar].baz xyz"), {
		type: "Helper",
		method: {
			type: "Lookup",
			key: "eq"
		},
		children: [{
			type: "Lookup",
			key: "baz",
			root: {
				type: "Bracket",
				root: {type: "Lookup", key: "foo"},
				children: [{type: "Lookup", key: "bar"}]
			}
		},
		{
			type: "Lookup",
			key: "xyz"
		}]
	}, "eq foo[bar].baz xyz");
});

test("expression.parse - [] operator", function(){
	deepEqual(expression.parse("['propName']"),
		new expression.Bracket(
			new expression.Literal('propName')
		),
		"['propName']"
	);

	deepEqual(expression.parse("[propName]"),
		new expression.Bracket(
			new expression.Lookup('propName')
		),
		"[propName]"
	);

	deepEqual(expression.parse("foo['bar']"),
		new expression.Bracket(
			new expression.Literal('bar'),
			new expression.Lookup('foo')
		),
		"foo['bar']"
	);

	deepEqual(expression.parse("foo[bar]"),
		new expression.Bracket(
			new expression.Lookup('bar'),
			new expression.Lookup('foo')
		),
		"foo[bar]"
	);

	deepEqual(expression.parse("foo()[bar]"),
		new expression.Bracket(
			new expression.Lookup('bar'),
			new expression.Call(
				new expression.Lookup('@foo'),
				[],
				{}
			)
		),
		"foo()[bar]"
	);

	var exprData = expression.parse("foo[bar()]");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Call(
				new expression.Lookup('@bar'),
				[],
				{}
			),
			new expression.Lookup('foo')
		)
	);

	exprData = expression.parse("foo()[bar()]");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Call(
				new expression.Lookup("@bar"),
				[],
				{}
			),
			new expression.Call(
				new expression.Lookup("@foo"),
				[],
				{}
			)
		)
	);
});

test("Bracket expression", function(){
	// ["bar"]
	var expr = new expression.Bracket(
		new expression.Literal("bar")
	);
	var compute = expr.value(
		new Scope(
			new SimpleMap({bar: "name"})
		)
	);
	equal(compute.get(), "name");

	// [bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar")
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({bar: "name", name: "Kevin"})
		)
	);
	equal(compute.get(), "Kevin");

	// foo["bar"]
	expr = new expression.Bracket(
		new expression.Literal("bar"),
		new expression.Lookup("foo")
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({foo: {bar: "name"}})
		)
	);
	equal(compute.get(), "name");

	// foo["bar.baz"]
	expr = new expression.Bracket(
		new expression.Literal("bar.baz"),
		new expression.Lookup("foo")
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({foo: {"bar.baz": "name"}})
		)
	);
	equal(compute.get(), "name",'foo["bar.baz"]');

	// foo[bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar"),
		new expression.Lookup("foo")
	);
	var state = new SimpleMap({foo: new SimpleMap({name: "Kevin"}), bar: "name"});
	compute = expr.value(
		new Scope(
			state
		)
	);
	equal(compute.get(), "Kevin", "foo[bar] get");

	compute.set("Curtis");
	equal(state.get("foo").get("name"), "Curtis");

	// foo()[bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar"),
		new expression.Call(
			new expression.Lookup("@foo"),
			[],
			{}
		)
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({foo: function() { return {name: "Kevin"}; }, bar: "name"})
		)
	);
	equal(compute.get(), "Kevin");

	// foo[bar()]
	expr = new expression.Bracket(
		new expression.Call(
			new expression.Lookup('@bar'),
			[],
			{}
		),
		new expression.Lookup('foo')
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({
				foo: {name: "Kevin"},
				bar: function () { return "name"; }
			})
		)
	);
	equal(compute.get(), "Kevin");

	// foo()[bar()]
	expr = new expression.Bracket(
		new expression.Call(
			new expression.Lookup("@bar"),
			[],
			{}
		),
		new expression.Call(
			new expression.Lookup("@foo"),
			[],
			{}
		)
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({
				foo: function() { return {name: "Kevin"}; },
				bar: function () { return "name"; }
			})
		)
	);
	equal(compute.get(), "Kevin");

	// foo([bar])
	expr = new expression.Call(
			new expression.Lookup('@foo'),
			[
				new expression.Bracket(
					new expression.Lookup('bar')
				)
			],
			{}
	);
	compute = expr.value(
		new Scope(
			new SimpleMap({
				foo: function(val) { return val + '!'; },
				bar: 'name',
				name: 'Kevin'
			})
		)
	);
	equal(compute.get(), "Kevin!");
});

QUnit.test("registerConverter helpers push and pull correct values", function () {

	helpers.registerConverter('numberToHex', {
		get: function(valCompute) {
			return valCompute().toString(16);
		}, set: function(val, valCompute) {
			return valCompute(parseInt("0x" + val));
		}
	});

	var data = new SimpleMap({
		observeVal: 255
	});
	var scope = new Scope( data );
	var parentExpression = expression.parse("numberToHex(~observeVal)",{baseMethodType: "Call"});

	var twoWayCompute = parentExpression.value(scope);
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute.get(), 'ff', 'Converter called');
	twoWayCompute.set('7f');
	equal(data.get("observeVal"), 127, 'push converter called');
});

QUnit.test("registerConverter helpers push and pull multiple values", function () {

	helpers.registerConverter('isInList', {
		get: function(valCompute, list) {
			return !!~list.indexOf(valCompute());
		}, set: function(newVal, valCompute, list) {
			if(!~list.indexOf(newVal)) {
				list.push(newVal);
			}
		}
	});

	var data = new SimpleMap({
		observeVal: 4,
		list: new DefineList([1,2,3])
	});
	var scope = new Scope( data );
	var parentExpression = expression.parse("isInList(~observeVal, list)",{baseMethodType: "Call"});
	var twoWayCompute = parentExpression.value(scope);
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute.get(), false, 'Converter called');
	twoWayCompute.set(5);
	deepEqual(data.attr("list").attr(), [1,2,3,5], 'push converter called');
});


QUnit.test("registerConverter helpers are chainable", function () {

	helpers.registerConverter('numberToHex', {
		get: function(valCompute) {
			return valCompute().toString(16);
		}, set: function(val, valCompute) {
			return valCompute(parseInt("0x" + val));
		}
	});

	helpers.registerConverter('upperCase', {
		get: function(valCompute) {
			return valCompute().toUpperCase();
		}, set: function(val, valCompute) {
			return valCompute(val.toLowerCase());
		}
	});


	var data = new SimpleMap({
		observeVal: 255
	});
	var scope = new Scope( data );

	var parentExpression = expression.parse("upperCase(~numberToHex(~observeVal))",{baseMethodType: "Call"});
	var twoWayCompute = parentExpression.value(scope);
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute.get(), 'FF', 'Converter called');
	twoWayCompute.set('7F');
	equal(data.attr("observeVal"), 127, 'push converter called');
});

test('foo().bar', function() {
	// expression.ast
	var ast4 = expression.ast("foo().bar");

	deepEqual(ast4, {
		type: "Lookup",
		key: "bar",
		root: {type: "Call", method: {key: "@foo", type: "Lookup" } }
	});

	// expression.parse
	var exprData = expression.parse("foo().bar");
	deepEqual(exprData,
		new expression.Lookup(
			"bar",
			new expression.Call( new expression.Lookup("@foo"), [], {} )
		)
	);

	// expr.value
	var expr = new expression.Lookup(
		"bar",
		new expression.Call( new expression.Lookup("@foo"), [], {} )
	);
	var compute = expr.value(
		new Scope(
			new SimpleMap({foo: function() { return {bar: "Kevin"}; }})
		)
	);
	equal(compute.get(), "Kevin");
});

test("Helper with a ~ key operator (#112)", function() {
	var ast = expression.ast('each ~foo');

	var expected = {
		type: "Helper",
		method: {type: "Lookup", key: "each"},
		children: [{type: "Arg", key: "~", children: [{type: "Lookup", key: "foo"} ]}]
	};

	QUnit.deepEqual(ast, expected);

});

test("ast with [double][brackets] or [bracket].prop (#207)", function(){

	var ast = expression.ast("test['foo'][0]");

	var expected = {
		type: "Bracket",
		children: [{type: "Literal", value: 0}],
		root: {
			type: "Bracket",
			children: [{type: "Literal", value: 'foo'}],
			root: {type: "Lookup", key: "test"}
		}
	};

	QUnit.deepEqual(ast, expected);

	ast = expression.ast("test['foo'].zed");

	expected = {
		type: "Lookup",
		key: "zed",
		root: {
			type: "Bracket",
			children: [{type: "Literal", value: 'foo'}],
			root: {type: "Lookup", key: "test"}
		}
	};


	QUnit.deepEqual(ast, expected);

	ast = expression.ast("test['foo'].zed['bar']");

	expected = {
		type: "Bracket",
		children: [{type: "Literal", value: 'bar'}],
		root: {
			type: "Lookup",
			key: "zed",
			root: {
				type: "Bracket",
				children: [{type: "Literal", value: 'foo'}],
				root: {type: "Lookup", key: "test"}
			}
		}
	};


	QUnit.deepEqual(ast, expected);


});

testHelpers.dev.devOnlyTest("All expression types have sourceText on prototype", function(){
	["Arg", "Bracket", "Call",  "Hashes", "Helper", "Literal"].forEach(function(name){
		QUnit.ok(typeof expression[name].prototype.sourceText === "function", name);
	});
});


testHelpers.dev.devOnlyTest("expression.sourceText - everything", function(){
	var source = "helperA helperB(1,valueA,propA=~valueB propC=2,1).zed \"def\" nested.prop() outerPropA=helperC(2,valueB)"
	var exprData = expression.parse(source);
	QUnit.equal(exprData.sourceText(),source);
});

test('Call Expressions can return functions instead of Observations', function() {
	var data = new SimpleMap({
		name: "kevin",
		foo: function() {
			return this.get("name");
		}
	});

	var expr = new expression.Call( new expression.Lookup("@foo"), [], {} );

	var val = new SimpleObservable(
		expr.value( new Scope( data ) )
	);

	equal(canReflect.getValue(val.value), "kevin", "got correct initial value");

	ok(canReflect.isObservableLike(val.value), "value is observable by default");
	canReflect.onValue(val.value, function(newVal) {
		equal(newVal, "mark", "got correct changed value");
	});

	data.set("name", "mark");

	var nonBindingVal = new SimpleObservable(
		expr.value( new Scope( data ), {
			doNotWrapInObservation: true
		})
	);

	equal(canReflect.getValue(nonBindingVal.value), "mark", "got correct initial value");
	ok(!canReflect.isObservableLike(nonBindingVal.value), "value is not observable when doNotWrapInObservation is true");
});
