@function can-stache.helpers.log {{log()}}
@parent can-stache.htags 9

@signature `{{log([EXPRESSION])}}`

`console.log`s the current context or the result of the provided expressions.

```html
{{log()}}
{{log(person.name, person.age)}}
```


@param {can-stache/expressions/key-lookup|can-stache/expressions/call} [EXPRESSION]
Arguments to `console.log`.  If none are provided, the current context (the top of the [can-view-scope]) will be logged.
