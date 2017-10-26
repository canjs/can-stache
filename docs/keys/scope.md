@typedef {String} can-stache/keys/scope scope
@parent can-stache/keys
@description The template context

@signature `scope.vars`

Variables local to the template. See [can-stache/keys/scope/scope.vars] for details.

@signature `scope.view`

The current template. See [can-stache/keys/scope/scope.view] for details.

@signature `scope.filename`

The filename of the current template (only available in dev mode).

	{{scope.filename}}

@signature `scope.lineNumber`

The current line number that is being rendered (only available in dev mode).

	{{scope.lineNumber}}

@signature `scope.index`

When looping over an array, [can-define/list/list], or [can-list], you an use `scope.index` to write out the index of each property:

    {{#each(tasks)}}
      <li>{{scope.index}} {{name}}</li>
    {{/each}}

Indexes start at 0.  If you want to start at 1, you can create a helper like:

    stache.registerHelper('scope.indexNum', function(options){
      return options.scope.get("scope.index")+1;
    })

And use it like:

    {{#each(task)}}
      <li>{{scope.indexNum}} {{name}}</li>
    {{/each}}

@signature `scope.key`

Like `scope.index`, but provides the key value when looping through an object:

```
{{#each(style)}}
   {{scope.key}}: {{this}}
{{/each}}
```
