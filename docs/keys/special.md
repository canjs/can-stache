@typedef {String} can-stache/keys/special %special
@parent can-stache/keys

[can-stache-bindings.event Event bindings] and some helpers like [can-stache.helpers.each]
provide special values that start with `%` to prevent potential collisions with
other values.  

@signature `%index`

When looping over an array, [can-define/list/list], or [can-list], you an use `%index` to write out the index of each property:

    {{#each tasks}}
      <li>{{%index}} {{name}}</li>
    {{/each}}

Indexes start at 0.  If you want to start at 1, you can create a helper like:

    stache.registerHelper('%indexNum', function(options){
      return options.scope.get("%index")+1;
    })

And use it like:

    {{#each task}}
      <li>{{%indexNum}} {{name}}</li>
    {{/each}}

@signature `%key`

Like `%index`, but provides the key value when looping through an object:

```
{{#each style}}
   {{%key}}: {{this}}
{{/each}}
```


@signature `%element`

In an event binding, `%element` references the DOM element the event happened on:

```
<input ($click)="doSomething(%element.value)"/>
```

@signature `%event`

In an event binding, `%event` references the dispatched event object:

```
<input ($click)="doSomething(%event)/>"
```

@signature `%viewModel`

In an event binding, `%viewModel` references the view model of the current element:

```
<my-component (closed)="doSomething(%viewModel)"/>
```

@signature `%arguments`

In an event binding, `%arguments` references the arguments passed when the event was dispatched/triggered.

```
<input ($click)="doSomething(%arguments)"/>
```
