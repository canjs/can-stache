@function can-stache.helpers.key {{@key}}

@parent can-stache.htags 11

@signature `{{@key}}`

Insert the property name of an Object or attribute name of a [can-map] that we iterate over with [#each](can-stache.helpers.each)

@body

## Use

Use `{{@key}}` to render the property or attribute name of an Object or Map, when iterating over it with [can-stache.helpers.each each]. For example,

The template:

    <ul>
      {{#each person}}
        <li> {{@key}}: {{.}} </li>
      {{/each}}
    </ul>

Rendered with:

    { person: {name: 'Josh', age: 27, likes: 'Stache, JavaScript, High Fives'} }

Renders:

    <ul>
      <li> name: Josh </li>
      <li> age: 27 </li>
      <li> likes: Stache, JavaScript, High Fives </li>
    </ul>

