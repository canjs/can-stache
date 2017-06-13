/*can-stache@3.1.0-pre.6#can-stache*/
define(function (require, exports, module) {
    var parser = require('can-view-parser');
    var viewCallbacks = require('can-view-callbacks');
    var HTMLSectionBuilder = require('./src/html_section');
    var TextSectionBuilder = require('./src/text_section');
    var mustacheCore = require('./src/mustache_core');
    var mustacheHelpers = require('./helpers/core');
    require('./helpers/converter');
    var getIntermediateAndImports = require('./src/intermediate_and_imports');
    var dev = require('can-util/js/dev');
    var namespace = require('can-namespace');
    var DOCUMENT = require('can-util/dom/document');
    var assign = require('can-util/js/assign');
    var last = require('can-util/js/last');
    var importer = require('can-util/js/import');
    require('can-view-target');
    require('can-view-nodelist');
    viewCallbacks.tag('content', function (el, tagData) {
        return tagData.scope;
    });
    var svgNamespace = 'http://www.w3.org/2000/svg';
    var namespaces = {
            'svg': svgNamespace,
            'g': svgNamespace
        }, textContentOnlyTag = {
            style: true,
            script: true
        };
    function stache(template) {
        if (typeof template === 'string') {
            template = mustacheCore.cleanLineEndings(template);
        }
        var section = new HTMLSectionBuilder(), state = {
                node: null,
                attr: null,
                sectionElementStack: [],
                text: false,
                namespaceStack: [],
                textContentOnly: null
            }, makeRendererAndUpdateSection = function (section, mode, stache) {
                if (mode === '>') {
                    section.add(mustacheCore.makeLiveBindingPartialRenderer(stache, copyState()));
                } else if (mode === '/') {
                    section.endSection();
                    if (section instanceof HTMLSectionBuilder) {
                        state.sectionElementStack.pop();
                    }
                } else if (mode === 'else') {
                    section.inverse();
                } else {
                    var makeRenderer = section instanceof HTMLSectionBuilder ? mustacheCore.makeLiveBindingBranchRenderer : mustacheCore.makeStringBranchRenderer;
                    if (mode === '{' || mode === '&') {
                        section.add(makeRenderer(null, stache, copyState()));
                    } else if (mode === '#' || mode === '^') {
                        var renderer = makeRenderer(mode, stache, copyState());
                        section.startSection(renderer);
                        if (section instanceof HTMLSectionBuilder) {
                            state.sectionElementStack.push({ type: 'section' });
                        }
                    } else {
                        section.add(makeRenderer(null, stache, copyState({ text: true })));
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
            start: function (tagName, unary) {
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
            end: function (tagName, unary) {
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
                        tag: isCustomTag ? null : tagName
                    });
                    if (isCustomTag) {
                        section.startSubSection();
                    } else if (textContentOnlyTag[tagName]) {
                        state.textContentOnly = new TextSectionBuilder();
                    }
                }
                state.node = null;
            },
            close: function (tagName) {
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
                    addAttributesCallback(oldNode, function (scope, options, parentNodeList) {
                        viewCallbacks.tagHandler(this, tagName, {
                            scope: scope,
                            options: options,
                            subtemplate: renderer,
                            templateType: 'stache',
                            parentNodeList: parentNodeList
                        });
                    });
                }
                state.sectionElementStack.pop();
            },
            attrStart: function (attrName) {
                if (state.node.section) {
                    state.node.section.add(attrName + '="');
                } else {
                    state.attr = {
                        name: attrName,
                        value: ''
                    };
                }
            },
            attrEnd: function (attrName) {
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
            attrValue: function (value) {
                var section = state.node.section || state.attr.section;
                if (section) {
                    section.add(value);
                } else {
                    state.attr.value += value;
                }
            },
            chars: function (text) {
                (state.textContentOnly || section).add(text);
            },
            special: function (text) {
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
                    makeRendererAndUpdateSection(state.node.section, mode, expression);
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
                    makeRendererAndUpdateSection(state.attr.section, mode, expression);
                } else if (state.node) {
                    if (!state.node.attributes) {
                        state.node.attributes = [];
                    }
                    if (!mode) {
                        state.node.attributes.push(mustacheCore.makeLiveBindingBranchRenderer(null, expression, copyState()));
                    } else if (mode === '#' || mode === '^') {
                        if (!state.node.section) {
                            state.node.section = new TextSectionBuilder();
                        }
                        makeRendererAndUpdateSection(state.node.section, mode, expression);
                    } else {
                        throw new Error(mode + ' is currently not supported within a tag.');
                    }
                } else {
                    makeRendererAndUpdateSection(state.textContentOnly || section, mode, expression);
                }
            },
            comment: function (text) {
                section.add({ comment: text });
            },
            done: function () {
            }
        });
        return section.compile();
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
            templates[id] = stache(el.innerHTML);
        }
        return templates[id];
    };
    stache.registerPartial = function (id, partial) {
        templates[id] = typeof partial === 'string' ? stache(partial) : partial;
    };
    module.exports = namespace.stache = stache;
});