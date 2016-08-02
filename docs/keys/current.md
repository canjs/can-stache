@typedef {String} can-stache/keys/current ./current
@parent can-stache/keys

Lookup a value in only the current context.

@signature `./key`

Only looks up `key` in the current context.  Returns `undefined` if
not found.

```
{{#each todo}}
  <input {($checked)}="./complete"/> {{./name}}
{{/each}}
```

@body

## Use

Sometimes, especially with recursive templates, you want to control which
context is used to lookup.  Adding `./` before the key name will
only look up in the current context.

The following template:

    {{first}} {{last}}
      {{#children}}
        {{first}} {{./last}}
      {{/children}}

Rendered with:

    {
      first: "Barry", last: "Meyer",
      children: [
        {first: "Kim", last: "Sully"},
        {first: "Justin"},
      ]
    }

Writes out:

    Barry Meyer
        Kim Sully
        Justin

Notice that `{{./last}}` returns nothing because there's no `last` property
in the `{first: "Justin"}` object.
