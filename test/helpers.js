var stache = require("can-stache");
var childNodes = require("can-child-nodes");

var removePlaceholderNodes = function(node){
	var children = Array.from(childNodes(node));
	for(var i = 0; i < children.length; i++) {
		if(children[i].nodeType === Node.COMMENT_NODE) {
			node.removeChild(children[i]);
		} else if(children[i].nodeType === Node.ELEMENT_NODE) {
			createHelpers.removePlaceholderNodes(children[i]);
		}
	}
	return node;
};

function cloneAndClean(node) {
	return removePlaceholderNodes( node.cloneNode(true) );
}

var createHelpers = function(doc) {
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
			return this.cleanHTMLTextForIE( cloneAndClean(div).innerHTML );
		},
		innerHTML: function(node){
			return "innerHTML" in node ?
				node.innerHTML :
				undefined;
		},
		removePlaceholderNodes: removePlaceholderNodes,
		cloneAndClean: cloneAndClean
	};
};

createHelpers.removePlaceholderNodes = removePlaceholderNodes;

module.exports = createHelpers;
