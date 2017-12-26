@function can-stache.tags.section {{#expression}}
@parent can-stache.tags 3

Renders a subsection one or more times depending on the type of expression
or the expression’s return value.

@signature `{{#KEY_EXPRESSION}}FN{{else}}INVERSE{{/KEY_EXPRESSION}}`

Renders the `FN` or `INVERSE` section one or many times depending on
the value in `KEY_EXPRESSION`.

If `KEY_EXPRESSION` returns an  [can-util/js/is-array-like/is-array-like array like object],
the `FN` section will be rendered for each item in the array.  If the array like object is
empty, the `INVERSE` section will be rendered. The [can-stache.helpers.each] helper
should generally be used for observable array-like objects as it has some performance
advantages.  

```html
{{#items}}<li>{{name}}</li>{{/items}}
```

If `KEY_EXPRESSION` returns a truthy value, the `FN` section will be rendered with
the truthy value.

If `KEY_EXPRESSION` returns a fasley value, the `INVERSE` section will be rendered with
the fasley value.

```html
{{#address}} {{street}} {{city}} {{/address}}
```

The closing tag can end with `{{/}}`.

  @param {can-stache/expressions/key-lookup} KEY_EXPRESSION A key expression.
  If there is no value in the scope of `keyOrHelper`, it will be treated as a [can-stache/expressions/helper].
  @param {can-stache.sectionRenderer} FN The truthy subsection.
  @param {can-stache.sectionRenderer} INVERSE An optional inverse section created
  by using [can-stache.helpers.else].


@signature `{{#CALL_EXPRESSION}}FN{{else}}INVERSE{{/CALL_EXPRESSION}}`

Works like `{{#KEY_EXPRESSION}}`, but uses the return value of
the `CALL_EXPRESSION`.

```html
{{#getTasksForPerson(person)}}<li>{{name}}</li>{{/getTasksForPerson}}
```

Typically, the closing tag only include the method name and not its parameters.

The closing tag can end with `{{/}}`.

  @param {can-stache/expressions/call} CALL_EXPRESSION A function that
  will be called with any specified arguments.
  @param {can-stache.sectionRenderer} FN The truthy subsection.
  @param {can-stache.sectionRenderer} INVERSE An optional inverse section created
  by using [can-stache.helpers.else].


@signature `{{#HELPER_EXPRESSION}}FN{{else}}INVERSE{{/HELPER_EXPRESSION}}`

Calls a [can-stache.registerHelper registered helper] or a function in the
[can-view-scope] with an additional [can-stache.helperOptions] argument
that can call the `FN` or `INVERSE` helpers to build the content that
should replace these tags.

```html
<p>{{#countTo(number)}}{{num}}{{/countTo}}</p>
```

Helpers, with their direct access to subsection renderers and scope
have more control over template flow.  However, they are harder to test
than methods in the view model or model.

  @param {can-stache/expressions/helper} HELPER_EXPRESSION Calls a helper method
  or function in the [can-view-scope] with specified arguments.
  @param {can-stache.sectionRenderer} FN The truthy subsection.
  @param {can-stache.sectionRenderer} INVERSE An optional inverse section created
  by using [can-stache.helpers.else].

@body

## Use

The following breaks down the behavior of `{{#expression}}`.  It groups
the behavior of [can-stache/expressions/key-lookup] and [can-stache/expressions/call]s
because their behavior works the same way.  It then details how [can-stache/expressions/helper]s
work.


## KeyLookup and Call expressions

Sections contain text blocks and evaluate whether to render it or not.  If
the object evaluates to an array it will iterate over it and render the block
for each item in the array.  There are four different types of sections.

### Falseys or Empty Arrays

If the value returns a `false`, `undefined`, `null`, `""` or `[]` we consider
that a *falsey* value.

If the value is falsey, the section will **NOT** render the block.

```js
/* Data */
{
  friends: false
}
```

```html
<!-- Result -->
{{#friends}}
  Never shown!
{{/friends}}
```

### Arrays

If the value is a non-empty array, sections will iterate over the
array of items, rendering the items in the block.

For example, a list of friends will iterate
over each of those items within a section.

```html
<!-- Template -->
<ul>
    {{#friends}}
        <li>{{name}}</li>
    {{/friends}}
</ul>
```

```js
/* Data */
{
    friends: [
        { name: "Austin" },
        { name: "Justin" }
    ]
}
```

```html
<!-- Result -->
<ul>
    <li>Austin</li>
    <li>Justin</li>
</ul>
```

Reminder: Sections will reset the current context to the value for which it is iterating.
See the [basics of contexts](#Basics) for more information.

### Truthys

When the value is a non-falsey object but not a list, it is considered truthy and will be used
as the context for a single rendering of the block.

```html
<!-- Template -->
{{#friends}}
    Hi {{name}}
{{/friends}}
```

```js
/* Data */
{
    friends: { name: "Jon" }
}
```

```html
<!-- Result -->
Hi Jon!

```

## Helper expression


A helper like:

```js
stache.registerHelper('countTo', function(number, options){
    var out = [];
    if(number > 0) {
        for(var i =1; i <= number; i++){
          var docFrag = options.fn({num: i});
          out.push( docFrag );
        }
        return out;
    } else {
        return options.inverse({num: i});
    }
});
```

Could be called like:

```html
<p>
  {{#countTo number}}
    {{num}}
  {{else}}
    Can’t count to {{num}}!
  {{/countTo}}
</p>
```

Called with data like:

```js
{number: 3}
```

Produces:

```html
<p> 1 2 3 </p>
```

Called with data like:

```js
{number: -5}
```

Produces:

```html
<p> Can’t count to -5! </p>
```

Notice how `options` has `.fn` and `.inverse`.
