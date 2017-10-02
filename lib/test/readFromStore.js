import { assert } from 'chai';
import { assign, omit } from 'lodash';
import { readQueryFromStore, } from '../src/data/readFromStore';
import { withError, } from './util/wrap';
import { HeuristicFragmentMatcher, } from '../src/data/fragmentMatcher';
var fragmentMatcherFunction = new HeuristicFragmentMatcher().match;
import gql from 'graphql-tag';
describe('reading from the store', function () {
    it('rejects malformed queries', function () {
        assert.throws(function () {
            readQueryFromStore({
                store: {},
                query: (_a = ["\n          query { name }\n          query { address }\n        "], _a.raw = ["\n          query { name }\n          query { address }\n        "], gql(_a)),
            });
            var _a;
        }, /exactly one/);
        assert.throws(function () {
            readQueryFromStore({
                store: {},
                query: (_a = ["\n          fragment x on y { name }\n        "], _a.raw = ["\n          fragment x on y { name }\n        "], gql(_a)),
            });
            var _a;
        }, /contain a query/);
    });
    it('runs a basic query', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var store = {
            'ROOT_QUERY': result,
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        query {\n          stringField,\n          numberField\n        }\n      "], _a.raw = ["\n        query {\n          stringField,\n          numberField\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: result['stringField'],
            numberField: result['numberField'],
        });
        var _a;
    });
    it('runs a basic query with arguments', function () {
        var query = (_a = ["\n      query {\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], _a.raw = ["\n      query {\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], gql(_a));
        var variables = {
            intArg: 5,
            floatArg: 3.14,
            stringArg: 'This is a string!',
        };
        var store = {
            'ROOT_QUERY': {
                id: 'abcd',
                nullField: null,
                'numberField({"intArg":5,"floatArg":3.14})': 5,
                'stringField({"arg":"This is a string!"})': 'Heyo',
            },
        };
        var result = readQueryFromStore({
            store: store,
            query: query,
            variables: variables,
        });
        assert.deepEqual(result, {
            id: 'abcd',
            nullField: null,
            numberField: 5,
            stringField: 'Heyo',
        });
        var _a;
    });
    it('runs a basic query with default values for arguments', function () {
        var query = (_a = ["\n      query someBigQuery(\n        $stringArg: String = \"This is a default string!\",\n        $intArg: Int = 0,\n        $floatArg: Float,\n      ){\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], _a.raw = ["\n      query someBigQuery(\n        $stringArg: String = \"This is a default string!\",\n        $intArg: Int = 0,\n        $floatArg: Float,\n      ){\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], gql(_a));
        var variables = {
            floatArg: 3.14,
        };
        var store = {
            'ROOT_QUERY': {
                id: 'abcd',
                nullField: null,
                'numberField({"intArg":0,"floatArg":3.14})': 5,
                'stringField({"arg":"This is a default string!"})': 'Heyo',
            },
        };
        var result = readQueryFromStore({
            store: store,
            query: query,
            variables: variables,
        });
        assert.deepEqual(result, {
            id: 'abcd',
            nullField: null,
            numberField: 5,
            stringField: 'Heyo',
        });
        var _a;
    });
    it('runs a nested query', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                id: 'abcde',
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
            },
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), {
                nestedObj: {
                    type: 'id',
                    id: 'abcde',
                    generated: false,
                },
            }),
            abcde: result.nestedObj,
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nestedObj {\n            stringField,\n            numberField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nestedObj {\n            stringField,\n            numberField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nestedObj: {
                stringField: 'This is a string too!',
                numberField: 6,
            },
        });
        var _a;
    });
    it('runs a nested query with multiple fragments', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                id: 'abcde',
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
            },
            deepNestedObj: {
                stringField: 'This is a deep string',
                numberField: 7,
                nullField: null,
            },
            nullObject: null,
            __typename: 'Item',
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj', 'deepNestedObj')), {
                __typename: 'Query',
                nestedObj: {
                    type: 'id',
                    id: 'abcde',
                    generated: false,
                },
            }),
            abcde: assign({}, result.nestedObj, {
                deepNestedObj: {
                    type: 'id',
                    id: 'abcdef',
                    generated: false,
                },
            }),
            abcdef: result.deepNestedObj,
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nullField,\n          ... on Query {\n            nestedObj {\n              stringField\n              nullField\n              deepNestedObj {\n                stringField\n                nullField\n              }\n            }\n          }\n          ... on Query {\n            nestedObj {\n              numberField\n              nullField\n              deepNestedObj {\n                numberField\n                nullField\n              }\n            }\n          }\n          ... on Query {\n            nullObject\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nullField,\n          ... on Query {\n            nestedObj {\n              stringField\n              nullField\n              deepNestedObj {\n                stringField\n                nullField\n              }\n            }\n          }\n          ... on Query {\n            nestedObj {\n              numberField\n              nullField\n              deepNestedObj {\n                numberField\n                nullField\n              }\n            }\n          }\n          ... on Query {\n            nullObject\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
                deepNestedObj: {
                    stringField: 'This is a deep string',
                    numberField: 7,
                    nullField: null,
                },
            },
            nullObject: null,
        });
        var _a;
    });
    it('runs a nested query with proper fragment fields in arrays', function () {
        return withError(function () {
            var store = {
                'ROOT_QUERY': {
                    __typename: 'Query',
                    nestedObj: { type: 'id', id: 'abcde', generated: false },
                },
                abcde: {
                    id: 'abcde',
                    innerArray: [{ type: 'id', generated: true, id: 'abcde.innerArray.0' }],
                },
                'abcde.innerArray.0': {
                    id: 'abcdef',
                    someField: 3,
                },
            };
            var queryResult = readQueryFromStore({
                store: store,
                query: (_a = ["\n          {\n            ... on DummyQuery {\n              nestedObj {\n                innerArray { id otherField }\n              }\n            }\n            ... on Query {\n              nestedObj {\n                innerArray { id someField }\n              }\n            }\n            ... on DummyQuery2 {\n              nestedObj {\n                innerArray { id otherField2 }\n              }\n            }\n          }\n        "], _a.raw = ["\n          {\n            ... on DummyQuery {\n              nestedObj {\n                innerArray { id otherField }\n              }\n            }\n            ... on Query {\n              nestedObj {\n                innerArray { id someField }\n              }\n            }\n            ... on DummyQuery2 {\n              nestedObj {\n                innerArray { id otherField2 }\n              }\n            }\n          }\n        "], gql(_a)),
                fragmentMatcherFunction: fragmentMatcherFunction,
            });
            assert.deepEqual(queryResult, {
                nestedObj: {
                    innerArray: [{ id: 'abcdef', someField: 3 }],
                },
            });
            var _a;
        }, /IntrospectionFragmentMatcher/);
    });
    it('runs a nested query with an array without IDs', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedArray: [
                {
                    stringField: 'This is a string too!',
                    numberField: 6,
                    nullField: null,
                },
                {
                    stringField: 'This is a string also!',
                    numberField: 7,
                    nullField: null,
                },
            ],
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                nestedArray: [
                    { type: 'id', generated: true, id: 'abcd.nestedArray.0' },
                    { type: 'id', generated: true, id: 'abcd.nestedArray.1' },
                ],
            }),
            'abcd.nestedArray.0': result.nestedArray[0],
            'abcd.nestedArray.1': result.nestedArray[1],
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            stringField,\n            numberField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            stringField,\n            numberField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nestedArray: [
                {
                    stringField: 'This is a string too!',
                    numberField: 6,
                },
                {
                    stringField: 'This is a string also!',
                    numberField: 7,
                },
            ],
        });
        var _a;
    });
    it('runs a nested query with an array without IDs and a null', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedArray: [
                null,
                {
                    stringField: 'This is a string also!',
                    numberField: 7,
                    nullField: null,
                },
            ],
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                nestedArray: [
                    null,
                    { type: 'id', generated: true, id: 'abcd.nestedArray.1' },
                ],
            }),
            'abcd.nestedArray.1': result.nestedArray[1],
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            stringField,\n            numberField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            stringField,\n            numberField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nestedArray: [
                null,
                {
                    stringField: 'This is a string also!',
                    numberField: 7,
                },
            ],
        });
        var _a;
    });
    it('runs a nested query with an array with IDs and a null', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedArray: [
                null,
                {
                    id: 'abcde',
                    stringField: 'This is a string also!',
                    numberField: 7,
                    nullField: null,
                },
            ],
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                nestedArray: [
                    null,
                    { type: 'id', generated: false, id: 'abcde' },
                ],
            }),
            'abcde': result.nestedArray[1],
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            id,\n            stringField,\n            numberField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nestedArray {\n            id,\n            stringField,\n            numberField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nestedArray: [
                null,
                {
                    id: 'abcde',
                    stringField: 'This is a string also!',
                    numberField: 7,
                },
            ],
        });
        var _a;
    });
    it('throws on a missing field', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var store = { 'ROOT_QUERY': result };
        assert.throws(function () {
            readQueryFromStore({
                store: store,
                query: (_a = ["\n          {\n            stringField,\n            missingField\n          }\n        "], _a.raw = ["\n          {\n            stringField,\n            missingField\n          }\n        "], gql(_a)),
            });
            var _a;
        }, /field missingField on object/);
    });
    it('runs a nested query where the reference is null', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: null,
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), { nestedObj: null }),
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          nestedObj {\n            stringField,\n            numberField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          nestedObj {\n            stringField,\n            numberField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            nestedObj: null,
        });
        var _a;
    });
    it('runs an array of non-objects', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            simpleArray: ['one', 'two', 'three'],
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'simpleArray')), { simpleArray: {
                    type: 'json',
                    json: result.simpleArray,
                } }),
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          simpleArray\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          simpleArray\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            simpleArray: ['one', 'two', 'three'],
        });
        var _a;
    });
    it('runs an array of non-objects with null', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            simpleArray: [null, 'two', 'three'],
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'simpleArray')), { simpleArray: {
                    type: 'json',
                    json: result.simpleArray,
                } }),
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          stringField,\n          numberField,\n          simpleArray\n        }\n      "], _a.raw = ["\n        {\n          stringField,\n          numberField,\n          simpleArray\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            stringField: 'This is a string!',
            numberField: 5,
            simpleArray: [null, 'two', 'three'],
        });
        var _a;
    });
    it('runs a query with custom resolvers for a computed field', function () {
        var result = {
            __typename: 'Thing',
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var store = {
            'ROOT_QUERY': result,
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        query {\n          stringField\n          numberField\n          computedField(extra: \"bit\") @client\n        }\n      "], _a.raw = ["\n        query {\n          stringField\n          numberField\n          computedField(extra: \"bit\") @client\n        }\n      "], gql(_a)),
            config: {
                customResolvers: {
                    Thing: {
                        computedField: function (obj, args) { return obj.stringField + obj.numberField + args['extra']; },
                    },
                },
            },
        });
        assert.deepEqual(queryResult, {
            stringField: result['stringField'],
            numberField: result['numberField'],
            computedField: 'This is a string!5bit',
        });
        var _a;
    });
    it('runs a query with custom resolvers for a computed field on root Query', function () {
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var store = {
            'ROOT_QUERY': result,
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        query {\n          stringField\n          numberField\n          computedField(extra: \"bit\") @client\n        }\n      "], _a.raw = ["\n        query {\n          stringField\n          numberField\n          computedField(extra: \"bit\") @client\n        }\n      "], gql(_a)),
            config: {
                customResolvers: {
                    Query: {
                        computedField: function (obj, args) { return obj.stringField + obj.numberField + args['extra']; },
                    },
                },
            },
        });
        assert.deepEqual(queryResult, {
            stringField: result['stringField'],
            numberField: result['numberField'],
            computedField: 'This is a string!5bit',
        });
        var _a;
    });
    it('will read from an arbitrary root id', function () {
        var data = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                id: 'abcde',
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
            },
            deepNestedObj: {
                stringField: 'This is a deep string',
                numberField: 7,
                nullField: null,
            },
            nullObject: null,
            __typename: 'Item',
        };
        var store = {
            'ROOT_QUERY': assign({}, assign({}, omit(data, 'nestedObj', 'deepNestedObj')), {
                __typename: 'Query',
                nestedObj: {
                    type: 'id',
                    id: 'abcde',
                    generated: false,
                },
            }),
            abcde: assign({}, data.nestedObj, {
                deepNestedObj: {
                    type: 'id',
                    id: 'abcdef',
                    generated: false,
                },
            }),
            abcdef: data.deepNestedObj,
        };
        var queryResult1 = readQueryFromStore({
            store: store,
            rootId: 'abcde',
            query: (_a = ["\n        {\n          stringField\n          numberField\n          nullField\n          deepNestedObj {\n            stringField\n            numberField\n            nullField\n          }\n        }\n      "], _a.raw = ["\n        {\n          stringField\n          numberField\n          nullField\n          deepNestedObj {\n            stringField\n            numberField\n            nullField\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult1, {
            stringField: 'This is a string too!',
            numberField: 6,
            nullField: null,
            deepNestedObj: {
                stringField: 'This is a deep string',
                numberField: 7,
                nullField: null,
            },
        });
        var queryResult2 = readQueryFromStore({
            store: store,
            rootId: 'abcdef',
            query: (_b = ["\n        {\n          stringField\n          numberField\n          nullField\n        }\n      "], _b.raw = ["\n        {\n          stringField\n          numberField\n          nullField\n        }\n      "], gql(_b)),
        });
        assert.deepEqual(queryResult2, {
            stringField: 'This is a deep string',
            numberField: 7,
            nullField: null,
        });
        var _a, _b;
    });
    it('properly handles the connection directive', function () {
        var store = {
            'ROOT_QUERY': {
                'abc': [
                    {
                        'generated': true,
                        'id': 'ROOT_QUERY.abc.0',
                        'type': 'id',
                    },
                ],
            },
            'ROOT_QUERY.abc.0': {
                'name': 'efgh',
            },
        };
        var queryResult = readQueryFromStore({
            store: store,
            query: (_a = ["\n        {\n          books(skip: 0, limit: 2) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], _a.raw = ["\n        {\n          books(skip: 0, limit: 2) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], gql(_a)),
        });
        assert.deepEqual(queryResult, {
            'books': [
                {
                    'name': 'efgh',
                },
            ],
        });
        var _a;
    });
});
//# sourceMappingURL=readFromStore.js.map