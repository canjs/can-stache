@function can-stache.tags.unescaped {{{expression}}}

@parent can-stache.tags 1

@description Insert the unescaped value of the expression into the
output of the template.

@signature `{{{EXPRESSION}}}`

Behaves just like [can-stache.tags.escaped] but does not
escape the result.

```html
<div> {{{ toMarkdown(content) }}} </div>
```

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} EXPRESSION An expression whose unescaped result is inserted into the page.

@body

This can also be used to render [can-component] instances:

```js
import Component from "can-component";
import stache from "can-stache";

const MyGreeting = Component.extend({
  tag: "my-greeting",
  view: "<p>Hello {{subject}}</p>",
  ViewModel: {
    subject: "string"
  }
});

const myGreetingInstance = new MyGreeting({
  viewModel: {
    subject: "friend"
  }
});

const template = stache("<div>{{{componentInstance}}}</div>");

const fragment = template({
  componentInstance: myGreetingInstance
});

fragment; //-> <div><p>Hello friend</p></div>
```
