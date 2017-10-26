@typedef {String} can-stache/keys/scope scope
@parent can-stache/keys
@description The template context

@signature `scope.vars`

Variables local to the template. See [can-stache/keys/scope/scope.vars] for details.

@signature `scope.view`

The current template. See [can-stache/keys/scope/scope.view] for details.

@signature `scope.filename`

The filename of the current template.

@body

## Use

To print the filename of the current template, you can use the following expression:

```
{{scope.filename}}
```

For templates rendered by passing a string directly to [can-stache], a additional string can be passed as the first argument to specify a `filename`:

```
can.stache('my-template', '{{scope.filename}}');
```

@signature `scope.lineNumber`

The current line number that is being rendered.

@body

## Use

To print the line number that is currently being rendered, you can use the following expression:

```
{{scope.lineNumber}}
```
