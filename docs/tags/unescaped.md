@function can-stache.tags.unescaped {{{expression}}}

@parent can-stache.tags 1

@description Insert the unescaped value of the expression into the
output of the template.

@signature `{{{EXPRESSION}}}`

Behaves just like [can-stache.tags.escaped] but does not
escape the result.

```html
<div> {{{ toMarkdown(content) }}} </div>
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} EXPRESSION An expression whose unescaped result is inserted into the page.
