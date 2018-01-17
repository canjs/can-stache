/*can-stache@3.14.8#can-stache*/
define([
    'require',
    'exports',
    'module',
    'can-view-parser',
    'can-view-callbacks',
    './src/html_section',
    './src/text_section',
    './src/mustache_core',
    './helpers/core',
    './helpers/converter',
    './src/intermediate_and_imports',
    './src/utils',
    'can-attribute-encoder',
    'can-log/dev',
    'can-namespace',
    'can-globals/document',
    'can-util/js/assign',
    'can-util/js/last',
    'can-util/js/import',
    'can-view-target',
    'can-view-nodelist'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var parser = require('can-view-parser');
        var viewCallbacks = require('can-view-callbacks');
        var HTMLSectionBuilder = require('./src/html_section');
        var TextSectionBuilder = require('./src/text_section');
        var mustacheCore = require('./src/mustache_core');
        var mustacheHelpers = require('./helpers/core');
        require('./helpers/converter');
        var getIntermediateAndImports = require('./src/intermediate_and_imports');
        var makeRendererConvertScopes = require('./src/utils').makeRendererConvertScopes;
        var attributeEncoder = require('can-attribute-encoder');
        var dev = require('can-log/dev');
        var namespace = require('can-namespace');
        var DOCUMENT = require('can-globals/document');
        var assign = require('can-util/js/assign');
        var last = require('can-util/js/last');
        var importer = require('can-util/js/import');
        require('can-view-target');
        require('can-view-nodelist');
        if (!viewCallbacks.tag('content')) {
            viewCallbacks.tag('content', function (el, tagData) {
                return tagData.scope;
            });
        }
        var wrappedAttrPattern = /[{(].*[)}]/;
        var colonWrappedAttrPattern = /^on:|(:to|:from|:bind)$|.*:to:on:.*/;
        var svgNamespace = 'http://www.w3.org/2000/svg';
        var namespaces = {
                'svg': svgNamespace,
                'g': svgNamespace
            }, textContentOnlyTag = {
                style: true,
                script: true
            };
        function stache(filename, template) {
            if (arguments.length === 1) {
                template = arguments[0];
                filename = undefined;
            }
            var inlinePartials = {};
            if (typeof template === 'string') {
                template = mustacheCore.cleanWhitespaceControl(template);
                template = mustacheCore.cleanLineEndings(template);
            }
            var section = new HTMLSectionBuilder(filename), state = {
                    node: null,
                    attr: null,
                    sectionElementStack: [],
                    text: false,
                    namespaceStack: [],
                    textContentOnly: null
                }, makeRendererAndUpdateSection = function (section, mode, stache, lineNo) {
                    if (mode === '>') {
                        section.add(mustacheCore.makeLiveBindingPartialRenderer(stache, copyState({ lineNo: lineNo })));
                    } else if (mode === '/') {
                        var createdSection = section.last();
                        if (createdSection.startedWith === '<') {
                            inlinePartials[stache] = section.endSubSectionAndReturnRenderer();
                            section.removeCurrentNode();
                        } else {
                            section.endSection();
                        }
                        if (section instanceof HTMLSectionBuilder) {
                            state.sectionElementStack.pop();
                        }
                    } else if (mode === 'else') {
                        section.inverse();
                    } else {
                        var makeRenderer = section instanceof HTMLSectionBuilder ? mustacheCore.makeLiveBindingBranchRenderer : mustacheCore.makeStringBranchRenderer;
                        if (mode === '{' || mode === '&') {
                            section.add(makeRenderer(null, stache, copyState({ lineNo: lineNo })));
                        } else if (mode === '#' || mode === '^' || mode === '<') {
                            var renderer = makeRenderer(mode, stache, copyState({ lineNo: lineNo }));
                            section.startSection(renderer);
                            section.last().startedWith = mode;
                            if (section instanceof HTMLSectionBuilder) {
                                state.sectionElementStack.push({ type: 'section' });
                            }
                        } else {
                            section.add(makeRenderer(null, stache, copyState({
                                text: true,
                                lineNo: lineNo
                            })));
                        }
                    }
                }, copyState = function (overwrites) {
                    var lastElement = state.sectionElementStack[state.sectionElementStack.length - 1];
                    var cur = {
                        tag: state.node && state.node.tag,
                        attr: state.attr && state.attr.name,
                        directlyNested: state.sectionElementStack.length ? lastElement.type === 'section' || lastElement.type === 'custom' : true,
                        textContentOnly: !!state.textContentOnly
                    };
                    return overwrites ? assign(cur, overwrites) : cur;
                }, addAttributesCallback = function (node, callback) {
                    if (!node.attributes) {
                        node.attributes = [];
                    }
                    node.attributes.unshift(callback);
                };
            parser(template, {
                filename: filename,
                start: function (tagName, unary, lineNo) {
                    var matchedNamespace = namespaces[tagName];
                    if (matchedNamespace && !unary) {
                        state.namespaceStack.push(matchedNamespace);
                    }
                    state.node = {
                        tag: tagName,
                        children: [],
                        namespace: matchedNamespace || last(state.namespaceStack)
                    };
                },
                end: function (tagName, unary, lineNo) {
                    var isCustomTag = viewCallbacks.tag(tagName);
                    if (unary) {
                        section.add(state.node);
                        if (isCustomTag) {
                            addAttributesCallback(state.node, function (scope, options, parentNodeList) {
                                viewCallbacks.tagHandler(this, tagName, {
                                    scope: scope,
                                    options: options,
                                    subtemplate: null,
                                    templateType: 'stache',
                                    parentNodeList: parentNodeList
                                });
                            });
                        }
                    } else {
                        section.push(state.node);
                        state.sectionElementStack.push({
                            type: isCustomTag ? 'custom' : null,
                            tag: isCustomTag ? null : tagName,
                            templates: {}
                        });
                        if (isCustomTag) {
                            section.startSubSection();
                        } else if (textContentOnlyTag[tagName]) {
                            state.textContentOnly = new TextSectionBuilder();
                        }
                    }
                    state.node = null;
                },
                close: function (tagName, lineNo) {
                    var matchedNamespace = namespaces[tagName];
                    if (matchedNamespace) {
                        state.namespaceStack.pop();
                    }
                    var isCustomTag = viewCallbacks.tag(tagName), renderer;
                    if (isCustomTag) {
                        renderer = section.endSubSectionAndReturnRenderer();
                    }
                    if (textContentOnlyTag[tagName]) {
                        section.last().add(state.textContentOnly.compile(copyState()));
                        state.textContentOnly = null;
                    }
                    var oldNode = section.pop();
                    if (isCustomTag) {
                        if (tagName === 'can-template') {
                            var parent = state.sectionElementStack[state.sectionElementStack.length - 2];
                            if (renderer) {
                                parent.templates[oldNode.attrs.name] = makeRendererConvertScopes(renderer);
                            }
                            section.removeCurrentNode();
                        } else {
                            var current = state.sectionElementStack[state.sectionElementStack.length - 1];
                            addAttributesCallback(oldNode, function (scope, options, parentNodeList) {
                                viewCallbacks.tagHandler(this, tagName, {
                                    scope: scope,
                                    options: options,
                                    subtemplate: renderer ? makeRendererConvertScopes(renderer) : renderer,
                                    templateType: 'stache',
                                    parentNodeList: parentNodeList,
                                    templates: current.templates
                                });
                            });
                        }
                    }
                    state.sectionElementStack.pop();
                },
                attrStart: function (attrName, lineNo) {
                    if (state.node.section) {
                        state.node.section.add(attrName + '="');
                    } else {
                        state.attr = {
                            name: attrName,
                            value: ''
                        };
                    }
                },
                attrEnd: function (attrName, lineNo) {
                    if (state.node.section) {
                        state.node.section.add('" ');
                    } else {
                        if (!state.node.attrs) {
                            state.node.attrs = {};
                        }
                        state.node.attrs[state.attr.name] = state.attr.section ? state.attr.section.compile(copyState()) : state.attr.value;
                        var attrCallback = viewCallbacks.attr(attrName);
                        if (attrCallback) {
                            if (!state.node.attributes) {
                                state.node.attributes = [];
                            }
                            state.node.attributes.push(function (scope, options, nodeList) {
                                attrCallback(this, {
                                    attributeName: attrName,
                                    scope: scope,
                                    options: options,
                                    nodeList: nodeList
                                });
                            });
                        }
                        state.attr = null;
                    }
                },
                attrValue: function (value, lineNo) {
                    var section = state.node.section || state.attr.section;
                    if (section) {
                        section.add(value);
                    } else {
                        state.attr.value += value;
                    }
                },
                chars: function (text, lineNo) {
                    (state.textContentOnly || section).add(text);
                },
                special: function (text, lineNo) {
                    var firstAndText = mustacheCore.splitModeFromExpression(text, state), mode = firstAndText.mode, expression = firstAndText.expression;
                    if (expression === 'else') {
                        var inverseSection;
                        if (state.attr && state.attr.section) {
                            inverseSection = state.attr.section;
                        } else if (state.node && state.node.section) {
                            inverseSection = state.node.section;
                        } else {
                            inverseSection = state.textContentOnly || section;
                        }
                        inverseSection.inverse();
                        return;
                    }
                    if (mode === '!') {
                        return;
                    }
                    if (state.node && state.node.section) {
                        makeRendererAndUpdateSection(state.node.section, mode, expression, lineNo);
                        if (state.node.section.subSectionDepth() === 0) {
                            state.node.attributes.push(state.node.section.compile(copyState()));
                            delete state.node.section;
                        }
                    } else if (state.attr) {
                        if (!state.attr.section) {
                            state.attr.section = new TextSectionBuilder();
                            if (state.attr.value) {
                                state.attr.section.add(state.attr.value);
                            }
                        }
                        makeRendererAndUpdateSection(state.attr.section, mode, expression, lineNo);
                    } else if (state.node) {
                        if (!state.node.attributes) {
                            state.node.attributes = [];
                        }
                        if (!mode) {
                            state.node.attributes.push(mustacheCore.makeLiveBindingBranchRenderer(null, expression, copyState({ lineNo: lineNo })));
                        } else if (mode === '#' || mode === '^') {
                            if (!state.node.section) {
                                state.node.section = new TextSectionBuilder();
                            }
                            makeRendererAndUpdateSection(state.node.section, mode, expression, lineNo);
                        } else {
                            throw new Error(mode + ' is currently not supported within a tag.');
                        }
                    } else {
                        makeRendererAndUpdateSection(state.textContentOnly || section, mode, expression, lineNo);
                    }
                },
                comment: function (text) {
                    section.add({ comment: text });
                },
                done: function (lineNo) {
                }
            });
            var renderer = section.compile();
            var scopifiedRenderer = HTMLSectionBuilder.scopify(function (scope, optionsScope, nodeList) {
                if (Object.keys(inlinePartials).length) {
                    optionsScope.inlinePartials = optionsScope.inlinePartials || {};
                    assign(optionsScope.inlinePartials, inlinePartials);
                }
                scope.set('scope.view', scopifiedRenderer);
                scope.set('scope.root', scope._context);
                return renderer.apply(this, arguments);
            });
            return scopifiedRenderer;
        }
        assign(stache, mustacheHelpers);
        stache.safeString = function (text) {
            return {
                toString: function () {
                    return text;
                }
            };
        };
        stache.async = function (source) {
            var iAi = getIntermediateAndImports(source);
            var importPromises = iAi.imports.map(function (moduleName) {
                return importer(moduleName);
            });
            return Promise.all(importPromises).then(function () {
                return stache(iAi.intermediate);
            });
        };
        var templates = {};
        stache.from = mustacheCore.getTemplateById = function (id) {
            if (!templates[id]) {
                var el = DOCUMENT().getElementById(id);
                templates[id] = stache('#' + id, el.innerHTML);
            }
            return templates[id];
        };
        stache.registerPartial = function (id, partial) {
            templates[id] = typeof partial === 'string' ? stache(partial) : partial;
        };
        module.exports = namespace.stache = stache;
    }(function () {
        return this;
    }(), require, exports, module));
});