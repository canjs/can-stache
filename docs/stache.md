@module {function} can-stache
@parent can-views
@collection can-core
@release 2.1
@group can-stache.pages 0 Pages
@group can-stache.static 1 Methods
@group can-stache.tags 2 Tags
@group can-stache/expressions 3 Expressions
@group can-stache/keys 4 Key Operators
@group can-stache.htags 5 Helpers
@group can-stache.types 6 Types
@group can-stache/deprecated 7 Deprecated
@package ../package.json
@outline 2

@description Live binding templates.

@signature `stache([name,] template)`

  Processes the `template` string and returns a [can-stache.view view function] that can
  be used to create HTML elements with data.

  ```js
  import {stache} from "can";

  // parses the template string and returns a view function:
  const view = stache(`<h1>Hello {{this.subject}}</h1>`);

  // Calling the view function returns HTML elements:
  const documentFragment = view({subject: "World"});

  // Adds those elements to the page
  document.body.appendChild( documentFragment );

  console.log(document.body.innerHTML) //-> "<h1>Hello World</h1>";
  ```
  @codepen

  `stache` is most commonly used by [can-component] to define a component's
  [can-component.prototype.view]:

  ```html
  <my-demo></my-demo>
  <script type="module">
  import {Component} from "can";

  Component.extend({
    view: `<h1>Hello {{this.subject}}</h1>`,
    ViewModel: {
      subject: {default: "World"}
    }
  });
  </script>
  ```

  Use [steal-stache] to import template view functions with [http://stealjs.com StealJS].

  Use [can-stache-loader](https://npmjs.com/package/can-stache-loader) to import template
  view functions with [webpack](https://webpack.js.org/).

  @param {String} [name] Provides an optional name for this type that will show up
  nicely in errors. Files imported with [steal-stache] will use their filename.

  @param {String} template The text of a stache template.

  @return {can-stache.view} A [can-stache.view view] function that returns
  a live document fragment that can be inserted in the page.

@body

## Purpose

Stache templates are used to:

- Convert data into HTML.
- Update the HTML when observable data changes.
- Enable [can-component custom elements] and [can-stache-bindings event and data bindings].

Stache is designed to be:

- Safe. It does not use `eval` in __any__ form of its use.
- Easy for beginners to understand - It looks a lot like JavaScript.
  ```html
  {{# for( item of this.items ) }}
     <li>
       <span>{{ item.name }}</span>
       <label>{{ this.getLabelFor(item) }}</label>
     </li>
  {{/ }}
  ```
- Limited - Complex logic should be done in the `ViewModel` were it is more easily
  tested. Stache only supports a subset of JavaScript expressions.
- Powerful (where you want it) - Stache adds a few things JavaScript doesn't support
  but are very useful for views:
  - Stache tolerates undefined property values - The following will not error. Instead
    stache will simply warn:
    ```html
    {{this.property.does.not.exist}}
    ```
  - Stache is able to read from promises and other observables directly:
    ```html
    {{# if(promise.isPending) }} Pending {{/ if }}
    {{# if(promise.isRejected) }}
      {{ promise.reason.message }}
    {{/ if }}
    {{# if(promise.isResolved) }}
      {{ promise.value.message }}
    {{/ if}}
    ```
  - Stache has an `{{else}}` case for empty lists:
    ```html
    {{# for( item of this.items ) }}
       <li>{{ item.name }}</li>
    {{ else }}
       <li>There are no items</li>
    {{/ }}
    ```

## Use

The following sections show you how to:

- [Load templates](#Loadingtemplates) so they be processed into views.
- [Writing values](#Writingvalues) within HTML to the page.
- Writing some HTML to the page or some other HTML to the page with [branch logic](#BranchingLogic).
- [Loop](#Looping) over a list of values and writing some HTML out for each value.
- [Listen to events](#Listeningtoevents) on elements.
- [Read and write](#Bindingtopropertiesandattributes) to element properties and attributes.
- Simplifying your templates with:
  - [Variables](#Creatingvariables)
  - [Helpers](#Creatinghelpers)
  - [Partials](#Creatingpartials)

### Loading templates

There are several ways to load a stache template:

- As a component's [can-component.prototype.view].

  [can-component] automatically processes strings passed to the `view` property as
  [can-stache] templates.

  ```html
  <my-demo></my-demo>
  <script type="module">
  import {Component} from "can";

  Component.extend({
    view: `<h1>Hello {{ this.subject }}</h1>`,
    ViewModel: {
      subject: {default: "World"}
    }
  });
  </script>
  ```
  @codepen

- Programmatically.

  Create a [can-stache.view] function by importing stache and passing it a string.

  ```js
  import {stache} from "can";

  // parses the template string and returns a view function:
  const view = stache(`<h1>Hello {{ this.subject }}</h1>`);

  // Calling the view function returns HTML elements:
  const documentFragment = view({subject: "World"});

  // Adds those elements to the page
  document.body.appendChild( documentFragment );

  console.log(document.body.innerHTML) //-> "<h1>Hello World</h1>";
  ```
  @codepen

- Imported and pre-parsed.

  If you are using [http://stealjs.com StealJS] use [steal-stache]
  or if you are using [webpack](https://webpack.js.org/) use [can-stache-loader](https://npmjs.com/package/can-stache-loader) to
  create `.stache` file and import them like:

  ```js
  import {Component} from "can";
  import view from "./my-component.stache";

  Component.extend({
    tag: "my-component"
    view,
    ViewModel: { ... }
  });
  ```

### Writing values

Use [can-stache.tags.escaped] to write out values into the page. The following
uses [can-stache.tags.escaped] to write out the `ViewModel`'s `subject`:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	view: `<h1>Hello {{ this.subject }}</h1>`,
	ViewModel: {
		subject: {default: "World"}
	}
});
</script>
```

You can use [can-stache.tags.escaped] on any part of an HTML element except the tag name:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	view: `
		<h1 class='{{this.className}}' {{this.otherAttributes}}>
			Hello {{ this.subject }}
		</h1>`,
	ViewModel: {
		subject: {default: "World"},
		className: {default: "bigger"},
		otherAttributes: {default: "id='123'"}
	}
});
</script>
```

You can call methods within [can-stache.tags.escaped] too:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	view: `<h1>Hello {{ this.caps( this.subject ) }}</h1>`,
	ViewModel: {
		subject: {default: "World"},
		caps( text ){
			return text.toUpperCase();
		}
	}
});
</script>
```

[can-stache.tags.escaped] will escape the value being inserted into the page. This
is __critical__ to avoiding [cross-site scripting](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks. However, if you have HTML to insert and you know it is safe, you can use [can-stache.tags.unescaped]
to insert it.

### Branching Logic

Stache provides severals helpers that help render logic conditionally.
For example, the following renders a sun if the `time` property equals `"day"`:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p on:click="this.toggle()">
			Time:
			{{# eq(this.time,"day") }}
				SUN 🌞
			{{ else }}
				MOON 🌚
			{{/ eq }}
		</p>
	`,
	ViewModel: {
		time: {default: "day"},
		toggle(){
			this.time = (this.time === "day" ? "night" : "day");
		}
	}
});
</script>
```
@codepen

Notice that branching is performed using the [can-stache.tags.section],
[can-stache.helpers.else] and
[can-stache.tags.close] magic tags.  These define "sections" of content to render depending on
what the helper does.  We call these the _TRUTHY_ and _FALSY_ sections. In the example above, the [can-stache.helpers.eq] helper renders the _TRUTHY_ section (`SUN 🌞`) if `this.time` equals `"day"`. If
`this.time` is __not__ equal to `"day"`, the _FALSY_ section (`MOON 🌚`) is rendered.

The following helpers are used to render conditionally:


- [can-stache.helpers.if] - Renders the _TRUTHY_ section if the value is truthy.
  ```html
  EXAMPLE
  ```
- [can-stache.helpers.not] - Renders the _TRUTHY_ section if the value is falsy.
- [can-stache.helpers.eq] - Renders the _TRUTHY_ section all values are equal.
- [can-stache.helpers.and] - Renders the  _TRUTHY_ section if all values are truthy.
- [can-stache.helpers.or] - Renders the  _TRUTHY_ section if any value is truthy.
- [can-stache.helpers.switch] with [can-stache.helpers.case] - Renders the case section that matches the value.


These helpers (except for [can-stache.helpers.switch]) can be combined. For example,
we can show the sun if `this.time` equals `"day"` or `"afternoon"` as follows:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p on:click="this.toggle()">
			Time:
			{{# or( eq(this.time,"day"), eq(this.time, "afternoon") ) }}
				SUN 🌞
			{{ else }}
				MOON 🌚
			{{/ eq }}
		</p>
	`,
	ViewModel: {
		time: {default: "day"},
		toggle(){
			this.time = (this.time === "day" ? "night" :
				(this.time === "night" ? "afternoon" : "day"));
		}
	}
});
</script>
```
@codepen

> NOTE: One of stache's goals is to keep your templates as simple as possible.
> It might be better to create a `isSunUp` method in the ViewModel and use that instead.


### Looping

Use [can-stache.helpers.for-of] to loop through values. The following writes out the name of
each todo:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<ul>
			{{# for(todo of this.todos) }}
				<li>{{ todo.name }}</li>
			{{/ for }}
		</ul>
	`,
	ViewModel: {
		todos: {
			default(){
				return [
					{name: "Writing"},
					{name: "Branching"},
					{name: "Looping"}
				]
			}
		}
	}
});
</script>
```
@codepen

Use [can-stache/keys/scope scope.index] to access the index of a value in the
array. The following writes out the index with each todo's name:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<ul>
			{{# for(todo of this.todos) }}
				<li>{{scope.index}} {{ todo.name }}</li>
			{{/ for }}
		</ul>
	`,
	ViewModel: {
		todos: {
			default(){
				return [
					{name: "Writing"},
					{name: "Branching"},
					{name: "Looping"}
				]
			}
		}
	}
});
</script>
```
@codepen

Use [can-stache.helpers.for-of] to loop through key-value objects.

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<ul>
			{{# for(value of this.object) }}
				<li>{{scope.key}} {{ value }}</li>
			{{/ for }}
		</ul>
	`,
	ViewModel: {
		object: {
			default(){
				return {
					first: "FIRST",
					value: "VALUE"
				};
			}
		}
	}
});
</script>
```
@codepen


### Listening to events

[can-stache-bindings.event] documents how you can listen to events on elements or
[can-component.prototype.ViewModel]s. The following listens to `click`s on a button:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<button on:click="this.increment()">+1</button>
		Count: {{this.count}}
	`,
	ViewModel: {
		count: {default: 0},
		increment(){
			this.count++;
		}
	}
});
</script>
```
@codepen

### Binding to properties and attributes

[can-stache-bindings] provides directional bindings to connect
values in stache to element or [can-component.prototype.ViewModel]
properties or attributes.

This makes it easy to:

- Write out property values.

  The following updates the checkboxes `checked` property
  if the status is __not__ equal to 'critical':

  ```html
  <my-demo></my-demo>
  <script type="module">
  import {Component} from "can";

  Component.extend({
  	tag: "my-demo",
  	view: `
  		<input type="checkbox"
  			checked:from="not( eq(this.status, 'critical') )" />
  			Can ignore?

  		<button on:click="this.status = 'critical'">Critical</button>
		<button on:click="this.status = 'medium'">Medium</button>
		<button on:click="this.status = 'low'">Low</button>
  	`,
  	ViewModel: {
  		status: {default: "low"}
  	}
  });
  </script>
  ```
  @codepen

- Update a value when an element property changes.

  The following updates the [can-component.prototype.ViewModel]'s `name`
  when the `<input/>` changes:

  ```html
  <my-demo></my-demo>
  <script type="module">
  import {Component} from "can";

  Component.extend({
  	tag: "my-demo",
  	view: `
  		<input value:to="this.name" placeholder="name"/>
  		Name: {{ this.name }}
  	`,
  	ViewModel: {
  		name: {default: ""}
  	}
  });
  </script>
  ```
  @codepen

[can-stache-bindings] supports a wide variety of different bindings.  Please checkout its documentation.

### Creating variables

The [can-stache.helpers.let] helper lets you create local variables.  For example, we can
create a `name` variable and write to that:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		{{ let name='' }}
		<input value:to="name" placeholder="name"/>
		Name: {{ name }}
	`
});
</script>
```
@codepen

Variables can help you avoid unnecessary [can-component.prototype.ViewModel] properties
like above. This is very handy when wiring [can-component Component]s within a
[can-stache.helpers.for-of] loop as follows:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		{{# for(todo of this.todos) }}
			{{ let locked=true }}
			<div>
				<p>
					Locked:
					<input type='checkbox' checked:from="locked"/>
				</p>
				<p>
					<input type='value' value:bind="todo.name" disabled:from="locked"/>
				</p>
			</div>
		{{/ for }}
	`,
	ViewModel: {
		todos: {
			default(){
				return [
					{name: "Writing"},
					{name: "Branching"},
					{name: "Looping"}
				];
			}
		}
	}
});
</script>
```
@codepen

Currently, you can only create variables with [can-stache.helpers.let] for the entire template or
within [can-stache.helpers.for-of].  If there are other blocks where you would find this useful, please
let us know!

### Creating helpers

Helpers can simplify your stache code.  While CanJS comes with many helpers, adding
your own can reduce code. There are several different types of helpers, each with
different benefits.

__Global Helpers__

Use [can-stache.addHelper] to create a helper function that can be called from every
template. The following makes an `upperCase` helper:

```html
<my-demo></my-demo>
<script type="module">
import {stache, Component} from "can";

