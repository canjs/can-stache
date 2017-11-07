@typedef {String} can-stache.key key
@parent can-stache/keys


@description A named reference to a value in the [can-view-scope scope] or
[can-view-scope.Options helper scope] in a template.

@signature `key`

Looks up a value in the [can-view-scope scope] or
[can-view-scope.Options helper scope].  This results in a
[can-stache/expressions/key-lookup]. [can-stache/expressions/key-lookup]
expressions can provide different values depending on what type of expression they
are within.  These rules are detailed in [can-stache/expressions/key-lookup].

```
{{name}}
{{#canVote(age)}}
```

@signature `EXPRESSION.key`

Looks up `key` on the result of a subexpression `EXPRESSION`.

```
{{person.first.name}}
{{#if(tasks.completed().length)}} ... {{/if}}
```

@signature `a\\.single\\.key`

Looks up a value without reading intermediate properties.


```
{{meta\\.data}}
```

This is deprecated.  If you do have properties with dots in them, use a [can-stache/expressions/bracket Bracket Expression]:

```
{{["meta.data"]}}
```

@body

## Use

A key references a value within the [can-view-scope scope] of a
template being rendered. In the following example, the
key is `name`:

    <h1>{{name}}</h1>

If this template is rendered with:

    {
      name: "Austin"
    }

The template writes out:

    <h1>Austin</h1>

A scope is a collection of multiple contexts. By default, a
key walks up the scope to each context until it finds a value. For example,
a template like:

    {{first}} {{last}}
      {{#children}}
        {{first}} {{last}}
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
        Justin Meyer

When `last` is looked up on the `{first: "Justin"}` object and not found,
it will then try to read the parent context's `last` property.  This is
why "Justin Meyer" is written out.
