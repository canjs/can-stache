@typedef {String} can-stache/keys/variable *variable
@parent can-stache/keys
@description Store a variable local to the template.

@deprecated {4.0} `{{*variable}}` is deprecated in favor of [can-stache/keys/scope/scope.vars `{{scope.vars.variable}}`]


@signature `*variable`

A placeholder for a value that is local to the template.

```
<drivers-licenses {^selected}="*selectedDriver"/>
<edit-driver {driver}="*selectedDriver"/>
```

@body

## Use  

Every template contains a context which is able to store values
local to the template. Keys with `*` reference variables in that context.

Template variables are often used to pass data between
components. `<component-a>` exports its `propA` value to the
template variable `*variable`.  This is, in turn, used to update
the value of `propB` in `<component-b>`.

```
<component-a {^prop-a}="*variable"/>
<component-b {prop-b}="*variable"/>
```

Template variables are global to the template. Similar to JavaScript `var`
variables, template variables do not have block level scope.  The following
does not work:

```
{{#each(something)}}
	<component-a {^prop-a}="*variable"/>
	<component-b {prop-b}="*variable"/>
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
{{#each(something)}}
	{{#localContext}}
	  <component-a {^prop-a}="./variable"/>
	  <component-b {prop-b}="./variable"/>
	{{/localContext}}
{{/each}}
```
