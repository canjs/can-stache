@function can-stache.safeString safeString
@parent can-stache.static

@signature `stache.safeString(str)`

@param {String} str A string you don't want to become escaped.
@return {String} A string flagged by `mustache` as safe, which will
not become escaped, even if you use [can-stache.tags.unescaped](triple slash).

@body

If you write a helper that generates its own HTML, you will
usually want to return a `stache.safeString.` In this case,
you will want to manually escape parameters with [can-util/js/strin/string.esc].


    stache.registerHelper('link', function(text, url) {
      text = string.esc(text);
      url  = string.esc(url);
    
      var result = '<a href="' + url + '">' + text + '</a>';
      return stache.safeString(result);
    });


Rendering:

```
<div>{{link "Google", "http://google.com"}}</div>
```

Results in:

```
<div><a href="http://google.com">Google</a></div>
```

As an anchor tag whereas if we would have just returned the result rather than a
`stache.safeString` our template would have rendered a div with the escaped anchor tag.

