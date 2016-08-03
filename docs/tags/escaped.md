@function can-stache.tags.escaped {{expression}}
@parent can-stache.tags 0

@description Insert the value of the expression into the
output of the template.

@signature `{{EXPRESSION}}`

Gets the value of `EXPRESSION` and inserts the result into the output of the
template.

If the expression is clearly of a particular expression type like: `{{myHelper arg}}` or
`{{myMethod(arg)}}`, that expression's rules will be followed.

An ambiguous expression type like `{{keyOrHelper}}` will first treat `keyOrHelper`
as a [can-stache/expressions/key-lookup] and if there is no value in the scope of
`keyOrHelper`, it will be treated as a [can-stache/expressions/helper].



  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} expression The `expression` can be:

   - [can-stache/expressions/literal] - `{{5}}` - Inserts a string representation of the literal.
   - [can-stache/expressions/key-lookup] - `{{key}}` - Looks up the value of `key` in the [can-view-scope].
   - [can-stache/expressions/call] - `{{method()}}` - Calls `method` in the [can-view-scope].
   - [can-stache/expressions/helper] - `{{helper arg}}` - Calls `helper` in the [can-view-scope.Options] and passes it a [can-stache.helperOptions].



@body


## Use

The following breaks down the behavior of `{{expression}}`.  It groups
the behavior of [can-stache/expressions/key-lookup] and [can-stache/expressions/call]s
because their behavior works the same way.  It then details how [can-stache/expressions/helper]s
work.

### Key and Call Expressions

`{{key}}` insert data into the template. It most commonly references
values within the current context. For example:

Rendering:

    <h1>{{name}}</h1>

With:

    {name: "Austin"}

Results in:

    <h1>Austin</h1>

If the key value is a String or Number, it is inserted into the template.
If it is `null` or `undefined`, nothing is added to the template.


### Nested Properties

Stache supports nested paths, making it possible to
look up properties nested deep inside the current context. For example:

Rendering:

    <h1>{{book.author}}</h1>

With:

    {
      book: {
        author: "Ernest Hemingway"
      }
    }

Results in:

    <h1>Ernest Hemingway</h1>

### Looking up values in parent contexts

Sections and block helpers can create their own contexts. If a key's value
is not found in the current context, it will look up the key's value
in parent contexts. For example:

Rendering:

    {{#chapters}}
       <li>{{title}} - {{name}}</li>
    {{chapters}}

With:

    {
      title: "The Book of Bitovi"
      chapters: [{name: "Breakdown"}]
    }

Results in:

    <li>The Book of Bitovi - Breakdown</li>

## Helper expressions

The `{{helper}}` syntax is used to call out to stache [can-stache.helper helper functions] functions
that may contain more complex functionality. `helper` is a [can-stache.key key] that must match either:

 - a [can-stache.registerHelper registered helper function], or
 - a function in the current or parent [can-stache.context contexts]

The following example shows both cases.

The Template:

    <p>{{greeting}} {{user}}</p>

Rendered with data:

    {
      user: function(){ return "Justin" }
    }

And a with a registered helper like:

    stache.registerHelper('greeting', function(){
      return "Hello"
    });

Results in:

    <p>Hello Justin</p>

### Arguments

Arguments can be passed from the template to helper function by
listing space seperated strings, numbers or other [can-stache.key keys] after the
`helper` name.  For example:

The template:

    <p>{{madLib "Lebron James" verb 4}}</p>

Rendered with:

    {verb: "swept"}

Will call a `madLib` helper with the following arguements:

    stache.registerHelper('madLib',
      function(subject, verb, number, options){
        // subject -> "Lebron James"
        // verb -> "swept"
        // number -> 4
    });

If an argument `key` value is a [can-map] property, the Observe's
property is converted to a getter/setter [can-compute.computed]. For example:

The template:

    <p>What! My name is: {{mr user.name}}</p>

Rendered with:

    {user: new Map({name: "Slim Shady"})}

Needs the helper to check if name is a function or not:

    stache.registerHelper('mr',function(name){
      return "Mr. "+ (typeof name === "function" ?
                      name():
                      name)
    })

This behavior enables two way binding helpers and is explained in more detail
on the [can-stache.helper helper functions] docs.

### Hash

If enumerated arguments isn't an appropriate way to configure the behavior
of a helper, it's possible to pass a hash of key-value pairs to the
[can-stache.helperOptions helper option argument]'s
hash object.  Properties and values are specified
as `hashProperty=hashValue`.  For example:

The template:

    <p>My {{excuse who=pet how="shreded"}}</p>
`
And the helper:

    stache.registerHelper("excuse",function(options){
      return ["My",
        options.hash.who || "dog".
        options.hash.how || "ate",
        "my",
        options.hash.what || "homework"].join(" ")
    })

Render with:

    {pet: "cat"}

Results in:

    <p>My cat shareded my homework</p>

### Returning an element callback function

If a helper returns a function, that function is called back after
the template has been rendered into DOM elements. This can
be used to create stache tags that have rich behavior. Read about it
on the [can-stache.helper helper function] page.
