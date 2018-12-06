var canReflect = require("can-reflect");
var live = require("can-view-live");
var nodeLists = require("can-view-nodelist");
var Observation = require("can-observation");
var getDocument = require("can-globals/document/document");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node");

function portalHelper(elementObservable, options){
	function evaluator() {
		return options.fn(
			options.scope
			.addLetContext({}),
			options.options
		);
	}

	var el, nodeList;
	function teardown() {
		if(el) {
			canReflect.offValue(elementObservable, getElementAndRender);
			el = null;
		}

		if(nodeList) {
			nodeLists.remove(nodeList);
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
			nodeList = [node];
			nodeList.expression = "live.html";
			nodeLists.register(nodeList, null, null, true);

			var observable = new Observation(evaluator, null, {isObservable: false});

			live.html(node, observable, el, nodeList);

			canReflect.onValue(elementObservable, getElementAndRender);
			domMutate.onNodeRemoval(el, teardown);
		}
	}

	getElementAndRender();

	return function(el) {
		var comment = getDocument().createComment("portal(" + canReflect.getName(elementObservable) + ")");
		var frag = getDocument().createDocumentFragment();
		domMutateNode.appendChild.call(frag, comment);
		nodeLists.replace([el], frag);

		var nodeList = [comment];
		nodeList.expression = "portal";
		nodeLists.register(nodeList, teardown, options.nodeList, true);
		nodeLists.update(options.nodeList, [comment]);
	};
}

portalHelper.isLiveBound = true;
portalHelper.requiresOptionsArgument = true;

module.exports = portalHelper;
