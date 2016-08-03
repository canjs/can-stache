@page can-stache.expressions Expressions
@parent can-stache.pages 2

In addition to different magic tag types, stache supports different expression
types.  These can be used in various combinations to call [can-stache.registerHelper helper methods]
or [can-component::viewModel viewModel methods].  The following is an example of all the expressions
combined:

```
{{helper key1 "string" method(key2, 1, prop1=key3) prop2=key4}}
```

There are 5 expression types stache supports:

 - Literal expression  like `{{"string"}}`
 - KeyLookup expressions like `{{key}}`
 - Hash expression like `{{prop=key}}`
 - Call expressions like `{{method(arg)}}`
 - Helper expressions like `{{helper arg}}`

## Literal expressions

Literal expressions specify JS primitive values like:

- Strings `"strings"`
- Numbers `5`
- Booleans `true` or `false`
- And `null` or `undefined`

They are usually passed as arguments to Call or Helper expressions like:

```
{{pluralize "dog" 2}}
{{task.filter("completed",true)}}
```

## KeyLookup expressions

A [can-stache.key KeyLookup expression] specifies a value in the [can-view-scope scope] or
[can-view-scope.Options HelperOptions scope] that will be looked up.  KeyLookup expressions
can be the entire stache expression like:

```
{{key}}
```

Or they can makeup the method, helper, arguments and hash value parts of
Call, Helper, and Hash expressions:

```
{{method(arg1,arg2}}          Call
{{helper arg1 arg2}}          Helper
{{method( prop=hashValue )}}  Hash
```

The value returned up by a KeyLookup depends on what the [can-stache.key] looks like, and
what expression type the KeyLookup is within.

For example, `{{method(~./key)}}` will call `method` with
a [can-compute.computed compute] that looks up the value of `key` only in the top of the [can-view-scope scope].

The rules are as follows:

 - __call expression arguments__ `{{method(key)}}` - values are passed.
 - __helper expression arguments__ `{{helper key}}` - computes are passed.
 - __hash value in call expression__ `{{method(hash=key)}}` - values are set as property values.
 - __hash value in helper expression__ `{{method hash=key}}` - computes are set as property values.
 - __special operator__ `{{%index}}` - lookup values in a special context provided by some helpers.
 - __compute operator__ `{{method(~key)}}` - pass a compute instead of a value.
 - __at operator__ `{{method(@key}}` - pass a function instead of trying to read the value of the function.
 - __current context__ `{{./key}}` - only lookup key at the top of the scope.
 - __parent context__ `{{../key}}` - lookup the value in the parent context.
 - __context__ `{{.}}` - return the current context/top of the scope.

## Hash expression

A hash expression specifies a property value on a object argument in a call expression
and property value on the the hash object in a helper expression's [can-stache.helperOptions] argument.

For example, in a call expression:

```
Template:
	{{methodA(prop=key)}}
    {{methodB(propX=key propY='literal', propZ=5)}}
Data:
	{
	  methodA: function(arg){},
      methodB: function(arg1, arg2),
	  key: compute("value")
	}
```

 - `methodA` will be called with `{prop: "value"}` as `arg`.
 - `methodB` will be called with `{propX: "value", propY: 'literal'}` as `arg1` and `{propZ: 5}` as `arg2`

In a helper expression:

```
Template:
	{{methodA prop=key}}
    {{methodB(propX=key propY='literal' propZ=5)}}
Data:
	{
	  methodA: function(options){},
      methodB: function(options){},
	  key: compute("value")
	}
```

 - `methodA` will be called with `{prop: compute("value")}` as `options.hash`.
 - `methodB` will be called with `{propX: "value", propY: 'literal', propZ: 5}` as `options.hash`.

## Call expression

A call expression calls a function looked up in the [can-view-scope scope] followed by
the [can-view-scope.Options helpers scope]. It looks like:

```
Template:
	<h1>{{pluralize(type,ages.length)}}</h1>

Data:
	{
	  pluralize: function(type, count){
	    return type+(count === 1 ? "" : "s")
	  },
	  todos: new List([22,32,42]),
	  type: "age"
	}

Result:
	<h1>Ages</h1>
```

Call expression arguments are commma (,) seperated.  If a Hash expression is an argument,
an object with the hash properties and values will be passed. For example:

```
Template:
	<h1>{{pluralize(word=type count=ages.length)}}</h1>

Data:
	{
	  pluralize: function(options){
	    return options.word+(options.count === 1 ? "" : "s")
	  },
	  todos: new List([22,32,42]),
	  type: "age"
	}

Result:
	<h1>Ages</h1>
```


## Helper expression

A helpers expression calls a function looked up in the [can-view-scope.Options helpers scope] followed by
the [can-view-scope scope]. It looks like:

```
Template:
	<h1>{{pluralize type ages.length}}</h1>

Data:
	{
	  pluralize: function(type, count){
	    return "data-pluralize"
	  },
	  todos: new List([22,32,42]),
	  type: "age"
	}

Helpers:
	{
      pluralize: function(type, count){
	    return type+(count() === 1 ? "" : "s")
	  }
	}

Result:
	<h1>Ages</h1>
```

Helper expression arguments that are observable are passed a compute.  This is
in contrast to Call expressions that get passed the value.

Helper expression arguments are space seperated.  If a Hash expression is an argument,
the hash properties and values will be added to the helper options object. For example:

```
Template:
	<h1>{{pluralize word=type count=ages.length}}</h1>

Data:
	{
	  todos: new List([22,32,42]),
	  type: "age"
	}

Helpers:
	{
      pluralize: function(helperOptions){
	    return helperOptions.hash.type+(helperOptions.hash.count() === 1 ? "" : "s")
	  }
	}

Result:
	<h1>Ages</h1>
```
