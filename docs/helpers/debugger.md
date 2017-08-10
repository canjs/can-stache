@function can-stache.helpers.debugger {{debugger}}
@parent can-stache.htags 10

In development, breaks at the given point in the template to inspect the current scope in the console.

@signature `{{debugger}}`
The zero argument debugger breaks any time the helper evaluates.

```
<!-- break each render -->
{{debugger}}
```

@signature `{{debugger CONDITION}}`
The one argument debugger breaks any time the helper evaluates and the argument evaluates to a truthy value.

```
<!-- break each render when value is truthy -->
{{debugger value}}
```

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} CONDITION an EXPRESSION that if evaluates to a truthy value triggers the debugger.

@signature `{{debugger LEFT RIGHT}}`
The two argument debugger breaks any time the helper evaluates and the two evaluated arguments are equal to each other.

```
<!-- break each render when leftValue === rightValue -->
{{debugger leftValue rightValue}}
```

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} LEFT an EXPRESSION which compares with RIGHT which if equal triggers the debugger.

@param {can-stache/expressions/key-lookup|can-stache/expressions/call} RIGHT an EXPRESSION which compares with LEFT which if equal triggers the debugger.

@body

## Use

The `debugger` helper breaks at its place in the template.

During a break, in the paused inspector there is a special `get(<path>)` function to help inspect the current scope. For example, `get("book.title")` will attempt to locate `book` in the current scope and return its `title` property.

Use the helper in development and debugging.
In production, the `debugger` never breaks and instead prints a warning.
