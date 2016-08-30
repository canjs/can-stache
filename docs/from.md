@function can-stache.from from
@description Return a template loaded from an element.
@parent can-stache.static

@signature `stache.from(id)`

Load a template from an HTML element (usually a `<script>` element)
specified by id.  This is used typically for demo purposes.

For example, with a `<script>` tag as follows in your HTML:

```
<script type='text/stache' id='my-template'>
<h1>{{message}}</h1>
</script>
```

Load and render that template like:

```
var template = stache.from("my-template");
template({message: "Hello There!"});
```


@param {String} id The id of the element, whose `innerHTML` will be used to create a template.
@return {can-stache.renderer} A renderer function that will render the
template.

@body
