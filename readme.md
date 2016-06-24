# can-stache

[![Build Status](https://travis-ci.org/canjs/can-stache.png?branch=master)](https://travis-ci.org/canjs/can-stache)

Live binding handlebars templates

- <code>[__can-stache__ function](#can-stache-function)</code>
  - <code>[stache(template)](#stachetemplate)</code>
    - _types_
      - <code>[simpleHelper function(*..., can-stache.sectionOptions, arg..., options)](#simplehelper-function-can-stachesectionoptions-arg-options)</code>
      - <code>[helper function(*..., can.stache.sectionOptions, arg..., [options](#helperoptions-object))](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)</code>
      - <code>[helperOptions Object](#helperoptions-object)</code>
      - <code>[key String](#key-string)</code>
      - <code>[sectionRenderer function(context, helpers)](#sectionrenderer-functioncontext-helpers)</code>
    - _static_
      - <code>[stache.registerHelper(name, helper)](#stacheregisterhelpername-helper)</code>
      - <code>[stache.registerSimpleHelper(name, helper)](#stacheregistersimplehelpername-helper)</code>
      - <code>[stache.safeString(str)](#stachesafestringstr)</code>
    - _tags_
      - <code>[{{key}}](#key)</code>
      - <code>[{{{key}}}](#key)</code>
      - <code>[{{#key}}BLOCK{{/key}}](#keyblockkey)</code>
      - <code>[{{&key}}](#key)</code>
      - <code>[{{/key}}](#key)</code>
      - <code>[{{^key}}BLOCK{{/key}}](#keyblockkey)</code>
      - <code>[{{!key}}](#key)</code>
    - _helper tags_
      - <code>[{{#case expr}}BLOCK{{/case}}](#case-exprblockcase)</code>
      - <code>[{{data name[ key]}}](#data-name-key)</code>
      - <code>[{{#default}}BLOCK{{/default}}](#defaultblockdefault)</code>
      - <code>[{{#each key}}BLOCK{{/each}}](#each-keyblockeach)</code>
      - <code>[{{#helper}}BLOCK{{else}}INVERSE{{/helper}}](#helperblockelseinversehelper)</code>
      - <code>[{{helper [args...] [hashProperty=hashValue...]}}](#helper-args-hashpropertyhashvalue)</code>
      - <code>[{{#if key}}BLOCK{{/if}}](#if-keyblockif)</code>
      - <code>[{{@index [offset]}}](#index-offset)</code>
      - <code>[{{#is expr...}}BLOCK{{/is}}](#is-exprblockis)</code>
      - <code>[{{joinBase expr}}](#joinbase-expr)</code>
      - <code>[{{@key}}](#key)</code>
      - <code>[{{#log [message]}}](#log-message)</code>
      - <code>[{{#routeCurrent hashes}}SUBEXPRESSION{{/routeCurrent}}](#routecurrent-hashessubexpressionroutecurrent)</code>
      - <code>[routeCurrent([hashes])](#routecurrenthashes)</code>
      - <code>[{{routeUrl hashes [,merge]}}](#routeurl-hashes-merge)</code>
      - <code>[{{#helper [args...] [hashName=hashValue...]}}BLOCK{{/helper}}](#helper-args-hashnamehashvalueblockhelper)</code>
      - <code>[{{#helper [args...] [hashName=hashValue...]}}BLOCK{{else}}INVERSE{{/helper}}](#helper-args-hashnamehashvalueblockelseinversehelper)</code>
      - <code>[{{#switch expr}}BLOCK{{/switch}}](#switch-exprblockswitch)</code>
      - <code>[{{#unless key}}BLOCK{{/unless}}](#unless-keyblockunless)</code>
      - <code>[{{#with key}}BLOCK{{/with}}](#with-keyblockwith)</code>

## API


## <code>__can-stache__ function</code>
Live binding Mustache and Handlebars-comptable templates. 


### <code>stache(template)</code>


Processes the template and returns a renderer function that renders the template
with data and local helpers.


1. __template__ <code>{String}</code>:
  The text of a mustache template.
  

- __returns__ <code>{renderer}</code>:
  A renderer function that returns a live document fragment
  that can be inserted in the page.
  
#### simpleHelper `{function(*..., can-stache.sectionOptions, arg..., options)}`

A helper function passed to [registerSimpleHelper](#stacheregistersimplehelpername-helper). 



##### <code>function(*..., can-stache.sectionOptions, arg..., options)</code>


1. __undefined__ <code>{*}</code>:
  
1. __undefined__ <code>{can-stache.sectionOptions}</code>:
  
1. __arg__ <code>{*}</code>:
  Arguments passed from the tag. After the helper
  name, any space seperated [can.stache.key keys], numbers or
  strings are passed as arguments.
  
  The following template:
  
      <p>{{madLib "Lebron James" verb 4}}</p>
  
  Rendered with
  
      {verb: "swept"}
  
  Will call a `madLib` helper with the following arguements.
  
      stache.registerSimpleHelper('madLib',
        function(subject, verb, number){
          // subject -> "Lebron James"
          // verb -> "swept"
          // number -> 4
      });
  
  Unlike [can.stache.helper] simple helpers will always pass the actual
  value (instead of a compute).
  
1. __options__ <code>{can.stache.helperOptions}</code>:
  An options object
  that gets populated with optional:
  
  - `fn` and `inverse` section rendering functions
  - a `hash` object of the maps passed to the helper
  

- __returns__ <code>{String|function(HTMLElement)}</code>:
  The content to be inserted into
  the template.
  
#### helper `{function(*..., can.stache.sectionOptions, arg..., [options](#helperoptions-object))}`

A helper function passed to [registerHelper](#stacheregisterhelpername-helper). 



##### <code>function(*..., can.stache.sectionOptions, arg..., [options](#helperoptions-object))</code>


1. __undefined__ <code>{*}</code>:
  
1. __undefined__ <code>{can.stache.sectionOptions}</code>:
  
1. __arg__ <code>{*|can.compute}</code>:
  Arguments passed from the tag. After the helper
  name, any space seperated [keys](#key-string), numbers or 
  strings are passed as arguments. [can.stache.key Keys] that 
  read an observable value are passed as [can-compute.computed]'s.
  
1. __options__ <code>{[helperOptions](#helperoptions-object)}</code>:
  An options object
  that gets populated with optional:
  
  - `fn` and `inverse` section rendering functions 
  - a `hash` object of the maps passed to the helper 
  

- __returns__ <code>{documentFragment|String|can.contentArray|function(HTMLElement)}</code>:
  The content to be inserted into
  the template.
  
#### helperOptions `{Object}`

The options argument passed to a [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object). 



##### <code>Object</code>

- __fn__ <code>{[sectionRenderer](#sectionrenderer-functioncontext-helpers)(context, helpers)}</code>:
  Renders the "truthy" subsection 
  BLOCK.  `options.fn` is only available if the helper is called as a 
  [section](#keyblockkey) or [inverse section](#keyblockkey) like:
  `{{#helper}}` or `{{^helper}}.  The subsection BLOCK's 
  
  Available if the helper is called 
  as a section or inverse section. 
  [can.stache.helpers.sectionHelper section helper] is called.  Call `fn` to
  render the BLOCK with the specified `context`.
  
- __inverse__ <code>{[sectionRenderer](#sectionrenderer-functioncontext-helpers)(context, helpers)}</code>:
  Provided if a 
  [section helper](#helper-args-hashnamehashvalueblockhelper) is called 
  with [{{else}}](#helperblockelseinversehelper).  Call `inverse` to
  render the INVERSE with the specified `context`.
  
- __hash__ <code>{Object\<String,*|String|Number\>}</code>:
  An object containing all of the final 
  arguments listed as `name=value` pairs for the helper.
  	
  	{{helper arg1 arg2 name=value other=3 position="top"}}
  
  	options.hash = {
  		name: <context_lookup>.value,
  		other: 3,
  		position: "top"
  	}
  
- __context__ <code>{*}</code>:
  The current context the stache helper is called within.
  
      
      
      var temp = stache(
        "{{#person.name}}{{helper}}{{/person.name}}");
      
      var data = {person: {name: {first: "Justin"}}};
      
      can.stache.registerHelper("helper", function(options){
      
        options.context === data.person //-> true
        
      })
      
      
      temp(data);
      
      
  
- __scope__ <code>{can-view-scope}</code>:
  An object that represents the current context and all parent 
  contexts.  It can be used to look up [key](#key-string) values in the current scope.
  
      var temp = stache(
        "{{#person.name}}{{helper}}{{/person.name}}");
      
      var data = {person: {name: {first: "Justin"}}};
      
      stache.registerHelper("helper", function(options){
      
        options.scope.attr("first")   //-> "Justin"
        options.scope.attr("person")  //-> data.person
        
      })
      
      
      temp(data);
  
- __options__ <code>{can.view-scope.Options}</code>:
  An object that represents the local stache helpers.  It can be used to look 
  up [can.stache.key key] values
  
      var temp = stache("{{#person.name}}{{helper}}{{/person.name}}");
      
      var data = {person: {name: "Justin"}};
      
      stache.registerHelper("helper", function(options){
      
        options.options.attr("helpers.specialHelper") //-> function
        
      })
      
      
      temp(data, {
        specialHelper: function(){ ... }
      });
  
#### key `{String}`

A named reference to a value in the [can-view-scope scope] or  [can.view-scope.Options helper scope] in a template.




##### <code>String</code>


A key specifies a value in the [can.view.Scope scope] or 
[can-view-scope.Options options] of a template being rendered. The
key is used to look up a value in the scope.

What the key looks like changes the behavior of how a value is looked up in 
the scope. Keys can look like:

 - `{{name}}` - Single property name.
 - `{{name.first}}` - Multiple property names.
 - `{{foo\\.bar}}` - Single property name that includes a dot character.
 - `{{./name}}` - Single property in the current context.
 - `{{../name}}` - Single property in the parent context.
 - `{{.}}` or `{{this}}` - The current context.
 - `{{../.}}` - The parent context.
 - `{{@key}}` - Pass the value at key, even if it's a function or a compute.
 - `{{~key}}` - Pass a compute as the key's value instead of the value.
 - `{{*variable}}` - Reference a value in template scope.
 - `{{%key}}` - A special value that is added to scope. Examples:
    - `{{%index}}` - The index of a value in an array or [can.List].
    - `{{%key}}` - The property name of a value within an object or [can.Map].
    - `{{%element}}` - The element an event was dispatched on.
    - `{{%event}}` - The event object.
    - `{{%viewModel}}` - The viewModel of the current element.

#### sectionRenderer `{function(context, helpers)}`

Renders a section. These functions are usually provided as `.fn` and `.inverse` on a stache helper's [options](#helperoptions-object).




##### <code>function(context, helpers)</code>


1. __context__ <code>{*|can-view-scope}</code>:
  Specifies the data the section is rendered 
  with.  If a [can-view-scope] is provided, that scope is used to render the
  section.  If anything else is provided, it is used to create a new scope object
  with the current scope as it's parent.  If nothing is provided, the current
  scope is used to render the section.
  
1. __helpers__ <code>{*|can-view-scope.Options}</code>:
  Specifies the helpers the section is rendered 
  with.  If a [can-view-scope.Options] is provided, that scope is used to render the
  section.  If anything else is provided, it is used to create a new scope object
  with the current helper scope as it's parent.  If nothing is provided, the current
  helper scope is used to render the section.
  

- __returns__ <code>{documentFragment|String}</code>:
  Returns the rendered result of the helper. If the
  section is within a tag, like:
  
      <h1 {{#helper}}class='power'{{/helper}}>
  
  a String is returned.  
  
  If the section is outside a tag like: 
  
      <div> {{#helper}}<h2>Tasks</h2>{{/helper}} </div>
      
  a documentFragment is returned.
  

#### <code>stache.registerHelper(name, helper)</code>


The following template:

```handlebars
{{upper foo}}
```

```js
stache.registerHelper("upper", function(str){
	return str.toUpperCase();
});
```


1. __name__ <code>{String}</code>:
  The name of the helper.
1. __helper__ <code>{[helper](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)(*..., can.stache.sectionOptions, arg..., [options](#helperoptions-object))}</code>:
  The helper function.
  

#### <code>stache.registerSimpleHelper(name, helper)</code>


1. __name__ <code>{String}</code>:
  The name of the helper.
1. __helper__ <code>{can-stache.simplehelper}</code>:
  The helper function.
  

#### <code>stache.safeString(str)</code>



1. __str__ <code>{String}</code>:
  A string you don't want to become escaped.

- __returns__ <code>{String}</code>:
  A string flagged by `mustache` as safe, which will
  not become escaped, even if you use [{{{key}}}](#key)(triple slash).
  

#### <code>{{key}}</code>



1. __key__ <code>{[key](#key-string)}</code>:
  A key that references one of the following:
  
   - A [registered helper](#stacheregisterhelpername-helper).
   - A value within the current or parent
     [can-stache.context context]. If the value is a function or [can.compute], the
     function's return value is used.
  

- __returns__ <code>{String|function|*}</code>:
  
  
  After the key's value is found (and set to any function's return value),
  it is passed to [can.view.txt] as the result of a call to its `func`
  argument. There, if the value is a:
  
   - `null` or `undefined` - an empty string is inserted into the rendered template result.
   - `String` or `Number` - the value is inserted into the rendered template result.
   - `Function` - A [can.view.hook hookup] attribute or element is inserted so this function
     will be called back with the DOM element after it is created.
  

#### <code>{{{key}}}</code>


Behaves just like [{{key}}](#key) and [{{helper}}](#helper-args-hashpropertyhashvalue) but does not
escape the result.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or [can-compute.computed], the function's return value is used.

- __returns__ <code>{String|function|*}</code>:
  
  
  

#### <code>{{#key}}BLOCK{{/key}}</code>


Render blocks of text one or more times, depending
on the value of the key in the current context.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  [can-stache.context context]. If the value is a function or [can-compute.computed], the
  function's return value is used.
  
  

- __returns__ <code>{String}</code>:
  
  
  Depending on the value's type, the following actions happen:
  
  - `Array` or [can-list] - the block is rendered for
    each item in the array. The [can-stache.context context] is set to
    the item within each block rendering.
  - A `truthy` value - the block is rendered with the [can.stache.context context]
    set to the value.
  - A `falsey` value - the block is not rendered.
  
  The rendered result of the blocks, block or an empty string is returned.
  

#### <code>{{&key}}</code>


The `{{&key}}` tag is an alias for [{{{key}}}](#key), behaving just
like [{{key}}](#key) and [{{helper}}](#helper-args-hashpropertyhashvalue) but does not
escape the result.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or [can-compute.computed], the function's return value is used.

- __returns__ <code>{String|function|*}</code>:
  
  
  

#### <code>{{/key}}</code>


Ends a [{{#key}}](#keyblockkey) or [can-stache.tags.sectionHelper {{#helper}}]
block.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that matches the opening key or helper name. It's also
  possible to simply write `{{/}}` to end a block.
  

#### <code>{{^key}}BLOCK{{/key}}</code>


Render blocks of text if the value of the key
is falsey.  An inverted section syntax is similar to regular
sections except it begins with a caret rather than a
pound. If the value referenced is falsey, the section will render.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  [can-stache.context context]. If the value is a function or [can-compute.computed], the
  function's return value is used.
  

- __returns__ <code>{String}</code>:
  
  
  Depending on the value's type, the following actions happen:
  
  - A `truthy` value - the block is not rendered.
  - A `falsey` value - the block is rendered.
  
  The rendered result of the block or an empty string is returned.
  

#### <code>{{!key}}</code>


The comment tag operates similarly to a `<!-- -->` tag in HTML. It exists in your template but never shows up.


1. __key__ <code>{[key](#key-string)}</code>:
  Everything within this tag is completely ignored.

- __returns__ <code>{String}</code>:
  
  

#### <code>{{#case expr}}BLOCK{{/case}}</code>


Renders the `BLOCK` when `expr` matches the `expr` provided in the parent [{{#switch expr}}](#switch-exprblockswitch).


1. __expr__ <code>{can-stache.expression}</code>:
  An expression or key that references a value.
  
1. __BLOCK__ <code>{[can-stache](#stachetemplate)}</code>:
  a template that will render if the case clause resolves.
  

- __returns__ <code>{DocumentFragment}</code>:
  A fragment, possibly containing the rendered `BLOCK`.
  

#### <code>{{data name[ key]}}</code>


Adds the current [can-stache.context context] to the
element's [can-data].


1. __name__ <code>{String}</code>:
  The name of the data attribute to use for the
  context.
  

#### <code>{{#default}}BLOCK{{/default}}</code>


Renders the `BLOCK` if no [can.stache.helpers.case] blocks within the switch resolved.


1. __BLOCK__ <code>{can.stache}</code>:
  a template to be rendered.
  

- __returns__ <code>{DocumentFragment}</code>:
  A fragment, containing the rendered block.
  

#### <code>{{#each key}}BLOCK{{/each}}</code>


Render the block of text for each item in key's value.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or can.compute, the function's
  return value is used.
  
  If the value of the key is a [can.List], the resulting HTML is updated when the
  list changes. When a change in the list happens, only the minimum amount of DOM
  element changes occur.
  
  If the value of the key is a [can.Map], the resulting HTML is updated whenever
  attributes are added or removed. When a change in the map happens, only
  the minimum amount of DOM element changes occur.
  
1. __BLOCK__ <code>{can.stache}</code>:
  A template that is rendered for each item in
  the `key`'s value. The `BLOCK` is rendered with the context set to the item being rendered.
  

#### <code>{{#helper}}BLOCK{{else}}INVERSE{{/helper}}</code>


Creates an `inverse` block for a [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)'s
[options argument](#helperoptions-object)'s `inverse` property.


1. __INVERSE__ <code>{[can-stache](#stachetemplate)}</code>:
  a stache template coverted to a
  function and set as the [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)'s
  [options argument](#helperoptions-object)'s `inverse` property.
  

#### <code>{{helper [args...] [hashProperty=hashValue...]}}</code>


Calls a stache helper function or a function. For example:

The template:

    <p>{{madLib "Lebron James" verb 4 foo="bar"}}</p>

Rendered with:

    {verb: "swept"}

Will call a `madLib` helper with the following arguements:

    stache.registerHelper('madLib',
      function(subject, verb, number, options){
        // subject -> "Lebron James"
        // verb -> "swept"
        // number -> 4
        // options.hash.foo -> "bar"
    });


1. __helper__ <code>{[key](#key-string)}</code>:
  A key that finds a [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)
  that is either [registered](#stacheregisterhelpername-helper) or found within the
  current or parent [can-stache.context context].
  
1. __args__ <code>{[key](#key-string)|String|Number}</code>:
  Space seperated arguments
  that get passed to the helper function as arguments. If the key's value is a:
  
   - [can-map] - A getter/setter [can.compute] is passed.
   - [can-compute.computed] - The can.compute is passed.
   - `function` - The function's return value is passed.
  
1. __hashProperty__ <code>{String}</code>:
  
  
  A property name that gets added to a [helper options](#helperoptions-object)'s
  hash object.
  
1. __hashValue__ <code>{[key](#key-string)|String|Number}</code>:
  A value that gets
  set as a property value of the [helper option argument](#helperoptions-object)'s
  hash object.
  

#### <code>{{#if key}}BLOCK{{/if}}</code>


Renders the `BLOCK` template within the current template.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or can.compute, the function's return value is used.
  
1. __BLOCK__ <code>{[can-stache](#stachetemplate)}</code>:
  A stache template.
  

- __returns__ <code>{String}</code>:
  If the key's value is truthy, the `BLOCK` is rendered with the
  current context and its value is returned; otherwise, an empty string.
  

#### <code>{{@index [offset]}}</code>


Insert the index of an Array or [can-list] we are iterating on with [#each](can-stache.helpers.each)


1. __offset__ <code>{Number}</code>:
  The number to optionally offset the index by.
  

#### <code>{{#is expr...}}BLOCK{{/is}}</code>


Renders the `BLOCK` template within the current template.


1. __expr__ <code>{can-stache.expression}</code>:
  An expression or key that references a value within the current or parent
  
1. __BLOCK__ <code>{[can-stache](#stachetemplate)}</code>:
  A template that is rendered
  if the result of comparsion `expr1` and `expr2` value is truthy.
  

- __returns__ <code>{DocumentFragment}</code>:
  If the key's value is truthy, the `BLOCK` is rendered with the
  current context and its value is returned; otherwise, an empty string.
  

#### <code>{{joinBase expr}}</code>


Return an application-relative url for a resource.


1. __expr__ <code>{can-stache.expression}</code>:
  An expression or key that references a value within the current or parent scope.
  

- __returns__ <code>{String}</code>:
  An application-relative url.
  

#### <code>{{@key}}</code>


Insert the property name of an Object or attribute name of a can.Map that we iterate over with [#each](can.stache.helpers.each)


#### <code>{{#log [message]}}</code>


Logs the context of the current block with an optional message.


1. __message__ <code>{*}</code>:
  An optional message to log out in addition to the
  current context.
  

#### <code>{{#routeCurrent hashes}}SUBEXPRESSION{{/routeCurrent}}</code>


  Renders `SUBEXPRESSION` if the `hashes` passed to [can-route.current route.current] returns `true`.
  Renders the [{{else}}](#helperblockelseinversehelper) expression if [can-route.current route.current] returns `false`.
  

1. __hashes__ <code>{}</code>:
  A hash expression like `page='edit' recipeId=id`.
  

- __returns__ <code>{String}</code>:
  The result of `SUBEXPRESSION` or `{{else}}` expression.
  

#### <code>routeCurrent([hashes])</code>


  Calls [can-route.current can.route.current] with `hashes` and returns the result.


1. __hashes__ <code>{}</code>:
  A hash expression like `page='edit' recipeId=id`.
  

- __returns__ <code>{Boolean}</code>:
  Returns the result of calling [can-route.current route.current].
  

#### <code>{{routeUrl hashes [,merge]}}</code>


Passes the hashes to `route.url` and returns the result.


1. __hashes__ <code>{}</code>:
  A hash expression like `page='edit' recipeId=id`.
  
1. __merge__ <code>{Boolean}</code>:
  Pass `true` to create a url that merges `hashes` into the 
  current [can-route] properties.  Passing the `merge` argument is only available 
  in undefined like `routeUrl(id=itemId, true)`.
  

- __returns__ <code>{String}</code>:
  Returns the result of calling `route.url`.
  

#### <code>{{#helper [args...] [hashName=hashValue...]}}BLOCK{{/helper}}</code>


Calls a stache helper function or a function with a block to
render.

The template:

    <p>{{#countTo number}}{{num}}{{/countTo}}</p>

Rendered with:

    {number: 5}

Will call the `countTo` helper:

    stache.registerHelper('countTo',
      function(number, options){
        var out = [];
        for(var i =0; i < number; i++){
          var docFrag = options.fn({num: i+1});
          out.push( docFrag.textContent );
        }
        return out.join(" ");
    });

Results in:

    <p>1 2 3 4 5</p>


1. __helper__ <code>{[key](#key-string)}</code>:
  A key that finds a [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)
  that is either [registered](#stacheregisterhelpername-helper) or found within the
  current or parent [can-stache.context context].
  
1. __args__ <code>{[key](#key-string)|String|Number}</code>:
  Space seperated arguments
  that get passed to the helper function as arguments. If the key's value is a:
  
   - [can-map] - A getter/setter [can-compute.computed] is passed.
   - [can-compute.computed] - The compute is passed.
   - `function` - The function's return value is passed.
  
1. __hashProperty__ <code>{String}</code>:
  
  
  A property name that gets added to a [helper options](#helperoptions-object)'s
  hash object.
  
1. __hashValue__ <code>{[key](#key-string)|String|Number}</code>:
  A value that gets
  set as a property value of the [helper option argument](#helperoptions-object)'s
  hash object.
  
1. __BLOCK__ <code>{stache}</code>:
  A stache template that gets compiled and
  passed to the helper function as the [options argument's](#helperoptions-object) `fn`
  property.
  
  

#### <code>{{#helper [args...] [hashName=hashValue...]}}BLOCK{{else}}INVERSE{{/helper}}</code>


Calls a stache helper function or a function with a `fn` and `inverse` block to
render.

The template:

    <p>The bed is
       {{#isJustRight firmness}}
          pefect!
       {{else}}
          uncomfortable.
       {{/justRight}}</p>

Rendered with:

    {firmness: 45}

Will call the `isJustRight` helper:

    stache.registerHelper('isJustRight',
      function(number, options){
        if(number > 50){
          return options.fn(this);
        } else {
          return options.inverse(this);
        }
    });

Results in:

    <p>The bed is uncomfortable.</p>


1. __helper__ <code>{[key](#key-string)}</code>:
  A key that finds a [helper function](#helper-function-canstachesectionoptions-arg-optionshelperoptions-object)
  that is either [registered](#stacheregisterhelpername-helper) or found within the
  current or parent [can-stache.context context].
  
1. __args__ <code>{[key](#key-string)|String|Number}</code>:
  Space seperated arguments
  that get passed to the helper function as arguments. If the key's value is a:
  
   - [can-map] - A getter/setter [can-compute.computed] is passed.
   - [can-compute.computed] - The compute is passed.
   - `function` - The function's return value is passed.
  
1. __hashProperty__ <code>{String}</code>:
  
  
  A property name that gets added to a [helper options](#helperoptions-object)'s
  hash object.
  
1. __hashValue__ <code>{[key](#key-string)|String|Number}</code>:
  A value that gets
  set as a property value of the [helper option argument](#helperoptions-object)'s
  hash object.
  
1. __BLOCK__ <code>{stache}</code>:
  A stache template that gets compiled and
  passed to the helper function as the [options argument's](#helperoptions-object) `fn`
  property.
  
1. __INVERSE__ <code>{stache}</code>:
  A stache template that gets compiled and
  passed to the helper function as the [options argument's](#helperoptions-object) `inverse`
  property.
  
  

#### <code>{{#switch expr}}BLOCK{{/switch}}</code>


Renders the `BLOCK` with contextual [{{#case expr}}](#case-exprblockcase) and [{{#default}}](#defaultblockdefault) helpers.


1. __expr__ <code>{can-stache.expression}</code>:
  An expression or key that references a value that will be switched on.
  
1. __BLOCK__ <code>{[can-stache](#stachetemplate)}</code>:
  a template that is rendered, uses [{{#case expr}}](#case-exprblockcase) and [{{#default}}](#defaultblockdefault) helpers to match `expr`.
  

- __returns__ <code>{DocumentFragment}</code>:
  A fragment containing the rendered `BLOCK`.
  

#### <code>{{#unless key}}BLOCK{{/unless}}</code>


Render the block of text if the key's value is falsey.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or [can-compute.computed], the function's
  return value is used.
  
1. __BLOCK__ <code>{can.stache}</code>:
  A template that is rendered
  if the `key`'s value is falsey.
  

#### <code>{{#with key}}BLOCK{{/with}}</code>


Changes the context within a block.


1. __key__ <code>{[key](#key-string)}</code>:
  A key that references a value within the current or parent
  context. If the value is a function or [can-compute.computed], the function's
  return value is used.
  
1. __BLOCK__ <code>{can.stache}</code>:
  A template that is rendered
  with the context of the `key`'s value.
  
## Contributing

### Making a Build

To make a build of the distributables into `dist/` in the cloned repository run

```
npm install
node build
```

### Running the tests

Tests can run in the browser by opening a webserver and visiting the `test.html` page.
Automated tests that run the tests from the command line in Firefox can be run with

```
npm test
```
