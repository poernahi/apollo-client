import { assert } from 'chai';
import gql from 'graphql-tag';
import ApolloClient from '../src/ApolloClient';
import { withWarning } from './util/wrap';
describe('ApolloClient', function () {
    describe('readQuery', function () {
        it('will read some data from the store', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'ROOT_QUERY': {
                                a: 1,
                                b: 2,
                                c: 3,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readQuery({ query: (_a = ["{ a }"], _a.raw = ["{ a }"], gql(_a)) }), { a: 1 });
            assert.deepEqual(client.readQuery({ query: (_b = ["{ b c }"], _b.raw = ["{ b c }"], gql(_b)) }), { b: 2, c: 3 });
            assert.deepEqual(client.readQuery({ query: (_c = ["{ a b c }"], _c.raw = ["{ a b c }"], gql(_c)) }), { a: 1, b: 2, c: 3 });
            var _a, _b, _c;
        });
        it('will read some deeply nested data from the store', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'ROOT_QUERY': {
                                a: 1,
                                b: 2,
                                c: 3,
                                d: {
                                    type: 'id',
                                    id: 'foo',
                                    generated: false,
                                },
                            },
                            'foo': {
                                __typename: 'Foo',
                                e: 4,
                                f: 5,
                                g: 6,
                                h: {
                                    type: 'id',
                                    id: 'bar',
                                    generated: false,
                                },
                            },
                            'bar': {
                                __typename: 'Bar',
                                i: 7,
                                j: 8,
                                k: 9,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readQuery({ query: (_a = ["{ a d { e } }"], _a.raw = ["{ a d { e } }"], gql(_a)) }), { a: 1, d: { e: 4, __typename: 'Foo' } });
            assert.deepEqual(client.readQuery({ query: (_b = ["{ a d { e h { i } } }"], _b.raw = ["{ a d { e h { i } } }"], gql(_b)) }), { a: 1, d: { __typename: 'Foo', e: 4, h: { i: 7, __typename: 'Bar' } } });
            assert.deepEqual(client.readQuery({ query: (_c = ["{ a b c d { e f g h { i j k } } }"], _c.raw = ["{ a b c d { e f g h { i j k } } }"], gql(_c)) }), { a: 1, b: 2, c: 3, d: { __typename: 'Foo', e: 4, f: 5, g: 6, h: { __typename: 'Bar', i: 7, j: 8, k: 9 } } });
            var _a, _b, _c;
        });
        it('will read some data from the store with variables', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'ROOT_QUERY': {
                                'field({"literal":true,"value":42})': 1,
                                'field({"literal":false,"value":42})': 2,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readQuery({
                query: (_a = ["query ($literal: Boolean, $value: Int) {\n          a: field(literal: true, value: 42)\n          b: field(literal: $literal, value: $value)\n        }"], _a.raw = ["query ($literal: Boolean, $value: Int) {\n          a: field(literal: true, value: 42)\n          b: field(literal: $literal, value: $value)\n        }"], gql(_a)),
                variables: {
                    literal: false,
                    value: 42,
                },
            }), { a: 1, b: 2 });
            var _a;
        });
    });
    it('will read some data from the store with default values', function () {
        var client = new ApolloClient({
            initialState: {
                apollo: {
                    data: {
                        'ROOT_QUERY': {
                            'field({"literal":true,"value":-1})': 1,
                            'field({"literal":false,"value":42})': 2,
                        },
                    },
                },
            },
        });
        assert.deepEqual(client.readQuery({
            query: (_a = ["query ($literal: Boolean, $value: Int = -1) {\n        a: field(literal: $literal, value: $value)\n      }"], _a.raw = ["query ($literal: Boolean, $value: Int = -1) {\n        a: field(literal: $literal, value: $value)\n      }"], gql(_a)),
            variables: {
                literal: false,
                value: 42,
            },
        }), { a: 2 });
        assert.deepEqual(client.readQuery({
            query: (_b = ["query ($literal: Boolean, $value: Int = -1) {\n        a: field(literal: $literal, value: $value)\n      }"], _b.raw = ["query ($literal: Boolean, $value: Int = -1) {\n        a: field(literal: $literal, value: $value)\n      }"], gql(_b)),
            variables: {
                literal: true,
            },
        }), { a: 1 });
        var _a, _b;
    });
    describe('readFragment', function () {
        it('will throw an error when there is no fragment', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.readFragment({ id: 'x', fragment: (_a = ["query { a b c }"], _a.raw = ["query { a b c }"], gql(_a)) });
                var _a;
            }, 'Found a query operation. No operations are allowed when using a fragment as a query. Only fragments are allowed.');
            assert.throws(function () {
                client.readFragment({ id: 'x', fragment: (_a = ["schema { query: Query }"], _a.raw = ["schema { query: Query }"], gql(_a)) });
                var _a;
            }, 'Found 0 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
        });
        it('will throw an error when there is more than one fragment but no fragment name', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.readFragment({ id: 'x', fragment: (_a = ["fragment a on A { a } fragment b on B { b }"], _a.raw = ["fragment a on A { a } fragment b on B { b }"], gql(_a)) });
                var _a;
            }, 'Found 2 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
            assert.throws(function () {
                client.readFragment({ id: 'x', fragment: (_a = ["fragment a on A { a } fragment b on B { b } fragment c on C { c }"], _a.raw = ["fragment a on A { a } fragment b on B { b } fragment c on C { c }"], gql(_a)) });
                var _a;
            }, 'Found 3 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
        });
        it('will read some deeply nested data from the store at any id', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'ROOT_QUERY': {
                                __typename: 'Foo',
                                a: 1,
                                b: 2,
                                c: 3,
                                d: {
                                    type: 'id',
                                    id: 'foo',
                                    generated: false,
                                },
                            },
                            'foo': {
                                __typename: 'Foo',
                                e: 4,
                                f: 5,
                                g: 6,
                                h: {
                                    type: 'id',
                                    id: 'bar',
                                    generated: false,
                                },
                            },
                            'bar': {
                                __typename: 'Bar',
                                i: 7,
                                j: 8,
                                k: 9,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_a = ["fragment fragmentFoo on Foo { e h { i } }"], _a.raw = ["fragment fragmentFoo on Foo { e h { i } }"], gql(_a)) }), { __typename: 'Foo', e: 4, h: { __typename: 'Bar', i: 7 } });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_b = ["fragment fragmentFoo on Foo { e f g h { i j k } }"], _b.raw = ["fragment fragmentFoo on Foo { e f g h { i j k } }"], gql(_b)) }), { __typename: 'Foo', e: 4, f: 5, g: 6, h: { __typename: 'Bar', i: 7, j: 8, k: 9 } });
            assert.deepEqual(client.readFragment({ id: 'bar', fragment: (_c = ["fragment fragmentBar on Bar { i }"], _c.raw = ["fragment fragmentBar on Bar { i }"], gql(_c)) }), { __typename: 'Bar', i: 7 });
            assert.deepEqual(client.readFragment({ id: 'bar', fragment: (_d = ["fragment fragmentBar on Bar { i j k }"], _d.raw = ["fragment fragmentBar on Bar { i j k }"], gql(_d)) }), { __typename: 'Bar', i: 7, j: 8, k: 9 });
            assert.deepEqual(client.readFragment({
                id: 'foo',
                fragment: (_e = ["fragment fragmentFoo on Foo { e f g h { i j k } } fragment fragmentBar on Bar { i j k }"], _e.raw = ["fragment fragmentFoo on Foo { e f g h { i j k } } fragment fragmentBar on Bar { i j k }"], gql(_e)),
                fragmentName: 'fragmentFoo',
            }), { __typename: 'Foo', e: 4, f: 5, g: 6, h: { __typename: 'Bar', i: 7, j: 8, k: 9 } });
            assert.deepEqual(client.readFragment({
                id: 'bar',
                fragment: (_f = ["fragment fragmentFoo on Foo { e f g h { i j k } } fragment fragmentBar on Bar { i j k }"], _f.raw = ["fragment fragmentFoo on Foo { e f g h { i j k } } fragment fragmentBar on Bar { i j k }"], gql(_f)),
                fragmentName: 'fragmentBar',
            }), { __typename: 'Bar', i: 7, j: 8, k: 9 });
            var _a, _b, _c, _d, _e, _f;
        });
        it('will read some data from the store with variables', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'foo': {
                                __typename: 'Foo',
                                'field({"literal":true,"value":42})': 1,
                                'field({"literal":false,"value":42})': 2,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readFragment({
                id: 'foo',
                fragment: (_a = ["\n          fragment foo on Foo {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], _a.raw = ["\n          fragment foo on Foo {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], gql(_a)),
                variables: {
                    literal: false,
                    value: 42,
                },
            }), { __typename: 'Foo', a: 1, b: 2 });
            var _a;
        });
        it('will return null when an id that can’t be found is provided', function () {
            var client1 = new ApolloClient();
            var client2 = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'bar': { __typename: 'Foo', a: 1, b: 2, c: 3 },
                        },
                    },
                },
            });
            var client3 = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'foo': { __typename: 'Foo', a: 1, b: 2, c: 3 },
                        },
                    },
                },
            });
            assert.equal(client1.readFragment({ id: 'foo', fragment: (_a = ["fragment fooFragment on Foo { a b c }"], _a.raw = ["fragment fooFragment on Foo { a b c }"], gql(_a)) }), null);
            assert.equal(client2.readFragment({ id: 'foo', fragment: (_b = ["fragment fooFragment on Foo { a b c }"], _b.raw = ["fragment fooFragment on Foo { a b c }"], gql(_b)) }), null);
            assert.deepEqual(client3.readFragment({ id: 'foo', fragment: (_c = ["fragment fooFragment on Foo { a b c }"], _c.raw = ["fragment fooFragment on Foo { a b c }"], gql(_c)) }), { __typename: 'Foo', a: 1, b: 2, c: 3 });
            var _a, _b, _c;
        });
    });
    describe('writeQuery', function () {
        it('will write some data to the store', function () {
            var client = new ApolloClient();
            client.writeQuery({ data: { a: 1 }, query: (_a = ["{ a }"], _a.raw = ["{ a }"], gql(_a)) });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                },
            });
            client.writeQuery({ data: { b: 2, c: 3 }, query: (_b = ["{ b c }"], _b.raw = ["{ b c }"], gql(_b)) });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    c: 3,
                },
            });
            client.writeQuery({ data: { a: 4, b: 5, c: 6 }, query: (_c = ["{ a b c }"], _c.raw = ["{ a b c }"], gql(_c)) });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 4,
                    b: 5,
                    c: 6,
                },
            });
            var _a, _b, _c;
        });
        it('will write some deeply nested data to the store', function () {
            var client = new ApolloClient();
            client.writeQuery({
                data: { a: 1, d: { __typename: 'D', e: 4 } },
                query: (_a = ["{ a d { e } }"], _a.raw = ["{ a d { e } }"], gql(_a)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    d: {
                        type: 'id',
                        id: '$ROOT_QUERY.d',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.d': {
                    __typename: 'D',
                    e: 4,
                },
            });
            client.writeQuery({
                data: { a: 1, d: { __typename: 'D', h: { __typename: 'H', i: 7 } } },
                query: (_b = ["{ a d { h { i } } }"], _b.raw = ["{ a d { h { i } } }"], gql(_b)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    d: {
                        type: 'id',
                        id: '$ROOT_QUERY.d',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.d': {
                    __typename: 'D',
                    e: 4,
                    h: {
                        type: 'id',
                        id: '$ROOT_QUERY.d.h',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.d.h': {
                    __typename: 'H',
                    i: 7,
                },
            });
            client.writeQuery({
                data: { a: 1, b: 2, c: 3, d: {
                        __typename: 'D', e: 4, f: 5, g: 6, h: {
                            __typename: 'H', i: 7, j: 8, k: 9,
                        },
                    } },
                query: (_c = ["{ a b c d { e f g h { i j k } } }"], _c.raw = ["{ a b c d { e f g h { i j k } } }"], gql(_c)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    c: 3,
                    d: {
                        type: 'id',
                        id: '$ROOT_QUERY.d',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.d': {
                    __typename: 'D',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: '$ROOT_QUERY.d.h',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.d.h': {
                    __typename: 'H',
                    i: 7,
                    j: 8,
                    k: 9,
                },
            });
            var _a, _b, _c;
        });
        it('will write some data to the store with variables', function () {
            var client = new ApolloClient();
            client.writeQuery({
                data: {
                    a: 1,
                    b: 2,
                },
                query: (_a = ["\n          query ($literal: Boolean, $value: Int) {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], _a.raw = ["\n          query ($literal: Boolean, $value: Int) {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], gql(_a)),
                variables: {
                    literal: false,
                    value: 42,
                },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    'field({"literal":true,"value":42})': 1,
                    'field({"literal":false,"value":42})': 2,
                },
            });
            var _a;
        });
        it('will write some data to the store with default values for variables', function () {
            var client = new ApolloClient();
            client.writeQuery({
                data: {
                    a: 2,
                },
                query: (_a = ["\n          query ($literal: Boolean, $value: Int = -1) {\n            a: field(literal: $literal, value: $value)\n          }\n        "], _a.raw = ["\n          query ($literal: Boolean, $value: Int = -1) {\n            a: field(literal: $literal, value: $value)\n          }\n        "], gql(_a)),
                variables: {
                    literal: true,
                    value: 42,
                },
            });
            client.writeQuery({
                data: {
                    a: 1,
                },
                query: (_b = ["\n          query ($literal: Boolean, $value: Int = -1) {\n            a: field(literal: $literal, value: $value)\n          }\n        "], _b.raw = ["\n          query ($literal: Boolean, $value: Int = -1) {\n            a: field(literal: $literal, value: $value)\n          }\n        "], gql(_b)),
                variables: {
                    literal: false,
                },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    'field({"literal":true,"value":42})': 2,
                    'field({"literal":false,"value":-1})': 1,
                },
            });
            var _a, _b;
        });
        it('should warn when the data provided does not match the query shape', function () {
            var client = new ApolloClient();
            return withWarning(function () {
                client.writeQuery({
                    data: {
                        todos: [
                            {
                                id: '1',
                                name: 'Todo 1',
                                __typename: 'Todo',
                            },
                        ],
                    },
                    query: (_a = ["\n            query { todos { id name description } }\n          "], _a.raw = ["\n            query { todos { id name description } }\n          "], gql(_a)),
                });
                var _a;
            }, /Missing field description/);
        });
    });
    describe('writeFragment', function () {
        it('will throw an error when there is no fragment', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.writeFragment({ data: {}, id: 'x', fragment: (_a = ["query { a b c }"], _a.raw = ["query { a b c }"], gql(_a)) });
                var _a;
            }, 'Found a query operation. No operations are allowed when using a fragment as a query. Only fragments are allowed.');
            assert.throws(function () {
                client.writeFragment({ data: {}, id: 'x', fragment: (_a = ["schema { query: Query }"], _a.raw = ["schema { query: Query }"], gql(_a)) });
                var _a;
            }, 'Found 0 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
        });
        it('will throw an error when there is more than one fragment but no fragment name', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.writeFragment({ data: {}, id: 'x', fragment: (_a = ["fragment a on A { a } fragment b on B { b }"], _a.raw = ["fragment a on A { a } fragment b on B { b }"], gql(_a)) });
                var _a;
            }, 'Found 2 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
            assert.throws(function () {
                client.writeFragment({ data: {}, id: 'x', fragment: (_a = ["fragment a on A { a } fragment b on B { b } fragment c on C { c }"], _a.raw = ["fragment a on A { a } fragment b on B { b } fragment c on C { c }"], gql(_a)) });
                var _a;
            }, 'Found 3 fragments. `fragmentName` must be provided when there is not exactly 1 fragment.');
        });
        it('will write some deeply nested data into the store at any id', function () {
            var client = new ApolloClient({
                dataIdFromObject: function (o) { return o.id; },
            });
            client.writeFragment({
                data: { __typename: 'Foo', e: 4, h: { __typename: 'Bar', id: 'bar', i: 7 } },
                id: 'foo',
                fragment: (_a = ["fragment fragmentFoo on Foo { e h { i } }"], _a.raw = ["fragment fragmentFoo on Foo { e h { i } }"], gql(_a)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 7,
                },
            });
            client.writeFragment({
                data: { __typename: 'Foo', f: 5, g: 6, h: { __typename: 'Bar', id: 'bar', j: 8, k: 9 } },
                id: 'foo',
                fragment: (_b = ["fragment fragmentFoo on Foo { f g h { j k } }"], _b.raw = ["fragment fragmentFoo on Foo { f g h { j k } }"], gql(_b)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 7,
                    j: 8,
                    k: 9,
                },
            });
            client.writeFragment({
                data: { __typename: 'Bar', i: 10 },
                id: 'bar',
                fragment: (_c = ["fragment fragmentBar on Bar { i }"], _c.raw = ["fragment fragmentBar on Bar { i }"], gql(_c)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 10,
                    j: 8,
                    k: 9,
                },
            });
            client.writeFragment({
                data: { __typename: 'Bar', j: 11, k: 12 },
                id: 'bar',
                fragment: (_d = ["fragment fragmentBar on Bar { j k }"], _d.raw = ["fragment fragmentBar on Bar { j k }"], gql(_d)),
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 10,
                    j: 11,
                    k: 12,
                },
            });
            client.writeFragment({
                data: { __typename: 'Foo', e: 4, f: 5, g: 6, h: { __typename: 'Bar', id: 'bar', i: 7, j: 8, k: 9 } },
                id: 'foo',
                fragment: (_e = ["fragment fooFragment on Foo { e f g h { i j k } } fragment barFragment on Bar { i j k }"], _e.raw = ["fragment fooFragment on Foo { e f g h { i j k } } fragment barFragment on Bar { i j k }"], gql(_e)),
                fragmentName: 'fooFragment',
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 7,
                    j: 8,
                    k: 9,
                },
            });
            client.writeFragment({
                data: { __typename: 'Bar', i: 10, j: 11, k: 12 },
                id: 'bar',
                fragment: (_f = ["fragment fooFragment on Foo { e f g h { i j k } } fragment barFragment on Bar { i j k }"], _f.raw = ["fragment fooFragment on Foo { e f g h { i j k } } fragment barFragment on Bar { i j k }"], gql(_f)),
                fragmentName: 'barFragment',
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    e: 4,
                    f: 5,
                    g: 6,
                    h: {
                        type: 'id',
                        id: 'bar',
                        generated: false,
                    },
                },
                'bar': {
                    __typename: 'Bar',
                    i: 10,
                    j: 11,
                    k: 12,
                },
            });
            var _a, _b, _c, _d, _e, _f;
        });
        it('will write some data to the store with variables', function () {
            var client = new ApolloClient();
            client.writeFragment({
                data: {
                    __typename: 'Foo',
                    a: 1,
                    b: 2,
                },
                id: 'foo',
                fragment: (_a = ["\n          fragment foo on Foo {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], _a.raw = ["\n          fragment foo on Foo {\n            a: field(literal: true, value: 42)\n            b: field(literal: $literal, value: $value)\n          }\n        "], gql(_a)),
                variables: {
                    literal: false,
                    value: 42,
                },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    'field({"literal":true,"value":42})': 1,
                    'field({"literal":false,"value":42})': 2,
                },
            });
            var _a;
        });
        it('should warn when the data provided does not match the fragment shape', function () {
            var client = new ApolloClient();
            return withWarning(function () {
                client.writeFragment({
                    data: { __typename: 'Bar', i: 10 },
                    id: 'bar',
                    fragment: (_a = ["fragment fragmentBar on Bar { i e }"], _a.raw = ["fragment fragmentBar on Bar { i e }"], gql(_a)),
                });
                var _a;
            }, /Missing field e/);
        });
    });
    describe('write then read', function () {
        it('will write data locally which will then be read back', function () {
            var client = new ApolloClient({
                initialState: {
                    apollo: {
                        data: {
                            'foo': {
                                __typename: 'Foo',
                                a: 1,
                                b: 2,
                                c: 3,
                                bar: {
                                    type: 'id',
                                    id: '$foo.bar',
                                    generated: true,
                                },
                            },
                            '$foo.bar': {
                                __typename: 'Bar',
                                d: 4,
                                e: 5,
                                f: 6,
                            },
                        },
                    },
                },
            });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_a = ["fragment x on Foo { a b c bar { d e f } }"], _a.raw = ["fragment x on Foo { a b c bar { d e f } }"], gql(_a)) }), { __typename: 'Foo', a: 1, b: 2, c: 3, bar: { d: 4, e: 5, f: 6, __typename: 'Bar' } });
            client.writeFragment({
                id: 'foo',
                fragment: (_b = ["fragment x on Foo { a }"], _b.raw = ["fragment x on Foo { a }"], gql(_b)),
                data: { __typename: 'Foo', a: 7 },
            });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_c = ["fragment x on Foo { a b c bar { d e f } }"], _c.raw = ["fragment x on Foo { a b c bar { d e f } }"], gql(_c)) }), { __typename: 'Foo', a: 7, b: 2, c: 3, bar: { __typename: 'Bar', d: 4, e: 5, f: 6 } });
            client.writeFragment({
                id: 'foo',
                fragment: (_d = ["fragment x on Foo { bar { d } }"], _d.raw = ["fragment x on Foo { bar { d } }"], gql(_d)),
                data: { __typename: 'Foo', bar: { __typename: 'Bar', d: 8 } },
            });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_e = ["fragment x on Foo { a b c bar { d e f } }"], _e.raw = ["fragment x on Foo { a b c bar { d e f } }"], gql(_e)) }), { __typename: 'Foo', a: 7, b: 2, c: 3, bar: { __typename: 'Bar', d: 8, e: 5, f: 6 } });
            client.writeFragment({
                id: '$foo.bar',
                fragment: (_f = ["fragment y on Bar { e }"], _f.raw = ["fragment y on Bar { e }"], gql(_f)),
                data: { __typename: 'Bar', e: 9 },
            });
            assert.deepEqual(client.readFragment({ id: 'foo', fragment: (_g = ["fragment x on Foo { a b c bar { d e f } }"], _g.raw = ["fragment x on Foo { a b c bar { d e f } }"], gql(_g)) }), { __typename: 'Foo', a: 7, b: 2, c: 3, bar: { __typename: 'Bar', d: 8, e: 9, f: 6 } });
            assert.deepEqual(client.store.getState().apollo.data, {
                'foo': {
                    __typename: 'Foo',
                    a: 7,
                    b: 2,
                    c: 3,
                    bar: {
                        type: 'id',
                        id: '$foo.bar',
                        generated: true,
                    },
                },
                '$foo.bar': {
                    __typename: 'Bar',
                    d: 8,
                    e: 9,
                    f: 6,
                },
            });
            var _a, _b, _c, _d, _e, _f, _g;
        });
        it('will write data to a specific id', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
                dataIdFromObject: function (o) { return o.key; },
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { key e f } } }"], _a.raw = ["{ a b foo { c d bar { key e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { key: 'foobar', __typename: 'bar', e: 5, f: 6 } } },
            });
            assert.deepEqual(client.readQuery({ query: (_b = ["{ a b foo { c d bar { key e f } } }"], _b.raw = ["{ a b foo { c d bar { key e f } } }"], gql(_b)) }), { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { __typename: 'bar', key: 'foobar', e: 5, f: 6 } } });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    __typename: 'foo',
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: 'foobar',
                        generated: false,
                    },
                },
                'foobar': {
                    key: 'foobar',
                    __typename: 'bar',
                    e: 5,
                    f: 6,
                },
            });
            var _a, _b;
        });
        it('will not use a default id getter if __typename is not present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
                addTypename: false,
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { id e f } } }"], _a.raw = ["{ a b foo { c d bar { id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { c: 3, d: 4, bar: { id: 'foobar', e: 5, f: 6 } } },
            });
            client.writeQuery({
                query: (_b = ["{ g h bar { i j foo { _id k l } } }"], _b.raw = ["{ g h bar { i j foo { _id k l } } }"], gql(_b)),
                data: { g: 8, h: 9, bar: { i: 10, j: 11, foo: { _id: 'barfoo', k: 12, l: 13 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    g: 8,
                    h: 9,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar',
                        generated: true,
                    },
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo.bar',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.bar': {
                    i: 10,
                    j: 11,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo.bar': {
                    id: 'foobar',
                    e: 5,
                    f: 6,
                },
                '$ROOT_QUERY.bar.foo': {
                    _id: 'barfoo',
                    k: 12,
                    l: 13,
                },
            });
            var _a, _b;
        });
        it('will not use a default id getter if id and _id are not present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { e f } } }"], _a.raw = ["{ a b foo { c d bar { e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { __typename: 'bar', e: 5, f: 6 } } },
            });
            client.writeQuery({
                query: (_b = ["{ g h bar { i j foo { k l } } }"], _b.raw = ["{ g h bar { i j foo { k l } } }"], gql(_b)),
                data: { g: 8, h: 9, bar: { __typename: 'bar', i: 10, j: 11, foo: { __typename: 'foo', k: 12, l: 13 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    g: 8,
                    h: 9,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar',
                        generated: true,
                    },
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    __typename: 'foo',
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo.bar',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.bar': {
                    __typename: 'bar',
                    i: 10,
                    j: 11,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo.bar': {
                    __typename: 'bar',
                    e: 5,
                    f: 6,
                },
                '$ROOT_QUERY.bar.foo': {
                    __typename: 'foo',
                    k: 12,
                    l: 13,
                },
            });
            var _a, _b;
        });
        it('will use a default id getter if __typename and id are present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { id e f } } }"], _a.raw = ["{ a b foo { c d bar { id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { __typename: 'bar', id: 'foobar', e: 5, f: 6 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    __typename: 'foo',
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: 'bar:foobar',
                        generated: false,
                    },
                },
                'bar:foobar': {
                    id: 'foobar',
                    __typename: 'bar',
                    e: 5,
                    f: 6,
                },
            });
            var _a;
        });
        it('will use a default id getter if __typename and _id are present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { _id e f } } }"], _a.raw = ["{ a b foo { c d bar { _id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { __typename: 'bar', _id: 'foobar', e: 5, f: 6 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    __typename: 'foo',
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: 'bar:foobar',
                        generated: false,
                    },
                },
                'bar:foobar': {
                    __typename: 'bar',
                    _id: 'foobar',
                    e: 5,
                    f: 6,
                },
            });
            var _a;
        });
        it('will not use a default id getter if id is present and __typename is not present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
                addTypename: false,
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { id e f } } }"], _a.raw = ["{ a b foo { c d bar { id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { c: 3, d: 4, bar: { id: 'foobar', e: 5, f: 6 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo.bar',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo.bar': {
                    id: 'foobar',
                    e: 5,
                    f: 6,
                },
            });
            var _a;
        });
        it('will not use a default id getter if _id is present but __typename is not present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
                addTypename: false,
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { _id e f } } }"], _a.raw = ["{ a b foo { c d bar { _id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { c: 3, d: 4, bar: { _id: 'foobar', e: 5, f: 6 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo.bar',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo.bar': {
                    _id: 'foobar',
                    e: 5,
                    f: 6,
                },
            });
            var _a;
        });
        it('will not use a default id getter if either _id or id is present when __typename is not also present', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
                addTypename: false,
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { id e f } } }"], _a.raw = ["{ a b foo { c d bar { id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { c: 3, d: 4, bar: { __typename: 'bar', id: 'foobar', e: 5, f: 6 } } },
            });
            client.writeQuery({
                query: (_b = ["{ g h bar { i j foo { _id k l } } }"], _b.raw = ["{ g h bar { i j foo { _id k l } } }"], gql(_b)),
                data: { g: 8, h: 9, bar: { i: 10, j: 11, foo: { _id: 'barfoo', k: 12, l: 13 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    g: 8,
                    h: 9,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar',
                        generated: true,
                    },
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: 'bar:foobar',
                        generated: false,
                    },
                },
                '$ROOT_QUERY.bar': {
                    i: 10,
                    j: 11,
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar.foo',
                        generated: true,
                    },
                },
                'bar:foobar': {
                    id: 'foobar',
                    e: 5,
                    f: 6,
                },
                '$ROOT_QUERY.bar.foo': {
                    _id: 'barfoo',
                    k: 12,
                    l: 13,
                },
            });
            var _a, _b;
        });
        it('will use a default id getter if one is not specified and __typename is present along with either _id or id', function () {
            var client = new ApolloClient({
                initialState: { apollo: { data: {} } },
            });
            client.writeQuery({
                query: (_a = ["{ a b foo { c d bar { id e f } } }"], _a.raw = ["{ a b foo { c d bar { id e f } } }"], gql(_a)),
                data: { a: 1, b: 2, foo: { __typename: 'foo', c: 3, d: 4, bar: { __typename: 'bar', id: 'foobar', e: 5, f: 6 } } },
            });
            client.writeQuery({
                query: (_b = ["{ g h bar { i j foo { _id k l } } }"], _b.raw = ["{ g h bar { i j foo { _id k l } } }"], gql(_b)),
                data: { g: 8, h: 9, bar: { __typename: 'bar', i: 10, j: 11, foo: { __typename: 'foo', _id: 'barfoo', k: 12, l: 13 } } },
            });
            assert.deepEqual(client.store.getState().apollo.data, {
                'ROOT_QUERY': {
                    a: 1,
                    b: 2,
                    g: 8,
                    h: 9,
                    bar: {
                        type: 'id',
                        id: '$ROOT_QUERY.bar',
                        generated: true,
                    },
                    foo: {
                        type: 'id',
                        id: '$ROOT_QUERY.foo',
                        generated: true,
                    },
                },
                '$ROOT_QUERY.foo': {
                    __typename: 'foo',
                    c: 3,
                    d: 4,
                    bar: {
                        type: 'id',
                        id: 'bar:foobar',
                        generated: false,
                    },
                },
                '$ROOT_QUERY.bar': {
                    __typename: 'bar',
                    i: 10,
                    j: 11,
                    foo: {
                        type: 'id',
                        id: 'foo:barfoo',
                        generated: false,
                    },
                },
                'bar:foobar': {
                    __typename: 'bar',
                    id: 'foobar',
                    e: 5,
                    f: 6,
                },
                'foo:barfoo': {
                    __typename: 'foo',
                    _id: 'barfoo',
                    k: 12,
                    l: 13,
                },
            });
            var _a, _b;
        });
    });
});
//# sourceMappingURL=ApolloClient.js.map