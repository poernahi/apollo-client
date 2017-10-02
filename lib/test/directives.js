import * as chai from 'chai';
var assert = chai.assert;
import { shouldInclude, } from '../src/queries/directives';
import { getQueryDefinition, } from '../src/queries/getFromAST';
import gql from 'graphql-tag';
import { cloneDeep } from 'lodash';
describe('query directives', function () {
    it('should should not include a skipped field', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, {}));
        var _a;
    });
    it('should include an included field', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @include(if: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @include(if: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(shouldInclude(field, {}));
        var _a;
    });
    it('should not include a not include: false field', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @include(if: false)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @include(if: false)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, {}));
        var _a;
    });
    it('should include a skip: false field', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: false)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: false)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(shouldInclude(field, {}));
        var _a;
    });
    it('should not include a field if skip: true and include: true', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: true) @include(if: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: true) @include(if: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, {}));
        var _a;
    });
    it('should not include a field if skip: true and include: false', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: true) @include(if: false)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: true) @include(if: false)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, {}));
        var _a;
    });
    it('should include a field if skip: false and include: true', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if:false) @include(if: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if:false) @include(if: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(shouldInclude(field, {}));
        var _a;
    });
    it('should not include a field if skip: false and include: false', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: false) @include(if: false)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: false) @include(if: false)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, {}));
        var _a;
    });
    it('should leave the original query unmodified', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(if: false) @include(if: false)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(if: false) @include(if: false)\n      }"], gql(_a));
        var queryClone = cloneDeep(query);
        var field = getQueryDefinition(query).selectionSet.selections[0];
        shouldInclude(field, {});
        assert.deepEqual(query, queryClone);
        var _a;
    });
    it('does not throw an error on an unsupported directive', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @dosomething(if: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @dosomething(if: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert.doesNotThrow(function () {
            shouldInclude(field, {});
        });
        var _a;
    });
    it('throws an error on an invalid argument for the skip directive', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @skip(nothing: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @skip(nothing: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert.throws(function () {
            shouldInclude(field, {});
        });
        var _a;
    });
    it('throws an error on an invalid argument for the include directive', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @include(nothing: true)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @include(nothing: true)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert.throws(function () {
            shouldInclude(field, {});
        });
        var _a;
    });
    it('throws an error on an invalid variable name within a directive argument', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @include(if: $neverDefined)\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @include(if: $neverDefined)\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert.throws(function () {
            shouldInclude(field, {});
        });
        var _a;
    });
    it('evaluates variables on skip fields', function () {
        var query = (_a = ["\n      query($shouldSkip: Boolean) {\n        fortuneCookie @skip(if: $shouldSkip)\n      }"], _a.raw = ["\n      query($shouldSkip: Boolean) {\n        fortuneCookie @skip(if: $shouldSkip)\n      }"], gql(_a));
        var variables = {
            shouldSkip: true,
        };
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, variables));
        var _a;
    });
    it('evaluates variables on include fields', function () {
        var query = (_a = ["\n      query($shouldSkip: Boolean) {\n        fortuneCookie @include(if: $shouldInclude)\n      }"], _a.raw = ["\n      query($shouldSkip: Boolean) {\n        fortuneCookie @include(if: $shouldInclude)\n      }"], gql(_a));
        var variables = {
            shouldInclude: false,
        };
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert(!shouldInclude(field, variables));
        var _a;
    });
    it('throws an error if the value of the argument is not a variable or boolean', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie @include(if: \"string\")\n      }"], _a.raw = ["\n      query {\n        fortuneCookie @include(if: \"string\")\n      }"], gql(_a));
        var field = getQueryDefinition(query).selectionSet.selections[0];
        assert.throws(function () {
            shouldInclude(field, {});
        });
        var _a;
    });
});
//# sourceMappingURL=directives.js.map