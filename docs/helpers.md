@page can-stache.Helpers Helpers
@parent can-stache.pages 4

Helpers are functions that can be registered and called from within templates.  These functions
are typically used to provide functionality that is more appropriate for
the `view` than the `viewModel`.

Example custom helpers might include:

 - Converting a raw `Date` to a more user friendly timestamp. `{{timestamp birthday}}`
 - Internationalization. `{{i18n 'Hello'}}`
 - Convert markdown into HTML. `{{markdown(comment)}}`

Stache includes a number of built-in helpers, but custom helpers can be registered as well.

## Built-in Helpers

The `[can-stache.tags.section {{#if key}}]` helper is used for **if** statements. The **if** helper is similar
to using a `[can-stache.tags.section {{#key}}]` section. If they key passed to the helper is **truthy**, the
section will be rendered.

	Template:
		{{#if friends}}
			I have friends!
		{{/if}}

	Data:
		{
			friends: true
		}

	Result:
		I have friends!

When using the `[can-stache.helpers.if {{#if key}}]` helper, or any other helper for that matter,
the special `[can-stache.helpers.else {{else}}]` helper is available. `{{else}}` is equivalent to
an [can-stache.tags.inverse {{^key}}] inverse section (renders if given **falsey** data), except that it
only uses a single tag and exists inside a helper section.

	Template:
		<ul>
			{{#if friends}}
				</li>{{name}}</li>
			{{else}}
				<li>No friends.</li>
			{{/if}}
		</ul>

	Data:
		{
			friends: false
		}

	Result:
		<ul>
			<li>No friends.</li>
		</ul>

The `[can-stache.helpers.unless {{#unless key}}]` helper is equivalent to using a
`[can-stache.tags.inverse {{^key}}]` inverse section. If they key passed to the helper is **falsey**, the
section will be rendered.

	Template:
		{{#unless friends}}
			You don't have any friends!
		{{/unless}}

	Data:
		{
			friends: []
		}

	Result:
		You don't have any friends!

The `[can-stache.helpers.each {{#each key}}]` helper is similar to using a
`[can-stache.tags.section {{#key}}]` section for iterating an array. In this case, the entire array
will be rendered using the inner text item by item.

	Template:
		<ul>
			{{#each friends}}
				<li>{{name}}</li>
			{{/each}}
		</ul>

	Data:
		{
			friends: [
				{ name: "Austin" },
				{ name: "Justin" }
			]
		}

	Result:
		<ul>
			<li>Austin</li>
			<li>Justin</li>
		</ul>

The `[can-stache.helpers.with {{#with key}}]` helper is equivalent to using a
`[can-stache.tags.section {{#key}}]` section for regular objects. The helper will change
the current context so that all tags inside will look for keys on the local context first.

	Template:
		<h1>Hi {{name}}</h1>
		{{#with friend}}
			<p>You have a new friend: {{name}}</p>
		{{/with}}

	Data:
		{
			name: "Andy",
			friend: { name: "Justin" }
		}

	Result:
		<h1>Hi Austin</h1>
		<p>You have a new friend: Justin</p>

When using the `[can-stache.helpers.is {{#is key1 key2}}]` helper you can simply compare
key1 and key2. If the result of comparsion is **truthy**, the section will be rendered.

	Template:
		<ul>
		{{#is name 'Alex'}}
			</li>Your name is {{name}}</li>
		{{else}}
			<li>Your name is not Alex!</li>
		{{/is}}
		</ul>

	Data:
		{
			name: 'John'
		}

	Result:
		<ul>
			<li>Your name is not Alex!</li>
		</ul>

## Registering Helpers

You can register your own global helper with the `[can-stache.registerSimpleHelper registerSimpleHelper]` or `[can-stache.registerHelper registerHelper]` methods.

`[can-stache.registerSimpleHelper registerSimpleHelper]` calls the registered helper function with
values, while `[can-stache.registerHelper registerHelper]` calls the registered helper function with
[can-compute.computed computes] if observable data is passed. `registerSimpleHelper` is
easiser to use for basic helper functionality.


Localization is a good example of a custom helper you might implement
in your application. The below example takes a given key and
returns the localized value using
[jQuery Globalize](https://github.com/jquery/globalize).

	stache.registerSimpleHelper('l10n', function(str, options){
		return Globalize != undefined
			? Globalize.localize(str)
			: str;
	});


In the template, invoke the helper by calling the helper
name followed by any additional arguments.

	Template:
		<span>{{l10n 'mystring'}}</span>

	Result:
		<span>my string localized</span>

### Helper Arguments

The type of arguments passed to a `registerHelper` function depends on how the helper was called and the values
passed to the helper. In short, observables will be passed as [can-compute.computed compute] arguments
in helper expressions.  In any other circumstance,  values will be passed.

Helpers can be called as either a [can-stache.expressions Call or Helper Expression]:

 - Call expression - `{{myHelper(firstValue, secondValue)}}`
 - Helper expression - `{{myHelper firstValue secondValue}}`

Helpers can also be called with observable values or non-observable values.

Considering a helper like:

```js
stache.registerHelper("myHelper", function(value){ ... })
```

The following details what `value` is depending on how the helper is called
and the data passed.

#### Call expression with non-observable data

	Data:
		{ name: 'John' }

	Template:
		{{ myHelper(name) }}

	value:
		'John'

#### Call expression with observable data

	Data:
		new DefineMap({ name: 'John' })

	Template:
		{{ myHelper(name) }}

	value:
		'John'

#### Helper expression with non-observable data

	Data:
		{ name: 'John' }

	Template:
		{{ myHelper name }}

	value:
		'John'	    

#### Helper expression with observable data

	Data:
		new DefineMap({ name: 'John' })

	Template:
		{{ myHelper name }}

	value:
		compute('John')


### Evaluating Helpers

If you want to use a helper with a [can-stache.tags.section] tag, you need to call
`options.fn(context)` in your return statement. This will return a
document fragment or string with the resulting evaluated subsection.

Similarly, you can call `options.inverse(context)` to evaluate the
template between an `{{else}}` tag and the closing tag.

For example, when a route matches the string passed to our
routing helper it will show/hide the text.

	stache.registerHelper('routing', function(str, options){
		if (route.attr('filter') === str)
			return options.fn(this);
		}
	});

	{{#routing 'advanced'}}
		You have applied the advanced filter.
	{{/routing}}

__Advanced Helpers__

Helpers can be passed normal objects, native objects like numbers and strings,
as well as a hash object. The hash object will be an object literal containing
all ending arguments using the `key=value` syntax. The hash object will be provided
to the helper as `options.hash`. Additionally, when using [can-stache.tags.section] tags with a helper,
you can set a custom context by passing the object instead of `this`.

	stache.registerHelper('exercise', function(group, action,
											num, options){
		if (group && group.length > 0 && action && num > 0) {
			return options.fn({
				group: group,
				action: action,
				where: options.hash.where,
				when: options.hash.when,
				num: num
			});
		}
		else {
			return options.inverse(this);
		}
	});

	{{#exercise pets 'walked' 3 where='around the block' when=time}}
		Along with the {{#group}}{{.}}, {{/group}}
		we {{action}} {{where}} {{num}} times {{when}}.
	{{else}}
		We were lazy today.
	{{/exercise}}

	{
		pets: ['cat', 'dog', 'parrot'],
		time: 'this morning'
	}

This would output:

	Along with the cat, dog, parrot, we walked around the block
	3 times this morning.

Whereas an empty data object would output:

	We were lazy today.
