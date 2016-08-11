var expression = require('../src/expression');
var QUnit = require('steal-qunit');
var each = require('can-util/js/each/each');
var Scope = require('can-view-scope');
var canCompute = require('can-compute');
var CanMap = require('can-map');
var helpers = require('../helpers/converter');

QUnit.module("can-stache/src/expression");


test("expression.tokenize", function(){
	var literals = "'quote' \"QUOTE\" 1 undefined null true false 0.1";
	var res = expression.tokenize(literals);

	deepEqual(res, literals.split(" "));

	var keys = "key foo.bar foo@bar %foo *foo foo/bar foo:bar";
	res = expression.tokenize(keys);
	deepEqual(res, keys.split(" "));

	var syntax = "( ) , ~ =";
	res = expression.tokenize(syntax);
	deepEqual(res, syntax.split(" "));

	var curly = "{{ }}";
	res = expression.tokenize(curly);
	deepEqual(res, []);

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

	var exprData = expression.parse("helperA helperB(1, valueA, propA=~valueB propC=2, 1).zed 'def' nested@prop outerPropA=helperC(2,valueB)");

	var oneExpr = new expression.Literal(1),
		twoExpr = new expression.Literal(2),
		def = new expression.Literal('def'),

		valueA = new expression.ScopeLookup("valueA"),
		valueB = new expression.ScopeLookup("valueB"),
		nested = new expression.HelperScopeLookup("nested@prop"),

		helperA = new expression.HelperLookup("helperA"),
		helperB = new expression.Lookup("@helperB"),
		helperC = new expression.Lookup("@helperC");

	var helperBHashArg = new expression.Hashes({
		propA: new expression.Arg(valueB, {compute: true}),
		propC: twoExpr
	})

	var callHelperB = new expression.Call(
		helperB,
		[oneExpr, valueA, helperBHashArg, oneExpr]
	);

	var callHelperBdotZed = new expression.ScopeLookup(".zed", callHelperB);

	var callHelperC = new expression.Call(
		helperC,
		[twoExpr, valueB],
		{}
	);

	var callHelperA = new expression.Helper(
		helperA,
		[callHelperBdotZed, def, nested],
		{
			outerPropA: callHelperC
		}
	);

	deepEqual(callHelperB, exprData.argExprs[0].rootExpr, "call helper b");

	deepEqual(callHelperC, exprData.hashExprs.outerPropA, "helperC call");

	deepEqual(callHelperBdotZed, exprData.argExprs[0], "call helper b.zed");

	var expectedArgs = [callHelperBdotZed, def, nested];
	each(exprData.argExprs, function(arg, i){
		deepEqual(arg, expectedArgs[i], "helperA arg["+i);
	});


	deepEqual( exprData, callHelperA, "full thing");
});

test("expression.parse(str, {lookupRule: 'method', methodRule: 'call'})",
		 function(){

	var exprData = expression.parse("withArgs content=content", {
		lookupRule: "method",
		methodRule: "call"
	});

	var valueContent = new expression.ScopeLookup("content");
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
		new expression.HelperLookup("fullName"),
		[new expression.Literal('marshall'), new expression.Literal('thompson')],
		{}
	);

	var result = callFullName.value(scope, new Scope({}),  {});

	equal(result, "marshall thompson");
});

test("expression.Helper:value observable values", function(){
	// {{fullName first 'thompson'}}

	var scope = new Scope({
		fullName: function(first, last){
			return first()+" "+last;
		},
		first: canCompute("marshall")
	});

	var callFullName = new expression.Helper(
		new expression.HelperLookup("fullName"),
		[new expression.HelperLookup("first"), new expression.Literal('thompson')],
		{}
	);

	var result = callFullName.value(scope, new Scope({}) );

	equal(result(), "marshall thompson");
});

test("methods can return values (#1887)", function(){
	var MyMap = CanMap.extend({
		getSomething: function(arg){
			return this.attr("foo") + arg();
		}
	});

	var scope =
		new Scope(new MyMap({foo: 2, bar: 3}))
			.add({});

	var callGetSomething = new expression.Helper(
		new expression.HelperLookup("getSomething"),
		[new expression.ScopeLookup("bar")],
		{}
	);

	var result = callGetSomething.value(scope, new Scope({}), {asCompute: true});

	equal(result(), 5);
});

test("methods don't update correctly (#1891)", function(){
	var map = new CanMap({
	  num: 1,
	  num2: function () {
	    return this.attr('num') * 2;
	  },
	  runTest: function () {
	    this.attr('num', this.attr('num') * 2);
	  }
	});

	var scope =
		new Scope(map);

	var num2Expression = new expression.Lookup("num2");
	var num2 = num2Expression.value( scope, new Scope({}), {asCompute: true} );

	num2.bind("change", function(ev, newVal){

	});

	map.runTest();

	equal( num2(), 4, "num2 updated correctly");

});

test("call expressions called with different scopes give different results (#1791)", function(){
	var exprData = expression.parse("doSomething(number)");

	var res = exprData.value(new Scope({
		doSomething: function(num){
			return num*2;
		},
		number: canCompute(2)
	}));

	equal( res(), 4);

	res = exprData.value(new Scope({
		doSomething: function(num){
			return num*3;
		},
		number: canCompute(4)
	}));

	equal( res(), 12);
});

test("convertKeyToLookup", function(){

	equal( expression.convertKeyToLookup("../foo"), "../@foo" );
	equal( expression.convertKeyToLookup("foo"), "@foo" );
	equal( expression.convertKeyToLookup(".foo"), "@foo" );
	equal( expression.convertKeyToLookup("./foo"), "./@foo" );
	equal( expression.convertKeyToLookup("foo.bar"), "foo@bar" );

});