stache.addHelper("upperCase", function(value){
	return value.toUpperCase();
})

Component.extend({
	tag: "my-demo",
	view: `
		<h1>Hello {{ upperCase(this.subject) }}</h1>
	`,
	ViewModel: {
		subject: {default: "World"}
	}
});
</script>
```
@codepen

Global helpers are easy to create and understand, but
they might create conflicts if another CanJS library defines
a similar helper.

__Component Methods__

Instead of creating a global helper, add your helper functions on
your component [can-component.prototype.ViewModel].  The following
adds the `upperCase` method to the [can-component.prototype.ViewModel].

```html
<my-demo></my-demo>
<script type="module">
import {stache, Component} from "can";

function upperCase(value){
	return value.toUpperCase();
}

Component.extend({
	tag: "my-demo",
	view: `
		<h1>Hello {{ this.upperCase(this.subject) }}</h1>
	`,
	ViewModel: {
		subject: {default: "World"},

		// View Helpers
		upperCase: upperCase
	}
});
</script>
```
@codepen


<details>
<summary>Importing Functions (older method)</summary>

If you are using a module loader to import stache files, [can-view-import]
can be used to import a function to a [can-stache/keys/scope/scope.vars] variable:

```html
<can-import from="app/helpers/upperCase"  module.default:to="scope.vars.myModule"/>
```

A replacement for this technique is being [designed here](https://github.com/canjs/can-stache/issues/610).

</details>



### Creating partials

Partials are snippets of HTML that might be used several places. There are a few
ways of reusing HTML.

__Using Components__

You can always define and use [can-component].


```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "address-partial",
	view: `
		<address>{{this.street}}, {{this.city}}</address>
	`
});

