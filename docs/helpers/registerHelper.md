@function can-stache.registerHelper registerHelper
@description Register a helper.
@parent can-stache.static

@signature `stache.registerHelper(name, helper)`

The following template:

```handlebars
{{upper foo}}
```

```js
stache.registerHelper("upper", function(str){
	return str.toUpperCase();
});
```

@param {String} name The name of the helper.
@param {can-stache.helper} helper The helper function.

@body

Registers a helper with the Mustache system.
Pass the name of the helper followed by the
function to which Mustache should invoke.
These are run at runtime.
