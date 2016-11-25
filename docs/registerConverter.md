@function can-stache.registerConverter registerConverter
@description Register a helper for bidirectional value conversion. Before creating your own converter, you may want to look at what’s provided by [can-stache-converters].
@parent can-stache.static

@signature `stache.registerConverter(converterName, getterSetter)`

Creates a helper that can do two-way conversion between two
values.  This is especially useful with
[can-stache-bindings.twoWay {($two-way)} bindings] like:

```handlebars
<input {($value)}='numberToString(~age)'/>
```

A converter helper provides:

 - a `get` method that returns the value
  of the `left` value given the arguments passed on the `right`.
 - a `set` method that updates one or multiple of the `right` arguments
   computes given a new `left` value.

`numberToString` might converts a number (`age`)
to a string (`value`), and the string (`value`) to a number (`age`)
as follows:


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

@param {String} converterName The name of the converter helper.
@param {can-stache.getterSetter} getterSetter An object containing get() and set() functions.

@body

## Use

These helpers are useful for avoiding creating [can-define/map/map] getters and setters that do similar conversions on the view model.  Instead,
a converter can keep your viewModels more ignorant of the demands of the
view.  Especially as the view's most common demand is that everything
must be converted to a string.

That being said, the following is a richer example of a converter,
but one that should probably be part of a view model.

```handlebars
<input {($value)}='fullName(~first, ~last)'/>
```

The following might converts both ways `first` and `last` to `value`.

```js
var canBatch = require("can-event/batch/batch");

stache.registerConverter("fullName", {
 get: function(first, last) {
 	return first() + last();
 },
 set: function(newFullName, first, last) {
	canBatch.start();
	var parts = newFullName.split(" ");
	first(parts[0]);
	last(parts[1]);
	canBatch.stop();
 }
});
```
