@typedef {String} can-stache/keys/this this
@parent can-stache/keys

Write out or return the current context.

@signature `this`

Writes out or returns the current context.

```
{{#each names}}{{this}} {{/each}}
{{#each names}}
	{{sanitize(this)}}
{{/each}}
```


@signature `.`

  The same as writing `this`, but with 3 fewer characters!

  ```
  {{#each names}}{{.}} {{/each}}
  {{#each names}}
  	{{sanitize(.)}}
  {{/each}}
  ```

@body

## Use


To write out the current context, write `{{.}}` or `{{this}}`. For example,
a template like:

    {{#each names}}{{this}} {{/each}}

With data like:

    {names: ["Jan","Mark","Andrew"]}

Will write out:

    Jan Mark Andrew
