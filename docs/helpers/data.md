@function can-stache.helpers.data {{data name}}
@parent can-stache/deprecated

@deprecated {4.3.0} Use [can-stache.helpers.domData] instead.

@signature `{{data name[ key]}}`

Adds the current [can.stache.context context] to the
element's [can.data].

@param {String} [key] An optional key used to specify what data should be stored in [can-dom-data].  It defaults to the context (`this`) if no key is specified.
