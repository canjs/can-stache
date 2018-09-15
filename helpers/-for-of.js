var helpers = require("can-stache-helpers");
var canReflect = require("can-reflect");
var Observation = require("can-observation");
var live = require('can-view-live');
var nodeLists = require('can-view-nodelist');

var bindAndRead = function (value) {
	if ( value && canReflect.isValueLike(value) ) {
		Observation.temporarilyBind(value);
		return canReflect.getValue(value);
	} else {
		return value;
	}
};

// this is called with the ast ... we are going to use that to our advantage.
var forHelper = function(helperOptions) {
	// lookup

	// TODO: remove in prod
	// make sure we got called with the right stuff
	if(helperOptions.exprData.argExprs.length !== 1) {
		throw new Error("for(of) broken syntax");
	}


	// TODO: check if an instance of helper;
	var helperExpr = helperOptions.exprData.argExprs[0].expr;

	// TODO: remove in prod
	var inLookup = helperExpr.argExprs[0];
	if(inLookup.key !== "of") {
		throw new Error("for(of) broken syntax");
	}

	var variableName = helperExpr.methodExpr.key;
	var valueLookup = helperExpr.argExprs[1];
	var valueObservable = valueLookup.value(helperOptions.scope);

	var items =  valueObservable;

	var args = [].slice.call(arguments),
		options = args.pop(),
		resolved = bindAndRead(items);



	if ((
		canReflect.isObservableLike(resolved) && canReflect.isListLike(resolved) ||
			( canReflect.isListLike(resolved) && canReflect.isValueLike(items) )
	) && !options.stringOnly) {
		// Tells that a helper has been called, this function should be returned through
		// checking its value.
		options.metadata.rendered = true;
		return function(el){
			// make a child nodeList inside the can.view.live.html nodeList
			// so that if the html is re
			var nodeList = [el];
			nodeList.expression = "live.list";
			nodeLists.register(nodeList, null, options.nodeList, true);
			// runs nest replacements
			nodeLists.update(options.nodeList, [el]);


			var cb = function (item, index, parentNodeList) {
				var variableScope = {};
				variableScope[variableName] = item;
				return options.fn(
					options.scope
					.addLetContext(variableScope),
				options.options,
				parentNodeList
				);
			};

			live.list(el, items, cb, options.context, el.parentNode, nodeList, function(list, parentNodeList){
				return options.inverse(options.scope.add(list), options.options, parentNodeList);
			});
		};
	}
	/*
	var expr = resolve(items),
		result;

	if (!!expr && canReflect.isListLike(expr)) {
		result = utils.getItemsFragContent(expr, options, options.scope);
		return options.stringOnly ? result.join('') : result;
	} else if (canReflect.isObservableLike(expr) && canReflect.isMapLike(expr) || expr instanceof Object) {
		result = [];
		canReflect.each(expr, function(val, key){
			var value = new KeyObservable(expr, key);
			aliases = {};

			if (canReflect.size(hashOptions) > 0) {
				if (hashOptions.value) {
					aliases[hashOptions.value] = value;
				}
				if (hashOptions.key) {
					aliases[hashOptions.key] = key;
				}
			}
			result.push(options.fn(
				options.scope
				.add(aliases, { notContext: true })
				.add({ key: key }, { special: true })
				.add(value)
			));
		});

		return options.stringOnly ? result.join('') : result;
	}*/
};
forHelper.isLiveBound = true;
forHelper.requiresOptionsArgument = true;
forHelper.ignoreArgLookup = function ignoreArgLookup(index) {
	return index === 0;
};


helpers.for = forHelper;
