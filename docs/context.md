@page can-stache.scopeAndContext Scope and Context
@parent can-stache.pages 1

@body

Every part of a stache template is rendered with a
given [can-view-scope scope]. The scope is used to lookup
values. A scope can contain multiple places to lookup values. Each of those
places is called a `context`.  

This is very similar to how `last` is looked up in the following JavaScript:

```js
var message = "Hello"
function outer(){
	var last = "Abril";

	function inner(){
		var first = "Alexis";
		console.log(message + " "+ first + " " + last);
	}
	inner();
}
outer();
```

JavaScript looks for `last` looks in the `inner` context and then walks up the
scope to the `outer` context to find a `last` variable.


Lets look at what happens with the scope the following example:

```
Template:
	<h1>{{message}} {{#person}}{{first}} {{last}}{{/person}}</h1>

Data:
	{
	  person: { first: "Alexis" },
	  last: "Abril",
	  message: "Hello"
    }

Result:
	<h1>Hello Alexis Abril</h1>
```

1. The template is rendered with `Data` as the only item in the scope. `scope:[Data]`
2. `{{message}}` is looked up within `Data`.
3. `{{#person}}` adds the `person` context to the top of the scope. `scope:[Data,Data.person]`
4. `{{first}}` is looked up in the scope.  It will be found on `Data.person`.
5. `{{last}}` is looked up in the scope.  
   1. `last` is looked in `Data.person`, it's not found.
   2. `last` is looked up in `Data` and returned.
6. `{{/person}}` removes `person` from the scope. `scope:[Data]`



The context used to lookup a value can be controlled with adding `../` or `./` before a
key. For instance, if we wanted to make sure `last` was only going to lookup on `person`,
we could change the template to:

```
Template:
	<h1>{{message}} {{#person}}{{first}} {{./last}}{{/person}}</h1>

Data:
	{
	  person: { first: "Alexis" },
	  last: "Abril",
	  message: "Hello"
	}

Result:
	<h1>Hello Alexis</h1>
```

[can-stache.tags.section Sections], [can-stache.Helpers Helpers],
and [can-component custom elements] can modify the scope used to render a subsection.

[can-stache.key] modifiers  like `../` and `@key` can control the context and value that
gets returned.

## Preventing Scope Walking

In order to prevent walking up the scope, you can explicitly choose the context a value is read from.

As mentioned above, you can explicitly read from the current context using `./` before the key:

```
Template:
	<h1>{{message}} {{#person}}{{first}} {{./last}}{{/person}}</h1>

Data:
	{
	  person: { first: "Alexis" },
	  last: "Abril",
	  message: "Hello"
    }

Result:
	<h1>Hello Alexis</h1>
```

You can also explicitly read from the parent context using `../`:

```
Template:
	<h1>{{#person}}{{../message}} {{first}}{{/person}}</h1>

Data:
	{
	  person: { first: "Alexis", message: "Hello" },
	  message: "Hi"
	}

Result:
	<h1>Hi Alexis</h1>
```

You can also create unique scope variables using [Hash Expressions](https://canjs.com/doc/can-stache/expressions/hash.html).

in the [`{{#each}}`](http://localhost/canjs/doc/can-stache.helpers.each.html#___eachEXPRESSIONHASH_EXPRESSION__FN__else__INVERSE___each__) helper:

```
{{#each todos todo=value num=index}}
	<li data-index="{{num}}">{{todo.name}}</li>
{{/each}}
```

and the [`{{#with}}`](https://canjs.com/doc/can-stache.helpers.with.html#___withHASHES__BLOCK___with__) helper:

```
{{#with street=person.address.street city=person.address.city}}
    Street: {{street}}
	City: {{city}}
{{/with}}
```
