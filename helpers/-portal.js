var canReflect = require("can-reflect");
var live = require("can-view-live");
var Observation = require("can-observation");
var getDocument = require("can-globals/document/document");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node");
var canSymbol = require("can-symbol");

var keepNodeSymbol = canSymbol.for("done.keepNode");

function portalHelper(elementObservable, options){
	function evaluator() {
		var frag = options.fn(
			options.scope
			.addLetContext({}),
			options.options
		);

		var child = frag.firstChild;
		while(child) {
			child[keepNodeSymbol] = true;
			child = child.nextSibling;
		}

		return frag;
	}

	var el, nodeList, removeNodeRemovalListener;
	function teardown() {
		var root = el;

		if(removeNodeRemovalListener) {
			removeNodeRemovalListener();
			removeNodeRemovalListener = null;
		}

		if(el) {
			canReflect.offValue(elementObservable, getElementAndRender);
			el = null;
		}

		if(nodeList) {
			canReflect.eachListLike(nodeList, function(node) {
				if(root === node.parentNode) {
					domMutateNode.removeChild.call(root, node);
				}
			});
			nodeList = null;
		}
	}

	function getElementAndRender() {
		teardown();
		el = canReflect.getValue(elementObservable);

		if(el) {
			var node = getDocument().createTextNode("");
			domMutateNode.appendChild.call(el, node);

			// make a child nodeList inside the can.view.live.html nodeList
			// so that if the html is re

			var observable = new Observation(evaluator, null, {isObservable: false});

			live.html(node, observable);
			removeNodeRemovalListener = domMutate.onNodeRemoval(el, teardown);
		} else {
			options.metadata.rendered = true;
		}
		canReflect.onValue(elementObservable, getElementAndRender);
	}

	getElementAndRender();

	return function(el) {
		var doc = getDocument();
		var comment = doc.createComment("portal(" + canReflect.getName(elementObservable) + ")");
		var frag = doc.createDocumentFragment();
		domMutateNode.appendChild.call(frag, comment);
		/*nodeLists.replace([el], frag);

		var nodeList = [comment];
		nodeList.expression = "portal";
		nodeLists.register(nodeList, teardown, options.nodeList, true);
		nodeLists.update(options.nodeList, [comment]);*/
	};
}

portalHelper.isLiveBound = true;
portalHelper.requiresOptionsArgument = true;

module.exports = portalHelper;
