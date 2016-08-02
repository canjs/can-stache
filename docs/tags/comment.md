@function can-stache.tags.comment {{!expression}}

@parent can-stache.tags 7

@description A comment that doesn't get inserted into the rendered result.

@signature `{{!EXPRESSION}}`

The comment tag operates similarly to a `<!-- -->` tag in HTML. It exists in your template but never shows up.

```
{{!getFoo()}}
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} EXPRESSION An expression that will be ignored.
