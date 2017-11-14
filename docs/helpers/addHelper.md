@function can-stache.addHelper addHelper
@description Register a helper that gets passed values.
@parent can-stache.static

@signature `stache.addHelper(name, helper)`

Registers a helper with stache that always gets passed
the value of its arguments (instead of computes).
Pass the name of the helper followed by the
function to invoke.

See [can-stache.Helpers] for more details on using helpers
and [can-stache.registerHelper] to get computes for observable values.

```js
stache.addHelper("upper", function(str){
	return str.toUpperCase();
});
```

@param {String} name The name of the helper.
@param {can-stache.simpleHelper} helper The helper function.

@body
