/*can-stache@3.10.4#src/intermediate_and_imports*/
define([
    'require',
    'exports',
    'module',
    './mustache_core',
    'can-view-parser'
], function (require, exports, module) {
    var mustacheCore = require('./mustache_core');
    var parser = require('can-view-parser');
    module.exports = function (source) {
        var template = source;
        template = mustacheCore.cleanWhitespaceControl(template);
        template = mustacheCore.cleanLineEndings(template);
        var imports = [], dynamicImports = [], ases = {}, inImport = false, inFrom = false, inAs = false, isUnary = false, importIsDynamic = false, currentAs = '', currentFrom = '';
        function processImport() {
            if (currentAs) {
                ases[currentAs] = currentFrom;
                currentAs = '';
            }
            if (importIsDynamic) {
                dynamicImports.push(currentFrom);
            } else {
                imports.push(currentFrom);
            }
        }
        var intermediate = parser(template, {
            start: function (tagName, unary) {
                if (tagName === 'can-import') {
                    isUnary = unary;
                    importIsDynamic = false;
                    inImport = true;
                } else if (tagName === 'can-dynamic-import') {
                    isUnary = unary;
                    importIsDynamic = true;
                    inImport = true;
                } else if (inImport) {
                    importIsDynamic = true;
                    inImport = false;
                }
            },
            attrStart: function (attrName) {
                if (attrName === 'from') {
                    inFrom = true;
                } else if (attrName === 'as' || attrName === 'export-as') {
                    inAs = true;
                }
            },
            attrEnd: function (attrName) {
                if (attrName === 'from') {
                    inFrom = false;
                } else if (attrName === 'as' || attrName === 'export-as') {
                    inAs = false;
                }
            },
            attrValue: function (value) {
                if (inFrom && inImport) {
                    currentFrom = value;
                } else if (inAs && inImport) {
                    currentAs = value;
                }
            },
            end: function (tagName) {
                if ((tagName === 'can-import' || tagName === 'can-dymamic-import') && isUnary) {
                    processImport();
                }
            },
            close: function (tagName) {
                if (tagName === 'can-import' || tagName === 'can-dymamic-import') {
                    processImport();
                }
            },
            chars: function (text) {
                if (text.trim().length > 0) {
                    importIsDynamic = true;
                }
            },
            special: function (text) {
                importIsDynamic = true;
            }
        }, true);
        return {
            intermediate: intermediate,
            imports: imports,
            dynamicImports: dynamicImports,
            ases: ases,
            exports: ases
        };
    };
});