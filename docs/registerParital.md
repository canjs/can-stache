@function can-stache.registerPartial registerPartial
@description Register a partial.
@parent can-stache.static

Register a partial template that can be rendered with [can-stache.tags.partial].

@signature `stache.registerPartial(name, template)`

Registers a template so it can be rendered with `{{>name}}`.

```js
stache.registerHelper("item.stache", "<li>{{name}}</li>");

var itemsTemplate = stache("{{#each items}}{{>item.stache}}{{/each}}");
```

@param {String} name The name of the partial.
@param {String|can-stache.renderer} template The string of a stache template or the
returned result of a stache template.

@body