test("expression.ast - [] operator", function(){
	var ast = expression.ast("['propName']");

	deepEqual(ast, {
		type: "Bracket",
		children: [{type: "Literal", value: "propName"}]
	});

	var ast2 = expression.ast("[propName]");

	deepEqual(ast2, {
    	type: "Bracket",
    	children: [{type: "Lookup", key: "propName"}]
	});

	var ast3 = expression.ast("foo['bar']");

	deepEqual(ast3, {
	    type: "Bracket",
			root: {type: "Lookup", key: "foo"},
	    children: [{type: "Literal", value: "bar"}]
	});

	var ast3 = expression.ast("foo[bar]");

	deepEqual(ast3, {
	    type: "Bracket",
			root: {type: "Lookup", key: "foo"},
	    children: [{type: "Lookup", key: "bar"}]
	});

	var ast4 = expression.ast("foo()[bar]");

	deepEqual(ast4, {
		type: "Bracket",
		root: {type: "Call", method: {key: "@foo", type: "Lookup" } },
		children: [{type: "Lookup", key: "bar"}]
	});
});

test("expression.parse - [] operator", function(){
	var exprData = expression.parse("['propName']");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Literal('propName')
		)
	);

	exprData = expression.parse("[propName]");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Lookup('propName')
		)
	);

	exprData = expression.parse("foo['bar']");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Literal('bar'),
			new expression.Lookup('foo')
		)
	);

	exprData = expression.parse("foo[bar]");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Lookup('bar'),
			new expression.Lookup('foo')
		)
	);

	exprData = expression.parse("foo()[bar]");
	deepEqual(exprData,
		new expression.Bracket(
			new expression.Lookup('bar'),
			new expression.Call(
				new expression.Lookup('@foo'),
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
			new CanMap({bar: "name"})
		)
	);
	equal(compute(), "name");

	// [bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar")
	);
	var compute = expr.value(
		new Scope(
			new CanMap({bar: "name", name: "Kevin"})
		)
	);
	equal(compute(), "Kevin");

	// foo["bar"]
	expr = new expression.Bracket(
		new expression.Literal("bar"),
		new expression.Lookup("foo")
	);
	var compute = expr.value(
		new Scope(
			new CanMap({foo: {bar: "name"}})
		)
	);
	equal(compute(), "name");

	// foo[bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar"),
		new expression.Lookup("foo")
	);
	var compute = expr.value(
		new Scope(
			new CanMap({foo: {name: "Kevin"}, bar: "name"})
		)
	);
	equal(compute(), "Kevin");

	// foo()[bar]
	expr = new expression.Bracket(
		new expression.Lookup("bar"),
		new expression.Call(
			new expression.Lookup("@foo"),
			[],
			{}
		)
	);
	var compute = expr.value(
		new Scope(
			new CanMap({foo: function() { return {name: "Kevin"}; }, bar: "name"})
		)
	);
	equal(compute(), "Kevin");

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
	var compute = expr.value(
		new Scope(
			new CanMap({
				foo: function() { return {name: "Kevin"}; },
				bar: function () { return "name"; }
			})
		)
	);
	equal(compute(), "Kevin");
});

test("registerConverter helpers push and pull correct values", function () {

	helpers.registerConverter('numberToHex', {
		get: function(valCompute) {
			return valCompute().toString(16)
		}, set: function(val, valCompute) {
			return valCompute(parseInt("0x" + val));
		}
	});

	var data = new CanMap({
		observeVal: 255
	});
	var scope = new Scope( data );
	var parentExpression = expression.parse("numberToHex(~observeVal)",{baseMethodType: "Call"});
	var twoWayCompute = parentExpression.value(scope, new Scope.Options({}));
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute(), 'ff', 'Converter called');
	twoWayCompute('7f');
	equal(data.attr("observeVal"), 127, 'push converter called');
});

test("registerConverter helpers push and pull multiple values", function () {

	helpers.registerConverter('isInList', {
		get: function(valCompute, list) {
			return !!~list.indexOf(valCompute());
		}, set: function(newVal, valCompute, list) {
			if(!~list.indexOf(newVal)) {
				list.push(newVal);
			}
		}
	});

	var data = new CanMap({
		observeVal: 4,
		list: [1,2,3]
	});
	var scope = new Scope( data );
	var parentExpression = expression.parse("isInList(~observeVal, list)",{baseMethodType: "Call"});
	var twoWayCompute = parentExpression.value(scope, new Scope.Options({}));
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute(), false, 'Converter called');
	twoWayCompute(5);
	deepEqual(data.attr("list").attr(), [1,2,3,5], 'push converter called');
});


test("registerConverter helpers are chainable", function () {

	helpers.registerConverter('numberToHex', {
		get: function(valCompute) {
			return valCompute().toString(16)
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


	var data = new CanMap({
		observeVal: 255
	});
	var scope = new Scope( data );
	var parentExpression = expression.parse("upperCase(~numberToHex(~observeVal))",{baseMethodType: "Call"});
	var twoWayCompute = parentExpression.value(scope, new Scope.Options({}));
	//twoWayCompute('34');

	//var renderer = stache('<input type="text" bound-attr="numberToHex(~observeVal)" />');


	equal(twoWayCompute(), 'FF', 'Converter called');
	twoWayCompute('7F');
	equal(data.attr("observeVal"), 127, 'push converter called');
});
