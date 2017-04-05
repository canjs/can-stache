@page can-stache.Whitespace Whitespace Control
@parent can-stache.pages 6

@description Omit whitespace from around the output of the template.

@signature `{{-EXPRESSION-}}`

Whitespace may be omitted from either or both ends of a magic tag by including a
`-` character by the braces. When present, all whitespace on that side will be
omitted up to the next tag, magic tag, or non-whitespace character. It also works with [can-stache.tags.unescaped].

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} EXPRESSION An expression whose unescaped result is inserted into the page.

@body

## Examples

### Basic Usage

```js
<div>
	{{-#if user.isMarried-}}
		Mrs
	{{-else-}}
		Miss
	{{-/if-}}
</div>
```

would render as:

```js
<div>{{#if user.isMarried}}Mrs{{else}}Miss{{/if}}</div>
```

and

```js
<div>
	{{{- toMarkdown(content) -}}}
</div>
```

would render as:

```js
<div>{{{ toMarkdown(content) }}}</div>
```

### Span Elements

One use case is to remove spaces around span elements.

```js
<div>
	<span>
		{{-#if user.isMarried-}}
			Mrs.
		{{-else-}}
			Miss.
		{{-/if-}}
	</span>
	{{- user.name }}
</div>
```

would render as:

```js
<div>
	<span>{{#if user.isMarried}}Mrs.{{else}}Miss.{{/if}}</span>{{ user.name }}
</div>
```

### Empty Elements

Another would be to assure that empty elements are able to match the `:empty`
css pseudo-class (the whitespace that would be otherwise present prevents this),
while still being cleanly formatted for human consumption.

```js
<div>
	{{-! output the users name }}
	{{-#if user.name}}
		{{ user.name }}
	{{/if-}}
</div>
```

would render as:

```js
<div>{{-! output the users name }}{{-#if user.name}}
		{{ user.name }}
	{{/if-}}</div>
```
