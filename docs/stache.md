@module {function} can-stache
@parent can-core
@release 2.1
@group can-stache.pages 0 Pages
@group can-stache.static 1 Methods
@group can-stache.tags 2 Tags
@group can-stache/expressions 3 Expressions
@group can-stache/keys 4 Key Operators
@group can-stache.htags 5 Helpers
@group can-stache.types 6 Types

@link ../docco/view/stache/mustache_core.html docco
@test can/view/stache/test/test.html
@plugin can/view/stache
@download http://canjs.us/release/latest/can.stache.js


@description Live binding Mustache and Handlebars-comptable templates.

@signature `stache(template)`

Processes the template and returns a [can-stache.renderer renderer function].
Use [steal-stache] to import template renderer functions with [http://stealjs.com StealJS].

@param {String} template The text of a stache template.

@return {can-stache.renderer} A [can-stache.renderer renderer] function that returns a live document fragment
that can be inserted in the page.

@body

## Use

Stache templates are a [mustache](https://mustache.github.io/mustache.5.html) and [handlebars](http://handlebarsjs.com/) compatible
syntax.  Stache templates are used to:

- Convert data into HTML.
- Update the HTML when observable data changes.
- Enable [can-component custom elements] and [can-stache-bindings bindings].

The following
creates a stache template, renders it with data, and inserts
the result into the page:

```js
var stache = require("can-stache");
// renderer is a "renderer function"
var renderer = stache("<h1>Hello {{subject}}</h1>");

// "renderer functions" render a template and return a
// document fragment.
var fragment = renderer({subject: "World"})

// A document fragment is a collection of elements that can be
// used with jQuery or with normal DOM methods.
fragment //-> <h1>Hello World</h1>
document.body.appendChild(fragment)
```

Render a template with observable data like [can-define/map/map DefineMap]s or [can-define/map/map DefineList]s and the
resulting HTML will update when the observable data changes.

```js
var DefineMap = require("can-define/map/map");


var renderer = stache("<h1>Hello {{subject}}</h1>");
var map = new DefineMap({subject: "World"});
var fragment = renderer(map)
document.body.appendChild(fragment)

map.subject = "Earth";

document.body.innerHTML //-> <h1>Hello Earth</h1>
```

There's a whole lot of behavior that `stache` provides.  The following walks through
the most important stuff:

- [can-stache.magicTagTypes] - The different tag types like `{{key}}` and `{{#key}}...{{/key}}`
- [can-stache.scopeAndContext] - How key values are looked up.
- [can-stache.expressions] - Supported expression types like `{{helper arg}}` and `{{method(arg)}}`
- [can-stache.Acquisition] - How to load templates into your application.
- [can-stache.Helpers] - The built in helpers and how to create your own.
- [can-stache.Binding] - How live binding works.

## See also

[can-view-scope] is used by `stache` internally to hold and lookup values.  This is similar to
how JavaScript's closures hold variables, except you can use it programatically.

[can-component] and [can-view-callbacks.tag can-view-callbacks.tag] allow you to define custom
elements for use within a stache template.  [can-view-callbacks.attr can-view-callbacks.attr] allow
you to define custom attributes.

[can-stache-bindings] sets up __element and bindings__ between a stache template's [can-view-scope],
component [can-component.prototype.viewModel viewModels], or an element's attributes.