Component.extend({
	tag: "my-demo",
	view: `
		<h2>{{this.user1.name}}</h2>
		<address-partial street:from="user1.street" city:from="user1.city"/>
		<h2>{{this.user2.name}}</h2>
		<address-partial street:from="user2.street" city:from="user2.city"/>
	`,
	ViewModel: {
		user1: {
			default(){
				return {name: "Ramiya", street: "Stave", city: "Chicago"}
			}
		},
		user2: {
			default(){
				return {name: "Bohdi", street: "State", city: "Chi-city"}
			}
		}
	}
});
</script>
```
@codepen

__Calling views__

You can create views programmatically with `stache`, make those views available
to another view (typically through the [can-component.prototype.ViewModel]).  The following
creates an `addressView` and makes it available to `<my-demo>`'s [can-component.prototype.view]
through the `addressView` property on the `ViewModel`:


```html
<my-demo></my-demo>
<script type="module">
import {stache, Component} from "can";

const addressView = stache(`<address>{{this.street}}, {{this.city}}</address>`);

Component.extend({
	tag: "my-demo",
	view: `
		<h2>{{this.user1.name}}</h2>
		{{ addressView(street=user1.street city=user1.city) }}
		<h2>{{this.user2.name}}</h2>
		{{ addressView(street=user2.street city=user2.city) }}
	`,
	ViewModel: {
		addressView: {
			default(){
				return addressView;
			}
		},
		user1: {
			default(){
				return {name: "Ramiya", street: "Stave", city: "Chicago"}
			}
		},
		user2: {
			default(){
				return {name: "Bohdi", street: "State", city: "Chi-city"}
			}
		}
	}
});
</script>
```
@codepen

__Inline Partials__

If a single template needs the same HTML multiple places, use [can-stache.tags.named-partial {{<partialName}}]
to create an inline partial:


### Accessing a helper if your property overwrites ...


## Use

Stache has a variety of magic tags and expressions that control the behavior of
the DOM it produces.  Furthermore, you are able to customize this behavior
to a large extent.

This page introduces all of [can-stache]'s major functionality, including:

- Magic tags - Magic tags like [can-stache.tags.escaped] and [can-stache.tags.unescaped]
  control control how stache operates on the DOM.
- Expression types - This is the valid semantics (__TODO__) within a magic tag. For example, you
  can call functions like `{{ this.callSomeMethod() }}`.
- Pre








Learning stache is a bit like learning another language.  



Stache templates are a [mustache](https://mustache.github.io/mustache.5.html) and [handlebars](http://handlebarsjs.com/) compatible
syntax.  

The following
creates a stache template, renders it with data, and inserts
the result into the page:

```js
import stache from "can-stache";

