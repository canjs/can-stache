@function can-stache.helpers.for-of for(of)
@parent can-stache.htags 5
@description Loop through a list of values.

@signature `{{# for( VARIABLE_NAME of EXPRESSION ) }}FN{{else}}INVERSE{{/ for}}`

  `for` is used to to loop through a list of values and
  write out HTML for each value.  `for` works by looping through
  each value returned by `EXPRESSION` and points a
  a local [can-stache.helpers.let let-like] variable named   `VARIABLE_NAME` at each value.

  ```js
  import {stache} from "can";

  var view = stache(`
  	<ul>
  		{{# for(item of this.values) }}
  			<li>{{ item.name }}</li>
  		{{/ for }}
  	</ul>
  `);

  var data = {
  	values: [
  		{name: "first"},
  		{name: "second"}
  	]
  };

  var frag = view(data);
  document.body.appendChild(frag);

  document.body.innerHTML
  //-> <ul><li>first</li><li>second</li></ul>
  ```
  @codepen

  @param {VariableExpression} VARIABLE_NAME A local variable
  that will only be accessible to [can-stache/expressions/key-lookup KeyLookups] within the
  block.  

  @param {can-stache/expressions/key-lookup|can-stache/expressions/call} EXPRESSION An
  expression that typically returns a list like data structure.
  If the value of the EXPRESSION is an observable list (for example: [can-define/list/list]), the resulting HTML is updated when the list changes. When a change in the list happens, only the minimum amount of DOM
  element changes occur.  The list itself can also change, and a [can-diff/list/list difference]
  will be performed, which also will perform a minimal set of updates.

  @param {can-stache.sectionRenderer} FN A subsection that is
  rendered for each value in `EXPRESSION`. This subsection can
  access the value in `EXPRESSION` as `VARIABLE_NAME`.

  @param {can-stache.sectionRenderer} INVERSE A subsection that
  is rendered if `EXPRESSION` evaluats to an empty list.


@body

## Use

`for` is used to render HTML for items in a list. It improves
upon [can-stache.helpers.each] in that it does not
change the scope. Notice that within the `{{# for}}` block,
`this` still refers to the data passed to the view:

```js
import {stache} from "can";

var view = stache(`
	<ul>
		{{# for(item of this.values) }}
			<li>{{this.dataName}}-{{ item.name }}</li>
		{{/ for }}
	</ul>
`);

var data = {
	values: [
		{name: "one"},
		{name: "two"}
	],
	dataName: "number"
};

var frag = view(data);
document.body.appendChild(frag);

document.body.innerHTML
//-> <ul><li>number-one</li><li>number-two</li></ul>
```
@codepen
