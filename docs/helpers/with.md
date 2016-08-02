@function can-stache.helpers.with {{#with expression}}
@parent can-stache.htags 6

Changes the context within a block.

@signature `{{#with EXPRESSION}}BLOCK{{/with}}`

Renders `BLOCK` with the result of `EXPRESSION` added to the top of the [can-view-scope].

```
{{#with person.address}}
	Street: {{street}}
	City: {{city}}
{{/with}}
```

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} EXPRESSION A lookup expression that will provide a value.

@param {can-stache.sectionRenderer} BLOCK A template that is rendered
with the context of the `EXPRESSION`'s value.

@body

## Use

`{{#with}}` renders a subsection with a new context added to the [can-view-scope].
For example:

```
TEMPLATE:
	{{#with person.address}}
		Street: {{street}}
		City: {{city}}
	{{/with}}
DATA:
	{person: {address: {street: "123 Evergreen", city: "Springfield"}}}

RESULT:
	Street: 123 Evergreen
	City: Springfield
```

The difference between `{{#with}}` and the default [can-stache.tags.section]
is that the subsection `BLOCK` is rendered no matter what:

```
TEMPLATE:
	{{#with person.address}}
		Street: {{street}}
		City: {{city}}
	{{/with}}
DATA:
	{person: {}}

RESULT:
	Street:
	City:
```
