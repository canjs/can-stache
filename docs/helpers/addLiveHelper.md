@function can-stache.addLiveHelper addLiveHelper
@description Register a helper that gets passed values.
@parent can-stache.static

@signature `stache.addLiveHelper(name, helper)`

Registers a helper with stache that always gets passed
the arguments it is passed (without being converted
to values or wrapped in computes). Pass the name of the
helper followed by the function to invoke.

See [can-stache.Helpers] for more details on using helpers,
[can-stache.addHelper] to get passed values for arguments,
and [can-stache.registerHelper] to get computes for observable values.

```js
stache.addLiveHelper("upper", function(str){
	if (canReflect.isObservable(str) && canReflect.isValueLike(str)) {
		str = canReflect.getValue(str);
	}

	return str.toUpperCase();
});
```

@param {String} name The name of the helper.
@param {can-stache.simpleHelper} helper The helper function.

@body
