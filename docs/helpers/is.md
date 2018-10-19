@function can-stache.helpers.is {{#is(expressions)}}
@parent can-stache/deprecated

@signature `{{#is([EXPRESSION...])}}FN{{else}}INVERSE{{/is}}`

Render FN if two values are equal, otherwise render INVERSE.

`is` is an alias for [can-stache.helpers.eq the `eq` helper].
