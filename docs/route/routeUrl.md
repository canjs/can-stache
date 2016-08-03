@function can-stache.helpers.routeUrl {{routeUrl hashes}}
@parent can-stache/helpers/route

Returns a url using [can-route.url route.url].

@signature `routeUrl( hashes... [,merge] )`

Calls [can-route.url] with  `hashes` as it's `data` argument and an
optional `merge`.

This can be used on its own to create `<a>` `href`s like:

```
<a href="{{ routeUrl(page='todos' id=todo.id) }}">details</a>
```

Or in conjunction with other helpers:

```
{{makeLink "details" routeUrl(page='todos', true)}}
```

@signature `{{routeUrl [merge] hashes... }}`

Passes the hashes to `route.url` and returns the result.

```
<a href="{{routeUrl page='todos' id=todo.id}}">details</a>
```

@param {Boolean} [merge] Pass `true` to create a url that merges `hashes` into the
current [can-route] properties.  

@param {can-stache/expressions/hash} [hashes...] A hash expression like `page='edit' recipeId=id`.

@return {String} Returns the result of calling `route.url`.

@body

## Use

Use the `routeUrl` helper like:

```
<a href='{{routeUrl page="recipe" id=5}}'>{{recipe.name}}</a>
```

This produces (with no pretty routing rules):

```
<a href='#!&page=5&id=5'>{{recipe.name}}</a>
```

It this functionality could also be written as:

```
<a href='{{ routeUrl(page="recipe" id=5) }}'>{{recipe.name}}</a>
```

Using call expressions/parenthesis lets you pass the `merge` option to `route`.  This
lets you write a url that only changes specified properties:

```
<a href='{{ routeUrl(id=5, true) }}'>{{recipe.name}}</a>
```




The following demo uses `routeUrl` and [can-stache.helpers.routeCurrent] to
create links that update [can-route]'s `page` attribute:

@demo demos/can-stache/route-url.html

It also writes out the current url like:

```
{{ routeUrl(undefined,true) }}
```

This calls `route.url({}, true)` which has the effect of writing out
the current url.
