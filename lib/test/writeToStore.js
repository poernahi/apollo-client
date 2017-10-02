import { assert } from 'chai';
import { cloneDeep, assign, omit } from 'lodash';
import gql from 'graphql-tag';
import { withWarning } from './util/wrap';
import { writeQueryToStore, writeResultToStore, writeSelectionSetToStore, } from '../src/data/writeToStore';
import { storeKeyNameFromField, } from '../src/data/storeUtils';
import { HeuristicFragmentMatcher, IntrospectionFragmentMatcher, } from '../src/data/fragmentMatcher';
var getIdField = function (_a) {
    var id = _a.id;
    return id;
};
describe('writing to the store', function () {
    it('properly normalizes a trivial item', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        }), {
            'ROOT_QUERY': result,
        });
        var _a;
    });
    it('properly normalizes an aliased field', function () {
        var query = (_a = ["\n      {\n        id,\n        aliasedField: stringField,\n        numberField,\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        aliasedField: stringField,\n        numberField,\n        nullField\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            aliasedField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var normalized = writeQueryToStore({
            result: result,
            query: query,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'abcd',
                stringField: 'This is a string!',
                numberField: 5,
                nullField: null,
            },
        });
        var _a;
    });
    it('properly normalizes a aliased fields with arguments', function () {
        var query = (_a = ["\n      {\n        id,\n        aliasedField1: stringField(arg: 1),\n        aliasedField2: stringField(arg: 2),\n        numberField,\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        aliasedField1: stringField(arg: 1),\n        aliasedField2: stringField(arg: 2),\n        numberField,\n        nullField\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            aliasedField1: 'The arg was 1!',
            aliasedField2: 'The arg was 2!',
            numberField: 5,
            nullField: null,
        };
        var normalized = writeQueryToStore({
            result: result,
            query: query,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'abcd',
                'stringField({"arg":1})': 'The arg was 1!',
                'stringField({"arg":2})': 'The arg was 2!',
                numberField: 5,
                nullField: null,
            },
        });
        var _a;
    });
    it('properly normalizes a query with variables', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], gql(_a));
        var variables = {
            intArg: 5,
            floatArg: 3.14,
            stringArg: 'This is a string!',
        };
        var result = {
            id: 'abcd',
            stringField: 'Heyo',
            numberField: 5,
            nullField: null,
        };
        var normalized = writeQueryToStore({
            result: result,
            query: query,
            variables: variables,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'abcd',
                nullField: null,
                'numberField({"intArg":5,"floatArg":3.14})': 5,
                'stringField({"arg":"This is a string!"})': 'Heyo',
            },
        });
        var _a;
    });
    it('properly normalizes a query with default values', function () {
        var query = (_a = ["\n      query someBigQuery($stringArg: String = \"This is a default string!\", $intArg: Int, $floatArg: Float){\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], _a.raw = ["\n      query someBigQuery($stringArg: String = \"This is a default string!\", $intArg: Int, $floatArg: Float){\n        id,\n        stringField(arg: $stringArg),\n        numberField(intArg: $intArg, floatArg: $floatArg),\n        nullField\n      }\n    "], gql(_a));
        var variables = {
            intArg: 5,
            floatArg: 3.14,
        };
        var result = {
            id: 'abcd',
            stringField: 'Heyo',
            numberField: 5,
            nullField: null,
        };
        var normalized = writeQueryToStore({
            result: result,
            query: query,
            variables: variables,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'abcd',
                nullField: null,
                'numberField({"intArg":5,"floatArg":3.14})': 5,
                'stringField({"arg":"This is a default string!"})': 'Heyo',
            },
        });
        var _a;
    });
    it('properly normalizes a nested object with an ID', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
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
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        }), (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), {
                    nestedObj: {
                        type: 'id',
                        id: result.nestedObj.id,
                        generated: false,
                    },
                })
            },
            _b[result.nestedObj.id] = result.nestedObj,
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested object without an ID', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
            },
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        }), (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), {
                    nestedObj: {
                        type: 'id',
                        id: "$ROOT_QUERY.nestedObj",
                        generated: true,
                    },
                })
            },
            _b["$ROOT_QUERY.nestedObj"] = result.nestedObj,
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested object with arguments but without an ID', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj(arg: \"val\") {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj(arg: \"val\") {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: {
                stringField: 'This is a string too!',
                numberField: 6,
                nullField: null,
            },
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        }), (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), {
                    'nestedObj({"arg":"val"})': {
                        type: 'id',
                        id: "$ROOT_QUERY.nestedObj({\"arg\":\"val\"})",
                        generated: true,
                    },
                })
            },
            _b["$ROOT_QUERY.nestedObj({\"arg\":\"val\"})"] = result.nestedObj,
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested array with IDs', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedArray: [
                {
                    id: 'abcde',
                    stringField: 'This is a string too!',
                    numberField: 6,
                    nullField: null,
                },
                {
                    id: 'abcdef',
                    stringField: 'This is a string also!',
                    numberField: 7,
                    nullField: null,
                },
            ],
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        }), (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                    nestedArray: result.nestedArray.map(function (obj) { return ({
                        type: 'id',
                        id: obj.id,
                        generated: false,
                    }); }),
                })
            },
            _b[result.nestedArray[0].id] = result.nestedArray[0],
            _b[result.nestedArray[1].id] = result.nestedArray[1],
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested array with IDs and a null', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedArray: [
                {
                    id: 'abcde',
                    stringField: 'This is a string too!',
                    numberField: 6,
                    nullField: null,
                },
                null,
            ],
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        }), (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                    nestedArray: [
                        { type: 'id', id: result.nestedArray[0].id, generated: false },
                        null,
                    ],
                })
            },
            _b[result.nestedArray[0].id] = result.nestedArray[0],
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested array without IDs', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
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
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        });
        assert.deepEqual(normalized, (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                    nestedArray: [
                        { type: 'id', generated: true, id: "ROOT_QUERY.nestedArray.0" },
                        { type: 'id', generated: true, id: "ROOT_QUERY.nestedArray.1" },
                    ],
                })
            },
            _b["ROOT_QUERY.nestedArray.0"] = result.nestedArray[0],
            _b["ROOT_QUERY.nestedArray.1"] = result.nestedArray[1],
            _b));
        var _a, _b;
    });
    it('properly normalizes a nested array without IDs and a null item', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedArray {\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
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
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        });
        assert.deepEqual(normalized, (_b = {
                'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedArray')), {
                    nestedArray: [
                        null,
                        { type: 'id', generated: true, id: "ROOT_QUERY.nestedArray.1" },
                    ],
                })
            },
            _b["ROOT_QUERY.nestedArray.1"] = result.nestedArray[1],
            _b));
        var _a, _b;
    });
    it('properly normalizes an array of non-objects', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        simpleArray\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        simpleArray\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            simpleArray: ['one', 'two', 'three'],
        };
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'simpleArray')), {
                simpleArray: {
                    type: 'json',
                    'json': [
                        result.simpleArray[0],
                        result.simpleArray[1],
                        result.simpleArray[2],
                    ],
                },
            }),
        });
        var _a;
    });
    it('properly normalizes an array of non-objects with null', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        simpleArray\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        simpleArray\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            simpleArray: [null, 'two', 'three'],
        };
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'simpleArray')), {
                simpleArray: {
                    type: 'json',
                    json: [
                        result.simpleArray[0],
                        result.simpleArray[1],
                        result.simpleArray[2],
                    ],
                },
            }),
        });
        var _a;
    });
    it('properly normalizes an object occurring in different graphql paths twice', function () {
        var query = (_a = ["\n      {\n        id,\n        object1 {\n          id\n          stringField\n        }\n        object2 {\n          id\n          numberField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        object1 {\n          id\n          stringField\n        }\n        object2 {\n          id\n          numberField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'a',
            object1: {
                id: 'aa',
                stringField: 'string',
            },
            object2: {
                id: 'aa',
                numberField: 1,
            },
        };
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'a',
                object1: {
                    type: 'id',
                    id: 'aa',
                    generated: false,
                },
                object2: {
                    type: 'id',
                    id: 'aa',
                    generated: false,
                },
            },
            'aa': {
                id: 'aa',
                stringField: 'string',
                numberField: 1,
            },
        });
        var _a;
    });
    it('properly normalizes an object occurring in different graphql array paths twice', function () {
        var query = (_a = ["\n      {\n        id,\n        array1 {\n          id\n          stringField\n          obj {\n            id\n            stringField\n          }\n        }\n        array2 {\n          id\n          stringField\n          obj {\n            id\n            numberField\n          }\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        array1 {\n          id\n          stringField\n          obj {\n            id\n            stringField\n          }\n        }\n        array2 {\n          id\n          stringField\n          obj {\n            id\n            numberField\n          }\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'a',
            array1: [{
                    id: 'aa',
                    stringField: 'string',
                    obj: {
                        id: 'aaa',
                        stringField: 'string',
                    },
                }],
            array2: [{
                    id: 'ab',
                    stringField: 'string2',
                    obj: {
                        id: 'aaa',
                        numberField: 1,
                    },
                }],
        };
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'a',
                array1: [{
                        type: 'id',
                        id: 'aa',
                        generated: false,
                    }],
                array2: [{
                        type: 'id',
                        id: 'ab',
                        generated: false,
                    }],
            },
            'aa': {
                id: 'aa',
                stringField: 'string',
                obj: {
                    type: 'id',
                    id: 'aaa',
                    generated: false,
                },
            },
            'ab': {
                id: 'ab',
                stringField: 'string2',
                obj: {
                    type: 'id',
                    id: 'aaa',
                    generated: false,
                },
            },
            'aaa': {
                id: 'aaa',
                stringField: 'string',
                numberField: 1,
            },
        });
        var _a;
    });
    it('properly normalizes an object occurring in the same graphql array path twice', function () {
        var query = (_a = ["\n      {\n        id,\n        array1 {\n          id\n          stringField\n          obj {\n            id\n            stringField\n            numberField\n          }\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        array1 {\n          id\n          stringField\n          obj {\n            id\n            stringField\n            numberField\n          }\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'a',
            array1: [
                {
                    id: 'aa',
                    stringField: 'string',
                    obj: {
                        id: 'aaa',
                        stringField: 'string',
                        numberField: 1,
                    },
                },
                {
                    id: 'ab',
                    stringField: 'string2',
                    obj: {
                        id: 'aaa',
                        stringField: 'should not be written',
                        numberField: 2,
                    },
                },
            ],
        };
        var normalized = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        });
        assert.deepEqual(normalized, {
            'ROOT_QUERY': {
                id: 'a',
                array1: [
                    {
                        type: 'id',
                        id: 'aa',
                        generated: false,
                    },
                    {
                        type: 'id',
                        id: 'ab',
                        generated: false,
                    },
                ],
            },
            'aa': {
                id: 'aa',
                stringField: 'string',
                obj: {
                    type: 'id',
                    id: 'aaa',
                    generated: false,
                },
            },
            'ab': {
                id: 'ab',
                stringField: 'string2',
                obj: {
                    type: 'id',
                    id: 'aaa',
                    generated: false,
                },
            },
            'aaa': {
                id: 'aaa',
                stringField: 'string',
                numberField: 1,
            },
        });
        var _a;
    });
    it('merges nodes', function () {
        var query = (_a = ["\n      {\n        id,\n        numberField,\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        numberField,\n        nullField\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            numberField: 5,
            nullField: null,
        };
        var store = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            dataIdFromObject: getIdField,
        });
        var query2 = (_b = ["\n      {\n        id,\n        stringField,\n        nullField\n      }\n    "], _b.raw = ["\n      {\n        id,\n        stringField,\n        nullField\n      }\n    "], gql(_b));
        var result2 = {
            id: 'abcd',
            stringField: 'This is a string!',
            nullField: null,
        };
        var store2 = writeQueryToStore({
            store: store,
            query: query2,
            result: result2,
            dataIdFromObject: getIdField,
        });
        assert.deepEqual(store2, {
            'ROOT_QUERY': assign({}, result, result2),
        });
        var _a, _b;
    });
    it('properly normalizes a nested object that returns null', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField,\n        nestedObj {\n          id,\n          stringField,\n          numberField,\n          nullField\n        }\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
            nestedObj: null,
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        }), {
            'ROOT_QUERY': assign({}, assign({}, omit(result, 'nestedObj')), {
                nestedObj: null,
            }),
        });
        var _a;
    });
    it('properly normalizes an object with an ID when no extension is passed', function () {
        var query = (_a = ["\n      {\n        people_one(id: \"5\") {\n          id\n          stringField\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: \"5\") {\n          id\n          stringField\n        }\n      }\n    "], gql(_a));
        var result = {
            people_one: {
                id: 'abcd',
                stringField: 'This is a string!',
            },
        };
        assert.deepEqual(writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        }), {
            'ROOT_QUERY': {
                'people_one({"id":"5"})': {
                    type: 'id',
                    id: '$ROOT_QUERY.people_one({"id":"5"})',
                    generated: true,
                },
            },
            '$ROOT_QUERY.people_one({"id":"5"})': {
                'id': 'abcd',
                'stringField': 'This is a string!',
            },
        });
        var _a;
    });
    it('consistently serialize different types of input when passed inlined or as variable', function () {
        var testData = [
            {
                mutation: (_a = ["mutation mut($in: Int!) { mut(inline: 5, variable: $in) { id } }"], _a.raw = ["mutation mut($in: Int!) { mut(inline: 5, variable: $in) { id } }"], gql(_a)),
                variables: { in: 5 },
                expected: 'mut({"inline":5,"variable":5})',
            },
            {
                mutation: (_b = ["mutation mut($in: Float!) { mut(inline: 5.5, variable: $in) { id } }"], _b.raw = ["mutation mut($in: Float!) { mut(inline: 5.5, variable: $in) { id } }"], gql(_b)),
                variables: { in: 5.5 },
                expected: 'mut({"inline":5.5,"variable":5.5})',
            },
            {
                mutation: (_c = ["mutation mut($in: String!) { mut(inline: \"abc\", variable: $in) { id } }"], _c.raw = ["mutation mut($in: String!) { mut(inline: \"abc\", variable: $in) { id } }"], gql(_c)),
                variables: { in: 'abc' },
                expected: 'mut({"inline":"abc","variable":"abc"})',
            },
            {
                mutation: (_d = ["mutation mut($in: Array!) { mut(inline: [1, 2], variable: $in) { id } }"], _d.raw = ["mutation mut($in: Array!) { mut(inline: [1, 2], variable: $in) { id } }"], gql(_d)),
                variables: { in: [1, 2] },
                expected: 'mut({"inline":[1,2],"variable":[1,2]})',
            },
            {
                mutation: (_e = ["mutation mut($in: Object!) { mut(inline: {a: 1}, variable: $in) { id } }"], _e.raw = ["mutation mut($in: Object!) { mut(inline: {a: 1}, variable: $in) { id } }"], gql(_e)),
                variables: { in: { a: 1 } },
                expected: 'mut({"inline":{"a":1},"variable":{"a":1}})',
            },
            {
                mutation: (_f = ["mutation mut($in: Boolean!) { mut(inline: true, variable: $in) { id } }"], _f.raw = ["mutation mut($in: Boolean!) { mut(inline: true, variable: $in) { id } }"], gql(_f)),
                variables: { in: true },
                expected: 'mut({"inline":true,"variable":true})',
            },
        ];
        function isOperationDefinition(definition) {
            return definition.kind === 'OperationDefinition';
        }
        function isField(selection) {
            return selection.kind === 'Field';
        }
        testData.forEach(function (data) {
            data.mutation.definitions.forEach(function (definition) {
                if (isOperationDefinition(definition)) {
                    definition.selectionSet.selections.forEach(function (selection) {
                        if (isField(selection)) {
                            assert.equal(storeKeyNameFromField(selection, data.variables), data.expected);
                        }
                    });
                }
            });
        });
        var _a, _b, _c, _d, _e, _f;
    });
    it('properly normalizes a mutation with object or array parameters and variables', function () {
        var mutation = (_a = ["\n      mutation some_mutation(\n          $nil: ID,\n          $in: Object\n        ) {\n        some_mutation(\n          input: {\n            id: \"5\",\n            arr: [1,{a:\"b\"}],\n            obj: {a:\"b\"},\n            num: 5.5,\n            nil: $nil,\n            bo: true\n          },\n        ) {\n          id,\n        }\n        some_mutation_with_variables(\n          input: $in,\n        ) {\n          id,\n        }\n      }\n    "], _a.raw = ["\n      mutation some_mutation(\n          $nil: ID,\n          $in: Object\n        ) {\n        some_mutation(\n          input: {\n            id: \"5\",\n            arr: [1,{a:\"b\"}],\n            obj: {a:\"b\"},\n            num: 5.5,\n            nil: $nil,\n            bo: true\n          },\n        ) {\n          id,\n        }\n        some_mutation_with_variables(\n          input: $in,\n        ) {\n          id,\n        }\n      }\n    "], gql(_a));
        var result = {
            some_mutation: {
                id: 'id',
            },
            some_mutation_with_variables: {
                id: 'id',
            },
        };
        var variables = {
            nil: null,
            in: {
                id: '5',
                arr: [1, { a: 'b' }],
                obj: { a: 'b' },
                num: 5.5,
                nil: null,
                bo: true,
            },
        };
        function isOperationDefinition(value) {
            return value.kind === 'OperationDefinition';
        }
        mutation.definitions.map(function (def) {
            if (isOperationDefinition(def)) {
                assert.deepEqual(writeSelectionSetToStore({
                    dataId: '5',
                    selectionSet: def.selectionSet,
                    result: cloneDeep(result),
                    context: {
                        store: {},
                        variables: variables,
                        dataIdFromObject: function () { return '5'; },
                    },
                }), {
                    '5': {
                        'some_mutation({"input":{"id":"5","arr":[1,{"a":"b"}],"obj":{"a":"b"},"num":5.5,"nil":null,"bo":true}})': {
                            type: 'id',
                            id: '5',
                            generated: false,
                        },
                        'some_mutation_with_variables({"input":{"id":"5","arr":[1,{"a":"b"}],"obj":{"a":"b"},"num":5.5,"nil":null,"bo":true}})': {
                            type: 'id',
                            id: '5',
                            generated: false,
                        },
                        'id': 'id',
                    },
                });
            }
            else {
                throw 'No operation definition found';
            }
        });
        var _a;
    });
    describe('type escaping', function () {
        var dataIdFromObject = function (object) {
            if (object.__typename && object.id) {
                return object.__typename + '__' + object.id;
            }
            return undefined;
        };
        it('should correctly escape generated ids', function () {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var expStore = {
                ROOT_QUERY: {
                    author: {
                        type: 'id',
                        id: '$ROOT_QUERY.author',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.author': data.author,
            };
            assert.deepEqual(writeQueryToStore({
                result: data,
                query: query,
            }), expStore);
            var _a;
        });
        it('should correctly escape real ids', function () {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            id\n            __typename\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            id\n            __typename\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    id: '129',
                    __typename: 'Author',
                },
            };
            var expStore = (_b = {
                    ROOT_QUERY: {
                        author: {
                            type: 'id',
                            id: dataIdFromObject(data.author),
                            generated: false,
                        },
                    }
                },
                _b[dataIdFromObject(data.author)] = {
                    firstName: data.author.firstName,
                    id: data.author.id,
                    __typename: data.author.__typename,
                },
                _b);
            assert.deepEqual(writeQueryToStore({
                result: data,
                query: query,
                dataIdFromObject: dataIdFromObject,
            }), expStore);
            var _a, _b;
        });
        it('should correctly escape json blobs', function () {
            var query = (_a = ["\n        query {\n          author {\n            info\n            id\n            __typename\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            info\n            id\n            __typename\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    info: {
                        name: 'John',
                    },
                    id: '129',
                    __typename: 'Author',
                },
            };
            var expStore = (_b = {
                    ROOT_QUERY: {
                        author: {
                            type: 'id',
                            id: dataIdFromObject(data.author),
                            generated: false,
                        },
                    }
                },
                _b[dataIdFromObject(data.author)] = {
                    __typename: data.author.__typename,
                    id: data.author.id,
                    info: {
                        type: 'json',
                        json: data.author.info,
                    },
                },
                _b);
            assert.deepEqual(writeQueryToStore({
                result: data,
                query: query,
                dataIdFromObject: dataIdFromObject,
            }), expStore);
            var _a, _b;
        });
    });
    it('should merge objects when overwriting a generated id with a real id', function () {
        var dataWithoutId = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var dataWithId = {
            author: {
                firstName: 'John',
                id: '129',
                __typename: 'Author',
            },
        };
        var dataIdFromObject = function (object) {
            if (object.__typename && object.id) {
                return object.__typename + '__' + object.id;
            }
            return undefined;
        };
        var queryWithoutId = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var queryWithId = (_b = ["\n      query {\n        author {\n          firstName\n          id\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          id\n          __typename\n        }\n      }"], gql(_b));
        var expStoreWithoutId = {
            '$ROOT_QUERY.author': {
                firstName: 'John',
                lastName: 'Smith',
            },
            ROOT_QUERY: {
                'author': {
                    type: 'id',
                    id: '$ROOT_QUERY.author',
                    generated: true,
                },
            },
        };
        var expStoreWithId = {
            'Author__129': {
                firstName: 'John',
                lastName: 'Smith',
                id: '129',
                __typename: 'Author',
            },
            ROOT_QUERY: {
                author: {
                    type: 'id',
                    id: 'Author__129',
                    generated: false,
                },
            },
        };
        var storeWithoutId = writeQueryToStore({
            result: dataWithoutId,
            query: queryWithoutId,
            dataIdFromObject: dataIdFromObject,
        });
        assert.deepEqual(storeWithoutId, expStoreWithoutId);
        var storeWithId = writeQueryToStore({
            result: dataWithId,
            query: queryWithId,
            store: storeWithoutId,
            dataIdFromObject: dataIdFromObject,
        });
        assert.deepEqual(storeWithId, expStoreWithId);
        var _a, _b;
    });
    it('does not swallow errors other than field errors', function () {
        var query = (_a = ["\n      query {\n        ...notARealFragment\n        fortuneCookie\n      }"], _a.raw = ["\n      query {\n        ...notARealFragment\n        fortuneCookie\n      }"], gql(_a));
        var result = {
            fortuneCookie: 'Star Wars unit tests are boring',
        };
        assert.throws(function () {
            writeQueryToStore({
                result: result,
                query: query,
            });
        }, /No fragment/);
        var _a;
    });
    it('does not change object references if the value is the same', function () {
        var query = (_a = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField\n      }\n    "], _a.raw = ["\n      {\n        id,\n        stringField,\n        numberField,\n        nullField\n      }\n    "], gql(_a));
        var result = {
            id: 'abcd',
            stringField: 'This is a string!',
            numberField: 5,
            nullField: null,
        };
        var store = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
        });
        var newStore = writeQueryToStore({
            query: query,
            result: cloneDeep(result),
            store: assign({}, store),
        });
        Object.keys(store).forEach(function (field) {
            assert.equal(store[field], newStore[field], 'references are the same');
        });
        var _a;
    });
    describe('writeResultToStore shape checking', function () {
        var query = (_a = ["\n      query {\n        todos {\n          id\n          name\n          description\n        }\n      }\n    "], _a.raw = ["\n      query {\n        todos {\n          id\n          name\n          description\n        }\n      }\n    "], gql(_a));
        it('should write the result data without validating its shape when a fragment matcher is not provided', function () {
            var result = {
                todos: [
                    {
                        id: '1',
                        name: 'Todo 1',
                    },
                ],
            };
            var newStore = writeResultToStore({
                dataId: 'ROOT_QUERY',
                result: result,
                document: query,
                dataIdFromObject: getIdField,
            });
            assert.deepEqual(newStore['1'], result.todos[0]);
        });
        it('should warn when it receives the wrong data with non-union fragments (using an heuristic matcher)', function () {
            var fragmentMatcherFunction = new HeuristicFragmentMatcher().match;
            var result = {
                todos: [
                    {
                        id: '1',
                        name: 'Todo 1',
                    },
                ],
            };
            return withWarning(function () {
                var newStore = writeResultToStore({
                    dataId: 'ROOT_QUERY',
                    result: result,
                    document: query,
                    dataIdFromObject: getIdField,
                    fragmentMatcherFunction: fragmentMatcherFunction,
                });
                assert.deepEqual(newStore['1'], result.todos[0]);
            }, /Missing field description/);
        });
        it('should warn when it receives the wrong data inside a fragment (using an introspection matcher)', function () {
            var fragmentMatcherFunction = new IntrospectionFragmentMatcher({
                introspectionQueryResultData: {
                    __schema: {
                        types: [
                            {
                                kind: 'UNION',
                                name: 'Todo',
                                possibleTypes: [
                                    { name: 'ShoppingCartItem' },
                                    { name: 'TaskItem' },
                                ],
                            },
                        ],
                    },
                },
            }).match;
            var queryWithInterface = (_a = ["\n        query {\n          todos {\n            id\n            name\n            description\n            ...TodoFragment\n          }\n        }\n\n        fragment TodoFragment on Todo {\n          ...on ShoppingCartItem {\n            price\n            __typename\n          }\n          ...on TaskItem {\n            date\n            __typename\n          }\n          __typename\n        }\n      "], _a.raw = ["\n        query {\n          todos {\n            id\n            name\n            description\n            ...TodoFragment\n          }\n        }\n\n        fragment TodoFragment on Todo {\n          ...on ShoppingCartItem {\n            price\n            __typename\n          }\n          ...on TaskItem {\n            date\n            __typename\n          }\n          __typename\n        }\n      "], gql(_a));
            var result = {
                todos: [
                    {
                        id: '1',
                        name: 'Todo 1',
                        description: 'Description 1',
                        __typename: 'ShoppingCartItem',
                    },
                ],
            };
            return withWarning(function () {
                var newStore = writeResultToStore({
                    dataId: 'ROOT_QUERY',
                    result: result,
                    document: queryWithInterface,
                    dataIdFromObject: getIdField,
                    fragmentMatcherFunction: fragmentMatcherFunction,
                });
                assert.deepEqual(newStore['1'], result.todos[0]);
            }, /Missing field price/);
            var _a;
        });
        it('should not warn if a field is null', function () {
            var result = {
                todos: null,
            };
            var newStore = writeResultToStore({
                dataId: 'ROOT_QUERY',
                result: result,
                document: query,
                dataIdFromObject: getIdField,
            });
            assert.deepEqual(newStore['ROOT_QUERY'], { todos: null });
        });
        var _a;
    });
    it('throws when trying to write an object without id that was previously queried with id', function () {
        var store = {
            'ROOT_QUERY': assign({}, {
                __typename: 'Query',
                item: {
                    type: 'id',
                    id: 'abcd',
                    generated: false,
                },
            }),
            abcd: assign({}, {
                id: 'abcd',
                __typename: 'Item',
                stringField: 'This is a string!',
            }),
        };
        assert.throws(function () {
            writeQueryToStore({
                store: store,
                result: {
                    item: {
                        __typename: 'Item',
                        stringField: 'This is still a string!',
                    },
                },
                query: (_a = ["\n          query {\n            item {\n              stringField\n            }\n          }\n        "], _a.raw = ["\n          query {\n            item {\n              stringField\n            }\n          }\n        "], gql(_a)),
                dataIdFromObject: getIdField,
            });
            var _a;
        }, /stringField(.|\n)*abcd/g);
        assert.throws(function () {
            writeResultToStore({
                store: store,
                result: {
                    item: {
                        __typename: 'Item',
                        stringField: 'This is still a string!',
                    },
                },
                dataId: 'ROOT_QUERY',
                document: (_a = ["\n          query {\n            item {\n              stringField\n            }\n          }\n        "], _a.raw = ["\n          query {\n            item {\n              stringField\n            }\n          }\n        "], gql(_a)),
                dataIdFromObject: getIdField,
            });
            var _a;
        }, /stringField(.|\n)*abcd/g);
    });
    it('properly handles the connection directive', function () {
        var store = {};
        writeQueryToStore({
            query: (_a = ["\n        {\n          books(skip: 0, limit: 2) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], _a.raw = ["\n        {\n          books(skip: 0, limit: 2) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], gql(_a)),
            result: {
                books: [
                    {
                        name: 'abcd',
                    },
                ],
            },
            store: store,
        });
        writeQueryToStore({
            query: (_b = ["\n        {\n          books(skip: 2, limit: 4) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], _b.raw = ["\n        {\n          books(skip: 2, limit: 4) @connection(key: \"abc\") {\n            name\n          }\n        }\n      "], gql(_b)),
            result: {
                books: [
                    {
                        name: 'efgh',
                    },
                ],
            },
            store: store,
        });
        assert.deepEqual(store, {
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
        });
        var _a, _b;
    });
});
//# sourceMappingURL=writeToStore.js.map