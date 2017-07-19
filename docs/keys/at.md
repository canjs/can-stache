@typedef {String} can-stache/keys/at @at
@parent can-stache/keys

Return whatever value is at a key, regardless
if it's a function or a compute.

The default behavior in Stache lookups is to execute functions to get their return values when following a dotted path.  `@` before a token in a path `@A.B` prevents A from being called for its return value (so 'B' is evaluated from the properties of A itself). Likewise, `@` elsewhere in a path like `A@B` prevents B from being called for its return value and returns whatever B itself is on the return from A.

@signature `@key`

Lookup a `key` value in the scope and return whatever is there.

```
<paginator {next}="@key"/>
<paginator {next}="@loadNextItem"/>
```

@signature `key@prop`

Lookup `prop` property on `key` and return whatever is there.

```
<grid {get-data}="key@prop"/>
<grid {get-data}="Todo@getList"/>
```

@body

## Use

The following illustrates what `some@key` would return given
different data structures:


```
// A non-observable JS object:
{some: {key: "value"}}
   //-> "value"

// A non-observable JS object w/ a function at the end
{some: {key: function(){ return "value"; }}}
   //-> function(){ return "value"; }

// A non-observable JS object with intermeidate functions:
{some: function(){ return {key: "value"}}}
   //-> "value"

// A observable can-map
{some: new Map({key: "value"})}
   //-> "value"

// A method on an observable can-map that reads observables
var Some = Map.extend({key: function(){ return this.attr("value")}})
{some: new Some({value: "value"})}
   //-> function(){ return this.attr("value")}
```

Where `some@key` returns a function, that function is "bound" via `.bind(context)`
to the parent object.  This means that calling the function will
have `this` set to what is expected.

If the AT key is used at the start of a key like:

```
{{method(@key)}}
```

This will return whatever is at the `key` property on the first context in the scope
to have a non-undefined `key` value.

The following illustrates what `@some.key` would return because `some` will not be executed if it's a function:

```
// A non-observable JS object with intermeidate functions:
{some: function(){ return {key: "value"}}}
   //-> undefined

// A non-observable JS object:
{some: {key: "value"}}
   //-> "value"
```

The AT key can be used multiple times within a value lookup expression like:

```
{{method(models@Todo@getList)}}
```
