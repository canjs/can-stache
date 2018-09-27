var stache = require("can-stache");

module.exports = function(doc) {
	doc = doc || document;
	return {
		cleanHTMLTextForIE: function(html){  // jshint ignore:line
			return html.replace(/ stache_0\.\d+="[^"]+"/g,"").replace(/<(\/?[-A-Za-z0-9_]+)/g, function(whole, tagName){
				return "<"+tagName.toLowerCase();
			}).replace(/\r?\n/g,"");
		},
		getText: function(template, data, options){
			var div = document.createElement("div");
			div.appendChild( stache(template)(data, options) );
			return this.cleanHTMLTextForIE( div.innerHTML );
		}
	};
};
