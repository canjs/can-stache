@typedef {String} can-stache/keys/variable/self *self
@parent can-stache/keys

Used to reference the current template and recursively render it

@signature `{{>*self}}`

The entirety of the current template is always stored as a [can-stache.tags.named-partial named partial] `*self`

```
<div>
	{{>*self}}
</div>
```

@body

## Use

This can be used to recursively render a template given a stop condition.

```
var viewModel = new DefineMap({
	worm: {
		name: "Earthworm Jim",
		hasChild: true,
		worm: {
			name: "Grey Worm",
			hasChild: true,
			worm: {
				name: "MyDoom",
				hasChild: false
			}
		}
	}
});

var renderer = stache(`
	{{#worm}}
		<span>{{name}}</span>
		{{#if hasChild}}
			<div>
				{{>*self}}
			</div>
		{{/if}}
	{{/child}}
`);

var view = renderer(viewModel);
```

The view variable will be the document fragment:
```
<span>Earthworm Jim</span>
<div>
	<span>Grey Worm</span>
	<div>
		<span>MyDoom</span>
	</div>
</div>
```

A template variable can be passed in

```
var viewModel = new DefineMap({
	worm: {
		name: "Earthworm Jim",
		hasChild: true,
		worm: {
			name: "Grey Worm",
			hasChild: true,
			worm: {
				name: "MyDoom",
				hasChild: false
			}
		}
	}
});

var renderer = stache(`
	{{#worm}}
		<p>{{name}}</p>
		<p>{{hasArms}}</p>
		{{#if hasChild}}
			<div>
				{{>*self}}
			</div>
		{{/if}}
	{{/child}}
`);

var view = renderer(viewModel);
```

The view variable will be the document fragment:
```
<p>Earthworm Jim</p>
<p>false</p>
<div>
	<p>Grey Worm</p>
	<p>false</p>
	<div>
		<p>MyDoom</p>
		<p>false</p>
	</div>
</div>
```

For a more detailed explaination of using partials recursively see [can-stache.tags.named-partial#TooMuchRecursion Too Much Recursion]
