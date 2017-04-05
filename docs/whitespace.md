@page can-stache.Whitespace Whitespace Control
@parent can-stache.pages 6

@description Omit whitespace from around the output of the template.

@signature `{{-EXPRESSION-}}`

Whitespace may be omitted from either or both ends of a magic tag by including a
`-` character by the braces. When present, all whitespace on that side will be
omitted up to the next tag, magic tag, or non-whitespace character.

```js
<div>
	{{-name-}}
</div>
<div>
	{{{- toMarkdown(content) -}}}
</div>
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} EXPRESSION An expression whose unescaped result is inserted into the page.
