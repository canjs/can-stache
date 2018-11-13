@function can-stache.helpers.domData domData
@parent can-stache.htags

@description Associate data with an HTML element. This is useful for integrating with
other technologies.

@signature `{{domData(key, value)}}`

Uses [can-dom-data] to associate an element with a value.

  @param {String} [key] The name of the data attribute to use for the value.
  @param {can-stache/expressions/key-lookup|can-stache/expressions/call} [value]
  The value to associate with the key.

@signature `{{domData(key)}}`

  Uses [can-dom-data] to associate an element with the current [can-stache.scopeAndContext context].

  @param {String} [key] The name of the data attribute to use for the context.


@body

## Use

`{{domData(key)}}` lets you associate the current context with the element so
the context can later be retrieved by [can-dom-data].

Let’s look at a simple example:

```js
import Component from "can-component";
import domData from "can-dom-data";

Component.extend({
  tag: "todo-list",
  view: `
    <ul>
      {{#each(todos)}}
        <li {{domData("todo")}}>
          {{title}}
        </li>
      {{/each}}
    </ul>
  `,
  events: {
    "li click": function(element) {
      const todo = domData.get(element, "todo");
      // Do something with todo
    }
  }
});
```

> **Note:** this contrived example is just to demonstrate the `{{domData}}`
> helper; if you need to create a click handler, you should write
> `<li on:click="handler(this)">` and add a `handler()` method to your
> view-model.

### Pass a specific value

By passing a second argument to `{{domData(key, value)}}`, you can associate a
specific value with the element so the value can later be retrieved by
[can-dom-data].

Here’s another example:

```js
import Component from "can-component";
import domData from "can-dom-data";

Component.extend({
  tag: "todo-list",
  view: `
    <ul>
      {{#each(todos)}}
        <li {{domData("todos", ../todos)}}>
          {{title}}
        </li>
      {{/each}}
    </ul>
  `,
  events: {
    "li click": function(element) {
      const todos = domData.get(element, "todos");
      // Now you have access to the entire todos list
    }
  }
});
```
