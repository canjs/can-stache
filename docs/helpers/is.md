@function can-stache.helpers.is {{#is(expressions)}}
@parent can-stache.htags 12

Render something if two values are equal.

@signature `{{#is([EXPRESSION...])}}FN{{else}}INVERSE{{/is}}`

Renders the `FN` if every `EXPRESSION` argument is equal (`===`).

```html
{{#is(user.type, "admin")}} <button/> {{else}} Login {{/is}}
{{#is(task.ownerId, task.assignedId, user.id)}} Delegate! {{/is}}
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call} [EXPRESSION] Two or more expressions whose return values will be tested for equality.

@param {can-stache.sectionRenderer} FN A subsection that will be rendered if each
`EXPRESSION` argument is equal.

@param {can-stache.sectionRenderer} [INVERSE] An optional subsection that will be rendered
if one of the `EXPRESSION` arguments is not equal to one of the others.

@body

## Use

The `is` helper compares expr1 and expr2 and renders the blocks accordingly.

```html
{{#is(expr1, expr2)}}
	// truthy
{{else}}
	// falsey
{{/is}}
```