// renderer is a "renderer function"
const renderer = stache( "<h1>Hello {{subject}}</h1>" );

// "renderer functions" render a template and return a
// document fragment.
const fragment = renderer( { subject: "World" } );

// A document fragment is a collection of elements that can be
// used with jQuery or with normal DOM methods.
fragment; //-> <h1>Hello World</h1>
document.body.appendChild( fragment );
```

Render a template with observable data like [can-define/map/map DefineMap]s or [can-define/list/list DefineList]s and the
resulting HTML will update when the observable data changes.

```js
import DefineMap from "can-define/map/map";


const renderer = stache( "<h1>Hello {{subject}}</h1>" );
const map = new DefineMap( { subject: "World" } );
const fragment = renderer( map );
document.body.appendChild( fragment );

map.subject = "Earth";

document.body.innerHTML; //-> <h1>Hello Earth</h1>
```

There’s a whole lot of behavior that `stache` provides.  The following walks through
the most important stuff:

- [can-stache.magicTagTypes] - The different tag types like `{{key}}` and `{{#key}}...{{/key}}`
- [can-stache.scopeAndContext] - How key values are looked up.
- [can-stache.expressions] - Supported expression types like `{{helper arg}}` and `{{method(arg)}}`
- [can-stache.Acquisition] - How to load templates into your application.
- [can-stache.Helpers] - The built in helpers and how to create your own.
- [can-stache.Binding] - How live binding works.


## Syntax

### Magic Tags

### Expressions

## Getting Syntax Highlighting

Stache is very similar to handlebars and mustache.  Most editors have plugins for this
format.

## Spacing and formatting

## See also

[can-view-scope] is used by `stache` internally to hold and lookup values.  This is similar to
how JavaScript’s closures hold variables, except you can use it programmatically.

[can-component] and [can-view-callbacks.tag can-view-callbacks.tag] allow you to define custom
elements for use within a stache template.  [can-view-callbacks.attr can-view-callbacks.attr] allow
you to define custom attributes.

[can-stache-bindings] sets up __element and bindings__ between a stache template’s [can-view-scope],
component [can-component.prototype.ViewModel viewModels], or an element’s attributes.

## How it works
