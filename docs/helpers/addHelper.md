@function can-stache.addHelper addHelper
@description Register a helper that gets passed values.
@parent can-stache.static

@signature `stache.addHelper(name, helper)`

Registers a helper with stache that always gets passed
the value of its arguments (instead of value observables).
Pass the name of the helper followed by the
function to invoke.

See [can-stache.Helpers] for more details on using helpers
and [can-stache.registerHelper] to get computes for observable values.

```js
stache.addHelper( "upper", function( str ) {
	return str.toUpperCase();
} );
```

@param {String} name The name of the helper.
@param {can-stache.simpleHelper} helper The helper function.

@signature `stache.addHelper(helpers)`

Register multiple helpers with stache that always get passed
the value of its arguments (instead of value observables).

Pass an object where the key is the name of a helper and the
value is the callback.

```js
stache.addHelper({
	upper: function(str) {
		return str.toUpperCase();
	},
	lower: function(str) {
		return str.toLowerCase();
	}
});
```

@param {{}} helpers an Object of name/callback pairs.

@body
