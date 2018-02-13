@page can-stache.Acquisition Template Acquisition
@parent can-stache.pages 3

There are number of ways to acquire templates such as: raw text,
a module loader, or script tags in the markup.

## Raw Text

Raw text can be templated by passing the text containing your template.  For example:

```javascript
const text = "My body lies over the {{.}}";
const template = stache(text);
const fragment = template("ocean");

document.body.appendChild(fragment);
```

## Module Loaders

For [StealJS](https://stealjs.com/), use [steal-stache] to import stache templates directly.


## Script Tags

You can embed a `<script>` tag and use its text as a stache template like:

```html
<script type='text/stache' id='my-template'>
  <h1>{{message}}</h1>
</script>
```

Load this template like:

```javascript
import stache from "can-stache";
const text = document.getElementById("my-template");
const template = stache(text);
```
