@function can-stache.helpers.let let
@parent can-stache.htags


@description Create a block-level variable.

@signature `{{ let VARIABLE_NAME=VALUE [,HASHES] }}`

The `let` helper allows you to create a variable local to the template.

The following creates a `first` and `last` helper that reference
the ViewModel's `name.first` and `name.last` value:

```html
<let-example></let-example>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "let-example",
	view: `
		{{let first=this.name.first, last=this.name.last}}
		<p>First: {{first}}, Last: {{last}}</p>
	`,
	ViewModel: {
		user: {
			default() {
				return {
					name: {
						first: "Justin",
						last: "Meyer"
					}
				};
			}
		}
	}
});
</script>
```

`let` must be followed by keys and values.  The following is valid:

```html
{{ let varA=this.propA, varB=null, varC=undefined }}
```

But the following (currently) is not:

```html
{{ let varA, varB }}
```

If you want to create two undefined variables, you must (currently) do so like:

```html
{{ let varA=undefined, varB=undefined }}
```

@body


## Use

`let` creates "block-level" variables similar to JavaScript's [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
statement.

Currently, it can only create variables for the template and within [can-stache.helpers.for-of].  For example,
the following adds variables to the template:

```html
<let-example></let-example>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "let-example",
	view: `
		{{let first=this.name.first, last=this.name.last}}
		<p>First: {{first}}, Last: {{last}}</p>
	`,
	ViewModel: {
		user: {
			default() {
				return {
					name: {
						first: "Justin",
						last: "Meyer"
					}
				};
			}
		}
	}
});
</script>
```


The following creates a `first` and `last` that are only available within the `{{# for(...) }}`-`{{/ for}}`
block:


```html
<for-let-example></for-let-example>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "for-let-example",
	view: `
		{{# for(user of this.users) }}
			{{let first=user.name.first, last=this.name.last}}
			<p>First: {{first}}, Last: {{last}}</p>
		{{/ for}}
	`,
	ViewModel: {
		users: {
			default() {
				return [
					{ name: { first: "Justin", last: "Meyer" } },
					{ name: { first: "Ramiya", last: "Meyer" } }
				];
			}
		}
	}
});
</script>
```


Currently, `let` is not supported within other blocks.
