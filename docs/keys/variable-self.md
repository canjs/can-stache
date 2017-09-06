@typedef {String} can-stache/keys/variable/self *self
@parent can-stache/keys/variable

Used to reference the current template and recursively render it

@signature `{{>*self}}`

The entirety of the current template is always stored as a [can-stache.tags.named-partial named partial] `*self`

```
<div>
	{{#if hasChild}}
		{{>*self}}
	{{/if}}
</div>
```

@body

## Use

This can be used to recursively render a template given a stop condition.

```
var viewModel = new DefineMap({
	child: {
		hasChild: true,
		child: {
			hasChild: false
		}
	}
});

var renderer = stache(
	"{{#child}}" +  // Will use the current child for scope
		"<span>" +
			"{{#if hasChild}}" +
				"{{>*self}}" +
			"{{/if}}" +
		"</span>" +
	"{{/child}}"
);

var view = renderer(viewModel);
```

The view variable will be the document fragment:
```
<span>
	<span></span>
</span>
```

A template variable can be passed in

```
var viewModel = new DefineMap({
	child: {
		hasChild: true,
		someProp: 1,
		child: {
			hasChild: false,
		}
	}
});

var renderer = stache(
	"{{#child}}" +  // Will use the current child for scope
		"<span>" +
			"{{#if hasChild}}" +
				"{{someProp}}" +
				"{{>*self someProp}}" +
			"{{/if}}" +
		"</span>" +
	"{{/child}}"
);

var view = renderer(viewModel);
```

The view variable will be the document fragment:
```
<span>
	1
	<span>1</span>
</span>
```
