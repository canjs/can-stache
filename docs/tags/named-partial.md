@function can-stache.tags.named-partial {{<partialName}}
@parent can-stache.tags 6

Create a named partial template within the current template.

@signature `{{<partialName}}BLOCK{{/partialName}}`

Creates a reusable sub template from `BLOCK` named `partialName` that can be rendered recursively or in the current scope using [can-stache.tags.partial {{>partialName}}].

```js
var template = stache(`
  {{<addressTemplate}}
    <div>{{street}}, {{city}}</div>
  {{/addressTemplate}}

  <div>
    {{#with business.address}}
      {{>addressTemplate}}
    {{/with}}
  </div>
  <ul>
    {{#each business.people}}
      <li>
        {{fullName}}, {{birthday}}
        {{>addressTemplate address}}
      </li>
    {{/each}}
  </ul>
`);
```

@param {String} partialName The name of the partial.   

@param {can-stache.sectionRenderer} BLOCK a template to be captured and rendered later.



@body

## Use

Named Partials are sub templates in a larger template that aren't rendered until referenced by the [can-stache.tags.partial partial tag]. They can be referenced any number of times with different contexts.

```
DATA
  {
    business: {
      name: "Bitvoi",
      address: { street: "Hello", city: "World" }
    },
    people: [
      {
        fullName: "James Atherton",
        address: {
          street: "123 45th Street",
          city: "Moline"
        }
      },
      {
        fullName: "Someone Else",
        address: {
          street: "678 90th St",
          city: "Chicago"
        }
      }
    ]
  }

TEMPLATE:
  {{<addressTemplate}}
    <div>{{street}}, {{city}}</div>
  {{/addressTemplate}}

  <div>
    {{#with business.address}}
      {{>addressTemplate}}
    {{/with}}
  </div>
  <ul>
    {{#each business.people}}
      <li>
        {{fullName}}
        {{>addressTemplate address}}
      </li>
    {{/each}}
  </ul>

RESULT:
  <div>
    <div>Hello, World</div>
  </div>
  <ul>
      <li>
        James Atherton
        <div>123 45th Street, Moline</div>
      </li>
      <li>
        Someone Else
        <div>678 90th St, Chicago</div>
      </li>
  </ul>

```

Named Partials can also have a template block that references its own name in a [can-stache.tags.partial partial tag], which creates recursion. (So make sure you avoid infinite loops!)

```
DATA:
  {
    yayRecursion: {
      name: "Root",
      nodes: [
        {
          name: "Leaf #1 in Root",
          nodes: []
        },
        {
          name: "Branch under Root",
          nodes: [
            {
              name: "Leaf in Branch",
              nodes: []
            }
          ]
        },
        {
          name: "Leaf #2 in Root",
          nodes: []
        }
      ]
    }
  }

TEMPLATE:
  {{<recursive}}
    <div>{{./name}} <b>Type:</b> {{#if ./nodes.length}}Branch{{else}}Leaf{{/if}}</div>
    {{#each ./nodes}}
      {{>recursive .}}
    {{/each}}
  {{/recursive}}

  {{>recursive yayRecursion}}

RESULT:
  <div>Root <b>Type:</b> Branch</div>
  <div>Leaf #1 in Root <b>Type:</b> Leaf</div>
  <div>Branch under Root <b>Type:</b> Branch</div>
  <div>Leaf in Branch <b>Type:</b> Leaf</div>
  <div>Leaf #2 in Root <b>Type:</b> Leaf</div>
```

## Too Much Recursion

When working with recursive named partials, be aware that by default, expressions will walk up the context chain if the property is not found in the current context.

So if your data and template looks like this:

```
DATA:
  {
    yayRecursion: {
      name: "Root",
      nodes: [
        {
          name: "Branch #1 in Root",
          nodes: [
            {
              name: "Problem Child",
              nodes: undefined
            }
          ]
        }
      ]
    }
  }

TEMPLATE:
  {{<recursive}}
    <div>{{name}} <b>Type:</b> {{#if nodes.length}}Branch{{else}}Leaf{{/if}}</div>
    {{#each nodes}}
      {{>recursive}}
    {{/each}}
  {{/recursive}}

  {{>recursive yayRecursion}}
```

then you'll be recursing on `nodes` and your output will be something like this:

```html
RESULT:
  <div>Root <b>Type:</b> Branch</div>
  <div>Branch #1 in Root <b>Type:</b> Leaf</div>
  <div>Problem Child <b>Type:</b> Branch</div>
  <div>Problem Child <b>Type:</b> Branch</div>
  <div>Problem Child <b>Type:</b> Branch</div>
  <div>Problem Child <b>Type:</b> Branch</div>
  ...
  <div>Problem Child <b>Type:</b> Branch</div>
  (hangs from too much recursion)
```

This is because when it's rendering that Named Partial with "Problem Child" as the context, the template sees `nodes` here: `{{#each nodes}}`, then it checks the current context (Problem Child), doesn't find anything called `nodes`, then moves up the scope to its parent context to check for `nodes`. Since `nodes` is on the parent (and contains the Problem Child), it uses that for the #each and you're stuck in infinite recursion.

To avoid that, it's best practice to always be specific about the context for your expressions within a Named Partial:

```
  {{<recursive}}
    <div>{{./name}} <b>Type:</b> {{#if ./nodes.length}}Branch{{else}}Leaf{{/if}}</div>
    {{#each ./nodes}}
      {{>recursive .}}
    {{/each}}
  {{/recursive}}

  {{>recursive yayRecursion}}
```

which prevents the default behavior for expressions to look up the context chain.
