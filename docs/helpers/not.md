@function can-stache.helpers.not not
@parent can-stache.htags

@signature `{{#not(EXPRESSION)}}FN{{else}}INVERSE{{/not}}`

Renders `FN` if `EXPRESSION` is falsey or `INVERSE` if `EXPRESSION`
is truthy. Both `FN` and `INVERSE` will be rendered with the
current scope.

```html
{{#not(person.isAwake())}} Shhhhh! {{/not}}
```

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} EXPRESSION A lookup expression that will provide a truthy or falsey value.

@param {can-stache.sectionRenderer} FN A subsection that can be optionally rendered.

@param {can-stache.sectionRenderer} [INVERSE] An optional subsection that will be rendered
if `EXPRESSION` is truthy and [can-stache.helpers.else] is used.

@body

## Use

The `not` helper evaluates the inverse of the value
of the key and renders the block between the helper and the slash.

```html
{{#not(expr)}}
  // not
{{/not}}
```
