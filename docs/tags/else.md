@function can-stache.helpers.else {{else}}
@parent can-stache.tags 4

@signature `{{#helper}}BLOCK{{else}}INVERSE{{/helper}}`

Creates an `inverse` block for a [can-stache.helper helper function]'s
[can-stache.helperOptions options argument]'s `inverse` property.

@param {can-stache.sectionRenderer} INVERSE A partial stache template
converted into a function and set as the [can-stache.helper helper function]'s
[can-stache.helperOptions options argument]'s `inverse` property.

@body

## Use

For more information on how `{{else}}` is used checkout:

 - [can-stache.helpers.if]
 - [can-stache.tags.section]
