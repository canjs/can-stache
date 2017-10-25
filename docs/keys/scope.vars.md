@typedef {String} can-stache/keys/scope/scope.vars scope.vars
@parent can-stache/keys/scope
@description Used to reference variables specific to the template context

@signature `scope.vars`

A placeholder for a value that is local to the template.

```
<drivers-licenses selected:to="scope.vars.selectedDriver"/>
<edit-driver driver:from="scope.vars.selectedDriver"/>
```

@body

## Use

Template variables are often used to pass data between
components. `<component-a>` exports its `propA` value to the
template variable `scope.vars.variable`.  This is, in turn, used to update
the value of `propB` in `<component-b>`.

```
<component-a propA:to="scope.vars.variable"/>
<component-b propB:from="scope.vars.variable"/>
```

Template variables are global to the template. Similar to JavaScript `var`
variables, template variables do not have block level scope.  The following
does not work:

```
{{#each something}}
	<component-a propA:to="scope.vars.variable"/>
	<component-b propB:from="scope.vars.variable"/>
{{/each}}
```

To work around this, an `localContext` helper could be created as follows:

```
stache.regsiterHelper("localContext", function(options){
  return options.fn(new Map());
});
```

And used like:

```
{{#each something}}
	{{#localContext}}
	  <component-a propA:to="./variable"/>
	  <component-b propB:from="./variable"/>
	{{/localContext}}
{{/each}}
```
