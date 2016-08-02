@function can-stache.registerSimpleHelper registerSimpleHelper
@description Register a helper that gets passed values.
@parent can-stache.static

@signature `stache.registerSimpleHelper(name, helper)`

Registers a helper with stache that always returns
the arguments value (instead of a compute).
Pass the name of the helper followed by the
function to which Mustache should invoke.

See [can-stache.Helpers] for more details on using helpers
and [can-stache.registerHelper] to get computes for observable values.

```js
stache.registerSimpleHelper("upper", function(str){
	return str.toUpperCase();
});
```

See [can-stache.Helpers] for more details on using helpers.

@param {String} name The name of the helper.
@param {can-stache.simpleHelper} helper The helper function.

@body
