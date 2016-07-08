@typedef {{get:can-stache.helper,set:function(*,can-compute...){}}} can-stache.getterSetter getterSetter
@parent can-stache.types 

@description The getterSetter argument passed to [can-stache.registerConverter registerConverter].

@option {can-stache.helper} [get] Returns a Call expression value, fired any time any of the 
passed in arguments take.  The function signature for `get` is one argument for each positional value
in the Call, and one additional object for hash values iff hash values exist in the Call expression.

Each argument is a compute if the argument has been marked with a tilde (`~`) prefix, otherwise the
value of the argument is the same as the value of the corresponding scope property.


@option {function(*,can-compute...){}} [set] Since the Call expression yields a [can-compute compute], its
value could be changed by calling the compute.  An example of this is a two-way binding in the 
`can-stache-bindings` plugin connecting an input value and a Scope property.  Using the set function, the
properties that were passed into the Call expression can be updated to match the new value of the expression
set by its compute.

The first argument of `set()` is the value passed to the compute.  The remaining arguments are the same
as for `get()`, with computes representing properties that have been marked with tildes (`~`) in the expression

```js
stache.registerConverter("isSelectedValue", {
	get: function(item, selectedItemCompute, list) {
	  // note that the list does not need to be computed, since it is listening
	  //  to changes and the object is not completely replaced in the scope.
	  var selectedItem = itemCompute();
		return selectedItem  === item;
	},
	set: function(newItem, oldItem, selectedItemCompute, list) {
		if(!~list.indexOf(newItem)) {
			list.push(newItem);
		}
		selectedItemCompute(newItem);
	}
})

```
