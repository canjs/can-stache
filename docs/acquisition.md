@page can-stache.Acquisition Template Acquisition
@parent can-stache.pages 3

There are number of ways to acquire templates such as: raw text,
a module loader, or script tags in the markup.

## Raw Text

Raw text can be templated by passing the text containing your template.  For example:

	var text = "My body lies over the {{.}}",
		template = stache(text),
		fragment = template("ocean");

	document.body.appendChild(fragment);

## Module Loaders

For [http://stealjs.com StealJS], use [steal-stache] to import stache templates directly.


## Script Tags

You can embed a `<script>` tag and use its text as a stache template like:

```html
<script type='text/stache' id='my-template'>
  <h1>{{message}}</h1>
</script>
```

Load this template like:

```js
var stache = require("can-stache");
var text = document.getElementById("my-template");
var template = stache(text);
```
