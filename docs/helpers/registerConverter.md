@function can-stache.registerConverter
@description Register a helper for bidirectional value conversion.
@parent can-stache.static

@signature `stache.registerConverter(name, getterSetter)`

The following [can-stache.expressions Call expression]:

```handlebars
{{numberToString(~foo)}}
```

```js
stache.registerConverter("numberToString", {
  get: function(fooCompute) {
  	return "" + fooCompute();
  }, 
  set: function(newVal, fooCompute) {
  	fooCompute(+newVal);
  }
});
```

@param {String} name The name of the converter helper.
@param {Object} getterSetter An object containing get() and set() functions

@body

Registers a conversion helper with the Mustache system.
Pass the name of the helper followed by the get function, which fires
when any of the argument values change, and a set function, which fires
when the compute representing the value of this Call expression has its
value set.
