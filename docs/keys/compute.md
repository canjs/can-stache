@typedef {String} can-stache/keys/compute ~compute
@parent can-stache/keys

Pass a compute instead of a value if an observable is found within
[can-stache/expressions/calls].

@signature `~key`

This makes non-helper expression arguments behave similar to helper
expression arguments.

```
{{#each(~todos)}} ... {{/each}}
```

@body

## Use

The following illustrates what `~some.key` would return given
different data structures:

```
// A non-observable JS object:
{some: {key: "value"}}
   //-> "value"

// A non-observable JS object w/ a function at the end
{some: {key: function(){ return "value"; }}}
   //-> "value"

// A non-observable JS object with intermediate functions:
{some: function(){ return {key: "value"}}}
   //-> "value"

// A observable can-map
{some: new DefineMap({key: "value"})}
   //-> canCompute("value")

// A method on an observable can-map that reads observables
var Some = DefineMap.extend({
	value: "string",
	key: function(){ return this.value; }
})
{some: new Some({value: "value"})}
   //-> compute(function(){ return this.value; })
```

Notice that `~` should only be used once in a value lookup expression.
