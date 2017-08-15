@function can-stache.helpers.not {{#not expressions}}
@parent can-stache.htags 12

Render something if two values are not equal.

@signature `{{#not [EXPRESSION...]}}FN{{else}}INVERSE{{/is}}`

Renders the `FN` if every `EXPRESSION` argument is not equal (`!==`).

```
{{#not user.type "admin"}} Login {{else}} <button/> {{/is}}
{{#not task.ownerId task.assignedId user.id }} Delegate! {{/is}}
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call} [EXPRESSION] Two or more expressions whose return values will be tested for inequality.

@param {can-stache.sectionRenderer} FN A subsection that will be rendered if each
`EXPRESSION` argument is not equal.

@param {can-stache.sectionRenderer} [INVERSE] An optional subsection that will be rendered
if one of the `EXPRESSION` arguments is equal to one of the others.

@body

## Use

The `not` helper compares expr1 and expr2 and renders the blocks accordingly.

  {{#not expr1 expr2}}
    // falsey
  {{else}}
    // truthy
  {{/is}}
