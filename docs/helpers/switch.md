@function can-stache.helpers.switch {{#switch expression}}
@parent can-stache.htags 13

@signature `{{#switch EXPRESSION}}BLOCK{{/switch}}`

Renders the `BLOCK` with contextual [can-stache.helpers.case] and [can-stache.helpers.default] helpers.

```
{{#switch user.type}}
	{{#case "admin"}}
		<button value="edit"/>
	{{/case}}
	{{#case "manager"}}
		<button value="view">
	{{/case}}
	{{#default}}
		You do not have permission!
	{{/default}}
{{/switch}}
```

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} EXPRESSION An expression or key that references a value that will be switched on.

@param {can-stache.sectionRenderer} BLOCK a template that is rendered, uses [can-stache.helpers.case] and [can-stache.helpers.default] helpers to match `EXPRESSION`.


@body

## Use

The `switch` helper is used to render a block where one of several cases matches expr. It works just like a JavaScript switch.


	{{#switch page}}

		{{#case "cart"}}
			<can-import from="cart">
				<cart-page></cart-page>
			</can-import>
		{{/case}}

		{{#default}}
			<can-import from="home">
				<home-page></home-page>
			</can-import>
		{{/default}}

	{{/switch}}
