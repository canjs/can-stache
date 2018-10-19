@function can-stache.helpers.eq eq
@parent can-stache.htags

Render something if two values are equal.

@signature `{{#eq([EXPRESSION...])}}FN{{else}}INVERSE{{/eq}}`

Renders the `FN` if every `EXPRESSION` argument is equal (`===`).

```html
{{#eq(user.type, "admin")}} <button/> {{else}} Login {{/eq}}
{{#eq(task.ownerId, task.assignedId, user.id)}} Delegate! {{/eq}}
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call} [EXPRESSION] Two or more expressions whose return values will be tested for equality.

@param {can-stache.sectionRenderer} FN A subsection that will be rendered if each
`EXPRESSION` argument eq equal.

@param {can-stache.sectionRenderer} [INVERSE] An optional subsection that will be rendered
if one of the `EXPRESSION` arguments is not equal to one of the others.

@body

## Use

The `` helper compares expr1 and expr2 and renders the blocks accordingly.

```html
{{# eq(expr1, expr2) }}
	// truthy
{{ else }}
	// falsey
{{/ eq }}
```
