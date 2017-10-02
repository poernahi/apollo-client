var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
import { assert } from 'chai';
import mockNetworkInterface from './mocks/mockNetworkInterface';
import ApolloClient from '../src';
import { isMutationResultAction, isQueryResultAction } from '../src/actions';
import { cloneDeep } from 'lodash';
import gql from 'graphql-tag';
import { withWarning } from './util/wrap';
describe('mutation results', function () {
    var query = (_a = ["\n    query todoList {\n      todoList(id: 5) {\n        id\n        todos {\n          id\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          text\n          completed\n        }\n      }\n      noIdList: todoList(id: 6) {\n        id\n        todos {\n          text\n          completed\n        }\n      }\n    }\n  "], _a.raw = ["\n    query todoList {\n      todoList(id: 5) {\n        id\n        todos {\n          id\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          text\n          completed\n        }\n      }\n      noIdList: todoList(id: 6) {\n        id\n        todos {\n          text\n          completed\n        }\n      }\n    }\n  "], gql(_a));
    var queryWithTypename = (_b = ["\n    query todoList {\n      todoList(id: 5) {\n        id\n        todos {\n          id\n          text\n          completed\n          __typename\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n      noIdList: todoList(id: 6) {\n        id\n        todos {\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    }\n  "], _b.raw = ["\n    query todoList {\n      todoList(id: 5) {\n        id\n        todos {\n          id\n          text\n          completed\n          __typename\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n      noIdList: todoList(id: 6) {\n        id\n        todos {\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    }\n  "], gql(_b));
    var queryWithVars = (_c = ["\n    query todoList ($id: Int){\n      __typename\n      todoList(id: $id) {\n        __typename\n        id\n        todos {\n          id\n          __typename\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          __typename\n          text\n          completed\n        }\n      }\n    }\n  "], _c.raw = ["\n    query todoList ($id: Int){\n      __typename\n      todoList(id: $id) {\n        __typename\n        id\n        todos {\n          id\n          __typename\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          __typename\n          text\n          completed\n        }\n      }\n    }\n  "], gql(_c));
    var result = {
        data: {
            __typename: 'Query',
            todoList: {
                __typename: 'TodoList',
                id: '5',
                todos: [
                    {
                        __typename: 'Todo',
                        id: '3',
                        text: 'Hello world',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '6',
                        text: 'Second task',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '12',
                        text: 'Do other stuff',
                        completed: false,
                    },
                ],
                filteredTodos: [],
            },
            noIdList: {
                __typename: 'TodoList',
                id: '7',
                todos: [
                    {
                        __typename: 'Todo',
                        text: 'Hello world',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        text: 'Second task',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        text: 'Do other stuff',
                        completed: false,
                    },
                ],
            },
        },
    };
    var result6 = {
        data: {
            __typename: 'Query',
            todoList: {
                __typename: 'TodoList',
                id: '6',
                todos: [
                    {
                        __typename: 'Todo',
                        id: '13',
                        text: 'Hello world',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '16',
                        text: 'Second task',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '112',
                        text: 'Do other stuff',
                        completed: false,
                    },
                ],
                filteredTodos: [],
            },
        },
    };
    var result5 = {
        data: {
            __typename: 'Query',
            todoList: {
                __typename: 'TodoList',
                id: '5',
                todos: [
                    {
                        __typename: 'Todo',
                        id: '13',
                        text: 'Hello world',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '16',
                        text: 'Second task',
                        completed: false,
                    },
                    {
                        __typename: 'Todo',
                        id: '112',
                        text: 'Do other stuff',
                        completed: false,
                    },
                ],
                filteredTodos: [],
            },
        },
    };
    var client;
    var networkInterface;
    function setupObsHandle() {
        var mockedResponses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            mockedResponses[_i] = arguments[_i];
        }
        networkInterface = mockNetworkInterface.apply(void 0, [{
                request: { query: queryWithTypename },
                result: result,
            }].concat(mockedResponses));
        client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: true,
            dataIdFromObject: function (obj) {
                if (obj.id && obj.__typename) {
                    return obj.__typename + obj.id;
                }
                return null;
            },
        });
        return client.watchQuery({
            query: query,
            notifyOnNetworkStatusChange: false,
        });
    }
    function setupDelayObsHandle(delay) {
        var mockedResponses = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            mockedResponses[_i - 1] = arguments[_i];
        }
        networkInterface = mockNetworkInterface.apply(void 0, [{
                request: { query: queryWithTypename },
                result: result,
                delay: delay,
            }].concat(mockedResponses));
        client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: true,
            dataIdFromObject: function (obj) {
                if (obj.id && obj.__typename) {
                    return obj.__typename + obj.id;
                }
                return null;
            },
        });
        return client.watchQuery({
            query: query,
            notifyOnNetworkStatusChange: false,
        });
    }
    function setup() {
        var mockedResponses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            mockedResponses[_i] = arguments[_i];
        }
        var obsHandle = setupObsHandle.apply(void 0, mockedResponses);
        return obsHandle.result();
    }
    it('correctly primes cache for tests', function () {
        return setup()
            .then(function () { return client.query({
            query: query,
        }); });
    });
    it('correctly integrates field changes by default', function () {
        var mutation = (_a = ["\n      mutation setCompleted {\n        setCompleted(todoId: \"3\") {\n          id\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation setCompleted {\n        setCompleted(todoId: \"3\") {\n          id\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var mutationResult = {
            data: {
                __typename: 'Mutation',
                setCompleted: {
                    __typename: 'Todo',
                    id: '3',
                    completed: true,
                },
            },
        };
        return setup({
            request: { query: mutation },
            result: mutationResult,
        })
            .then(function () {
            return client.mutate({ mutation: mutation });
        })
            .then(function () {
            return client.query({ query: query });
        })
            .then(function (newResult) {
            assert.isTrue(newResult.data.todoList.todos[0].completed);
        });
        var _a;
    });
    it('should warn when the result fields don\'t match the query fields', function () {
        var handle;
        var subscriptionHandle;
        var counter = 0;
        var queryTodos = (_a = ["\n      query todos {\n        todos {\n          id\n          name\n          description\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query todos {\n        todos {\n          id\n          name\n          description\n          __typename\n        }\n      }\n    "], gql(_a));
        var queryTodosResult = {
            data: {
                todos: [{
                        id: '1',
                        name: 'Todo 1',
                        description: 'Description 1',
                        __typename: 'todos',
                    }],
            },
        };
        var mutationTodo = (_b = ["\n      mutation createTodo {\n        createTodo {\n          id\n          name\n          # missing field: description\n          __typename\n        }\n      }\n    "], _b.raw = ["\n      mutation createTodo {\n        createTodo {\n          id\n          name\n          # missing field: description\n          __typename\n        }\n      }\n    "], gql(_b));
        var mutationTodoResult = {
            data: {
                createTodo: {
                    id: '2',
                    name: 'Todo 2',
                    __typename: 'createTodo',
                },
            },
        };
        return withWarning(function () {
            return setup({
                request: { query: queryTodos },
                result: queryTodosResult,
            }, {
                request: { query: mutationTodo },
                result: mutationTodoResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    handle = client.watchQuery({ query: queryTodos });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) {
                            counter++;
                            resolve(res);
                        },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutationTodo,
                    updateQueries: {
                        todos: function (prev, _a) {
                            var mutationResult = _a.mutationResult;
                            var newTodo = mutationResult.data.createTodo;
                            var newResults = {
                                todos: prev.todos.concat([
                                    newTodo,
                                ]),
                            };
                            return newResults;
                        },
                    },
                });
            }).then(function () { return subscriptionHandle.unsubscribe(); });
        }, /Missing field description/);
        var _a, _b;
    });
    describe('result reducer', function () {
        var mutation = (_a = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var mutationResult = {
            data: {
                __typename: 'Mutation',
                createTodo: {
                    id: '99',
                    __typename: 'Todo',
                    text: 'This one was created with a mutation.',
                    completed: true,
                },
            },
        };
        var query2 = (_b = ["\n      query newTodos {\n        __typename\n        newTodos(since: 1){\n          __typename\n          id\n          text\n          completed\n        }\n      }\n    "], _b.raw = ["\n      query newTodos {\n        __typename\n        newTodos(since: 1){\n          __typename\n          id\n          text\n          completed\n        }\n      }\n    "], gql(_b));
        var result2 = {
            data: {
                __typename: 'Query',
                newTodos: [
                    {
                        __typename: 'Todo',
                        id: '3030',
                        text: 'Recently added',
                        completed: false,
                    },
                ],
            },
        };
        it('is called on mutation result', function () {
            var counter = 0;
            var observableQuery;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                observableQuery = client.watchQuery({
                    query: query,
                    reducer: function (previousResult, action) {
                        counter++;
                        if (isMutationResultAction(action)) {
                            var newResult = cloneDeep(previousResult);
                            newResult.todoList.todos.unshift(action.result.data['createTodo']);
                            return newResult;
                        }
                        return previousResult;
                    },
                }).subscribe({
                    next: function () { return null; },
                });
                return client.mutate({
                    mutation: mutation,
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                observableQuery.unsubscribe();
                assert.equal(counter, 1);
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('passes variables', function () {
            var counter = 0;
            var observableQuery;
            var subscription;
            return setup({
                request: { query: queryWithVars, variables: { id: 5 } },
                result: result5,
            }, {
                request: { query: mutation },
                result: mutationResult,
                delay: 5,
            }, {
                request: { query: queryWithVars, variables: { id: 6 } },
                result: result6,
            }, {
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                observableQuery = client.watchQuery({
                    query: queryWithVars,
                    variables: { id: 5 },
                    reducer: function (previousResult, action, variables) {
                        counter++;
                        if (isMutationResultAction(action) && variables['id'] === 5) {
                            var newResult = cloneDeep(previousResult);
                            newResult.todoList.todos.unshift(action.result.data['createTodo']);
                            return newResult;
                        }
                        return previousResult;
                    },
                });
                subscription = observableQuery.subscribe({
                    next: function () { return null; },
                });
                return client.mutate({
                    mutation: mutation,
                });
            })
                .then(function () {
                return observableQuery.setOptions({ variables: { id: 6 } });
            })
                .then(function (res) {
                return client.mutate({
                    mutation: mutation,
                });
            })
                .then(function () {
                return observableQuery.setOptions({ variables: { id: 5 } });
            })
                .then(function (newResult) {
                subscription.unsubscribe();
                assert.equal(counter, 4);
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('can filter based on operationName', function () {
            var counter = 0;
            var observableQuery;
            var observableQuery2;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                observableQuery = client.watchQuery({
                    query: query,
                    reducer: function (previousResult, action) {
                        if (isMutationResultAction(action) && action.operationName === 'createTodo') {
                            counter++;
                            var newResult = cloneDeep(previousResult);
                            newResult.todoList.todos.unshift(action.result.data['createTodo']);
                            return newResult;
                        }
                        return previousResult;
                    },
                }).subscribe({
                    next: function () { return null; },
                });
                observableQuery2 = client.watchQuery({
                    query: query,
                    reducer: function (previousResult, action) {
                        if (isMutationResultAction(action) && action.operationName === 'wrongName') {
                            counter++;
                            var newResult = cloneDeep(previousResult);
                            newResult.todoList.todos.unshift(action.result.data['createTodo']);
                            return newResult;
                        }
                        return previousResult;
                    },
                }).subscribe({
                    next: function () { return null; },
                });
                return client.mutate({
                    mutation: mutation,
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                observableQuery.unsubscribe();
                assert.equal(counter, 1);
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('is called on query result as well', function () {
            var counter = 0;
            var observableQuery;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            }, {
                request: { query: query2 },
                result: result2,
            })
                .then(function () {
                observableQuery = client.watchQuery({
                    query: query,
                    reducer: function (previousResult, action) {
                        counter++;
                        if (isQueryResultAction(action)) {
                            var newResult = cloneDeep(previousResult);
                            newResult.todoList.todos.unshift(action.result.data['newTodos'][0]);
                            return newResult;
                        }
                        return previousResult;
                    },
                }).subscribe({
                    next: function () { return null; },
                });
            })
                .then(function () {
                return client.query({ query: query2 });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                observableQuery.unsubscribe();
                assert.equal(counter, 1);
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'Recently added');
            });
        });
        it('does not fail if the query is still loading', function () {
            function setupReducerObsHandle() {
                var mockedResponses = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    mockedResponses[_i] = arguments[_i];
                }
                networkInterface = mockNetworkInterface.apply(void 0, [{
                        request: { query: queryWithTypename },
                        result: result,
                        delay: 30,
                    }].concat(mockedResponses));
                client = new ApolloClient({
                    networkInterface: networkInterface,
                    addTypename: true,
                    dataIdFromObject: function (obj) {
                        if (obj.id && obj.__typename) {
                            return obj.__typename + obj.id;
                        }
                        return null;
                    },
                });
                return client.watchQuery({
                    query: query,
                    reducer: function (state, action) {
                        if (isMutationResultAction(action)) {
                            assert.deepEqual(state, {});
                        }
                        return state;
                    },
                });
            }
            var obsHandle = setupReducerObsHandle({
                request: { query: mutation },
                result: mutationResult,
            });
            var subs = obsHandle.subscribe({
                next: function () { return null; },
            });
            return client.mutate({
                mutation: mutation,
            }).then(function (res) {
                subs.unsubscribe();
            });
        });
        describe('error handling', function () {
            var oldWarn = console.warn;
            var warned;
            var timesWarned = 0;
            beforeEach(function (done) {
                warned = null;
                timesWarned = 0;
                console.warn = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    warned = args;
                    timesWarned++;
                };
                done();
            });
            it('does not swallow errors', function (done) {
                client = new ApolloClient({
                    networkInterface: mockNetworkInterface({
                        request: { query: queryWithTypename },
                        result: result,
                    }),
                });
                var observable = client.watchQuery({
                    query: query,
                    reducer: function () {
                        throw new Error('Don’t swallow me right up!');
                    },
                });
                observable.subscribe({
                    next: function () {
                        done(new Error('`next` should not be called.'));
                    },
                    error: function (error) {
                        assert(/swallow/.test(error.message));
                        assert(/swallow/.test(warned[1].message));
                        assert.equal(timesWarned, 1);
                        done();
                    },
                });
            });
            afterEach(function (done) {
                console.warn = oldWarn;
                done();
            });
        });
        var _a, _b;
    });
    describe('updateQueries', function () {
        var mutation = (_a = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var mutationResult = {
            data: {
                __typename: 'Mutation',
                createTodo: {
                    id: '99',
                    __typename: 'Todo',
                    text: 'This one was created with a mutation.',
                    completed: true,
                },
            },
        };
        it('analogous of ARRAY_INSERT', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({ query: query });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) { resolve(res); },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutation,
                    updateQueries: {
                        todoList: function (prev, options) {
                            var mResult = options.mutationResult;
                            assert.equal(mResult.data.createTodo.id, '99');
                            assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                            var state = cloneDeep(prev);
                            state.todoList.todos.unshift(mResult.data.createTodo);
                            return state;
                        },
                    },
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('does not fail if optional query variables are not supplied', function () {
            var subscriptionHandle;
            var mutationWithVars = (_a = ["\n          mutation createTodo($requiredVar: String!, $optionalVar: String) {\n              createTodo(requiredVar: $requiredVar, optionalVar:$optionalVar) {\n                  id\n                  text\n                  completed\n                  __typename\n              }\n              __typename\n          }\n      "], _a.raw = ["\n          mutation createTodo($requiredVar: String!, $optionalVar: String) {\n              createTodo(requiredVar: $requiredVar, optionalVar:$optionalVar) {\n                  id\n                  text\n                  completed\n                  __typename\n              }\n              __typename\n          }\n      "], gql(_a));
            var variables = {
                requiredVar: 'x',
            };
            return setup({
                request: {
                    query: mutationWithVars,
                    variables: variables,
                },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({
                        query: query,
                        variables: variables,
                    });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) {
                            resolve(res);
                        },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutationWithVars,
                    variables: variables,
                    updateQueries: {
                        todoList: function (prev, options) {
                            var mResult = options.mutationResult;
                            assert.equal(mResult.data.createTodo.id, '99');
                            assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                            var state = cloneDeep(prev);
                            state.todoList.todos.unshift(mResult.data.createTodo);
                            return state;
                        },
                    },
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
            var _a;
        });
        it('does not fail if the query did not complete correctly', function () {
            var obsHandle = setupObsHandle({
                request: { query: mutation },
                result: mutationResult,
            });
            var subs = obsHandle.subscribe({
                next: function () { return null; },
            });
            subs.unsubscribe();
            return client.mutate({
                mutation: mutation,
                updateQueries: {
                    todoList: function (prev, options) {
                        var mResult = options.mutationResult;
                        assert.equal(mResult.data.createTodo.id, '99');
                        assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                        var state = cloneDeep(prev);
                        state.todoList.todos.unshift(mResult.data.createTodo);
                        return state;
                    },
                },
            });
        });
        it('does not fail if the query did not finish loading', function () {
            var obsHandle = setupDelayObsHandle(15, {
                request: { query: mutation },
                result: mutationResult,
            });
            var subs = obsHandle.subscribe({
                next: function () { return null; },
            });
            return client.mutate({
                mutation: mutation,
                updateQueries: {
                    todoList: function (prev, options) {
                        var mResult = options.mutationResult;
                        assert.equal(mResult.data.createTodo.id, '99');
                        assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                        var state = cloneDeep(prev);
                        state.todoList.todos.unshift(mResult.data.createTodo);
                        return state;
                    },
                },
            });
        });
        it('does not make next queries fail if a mutation fails', function (done) {
            var obsHandle = setupObsHandle({
                request: { query: mutation },
                result: { errors: [new Error('mock error')] },
            }, {
                request: { query: queryWithTypename },
                result: result,
            });
            obsHandle.subscribe({
                next: function (obj) {
                    client.mutate({
                        mutation: mutation,
                        updateQueries: {
                            todoList: function (prev, options) {
                                var mResult = options.mutationResult;
                                var state = cloneDeep(prev);
                                state.todoList.todos.unshift(mResult.data && mResult.data.createTodo);
                                return state;
                            },
                        },
                    })
                        .then(function () { return done(new Error('Mutation should have failed')); }, function () { return client.mutate({
                        mutation: mutation,
                        updateQueries: {
                            todoList: function (prev, options) {
                                var mResult = options.mutationResult;
                                var state = cloneDeep(prev);
                                state.todoList.todos.unshift(mResult.data.createTodo);
                                return state;
                            },
                        },
                    }); })
                        .then(function () { return done(new Error('Mutation should have failed')); }, function () { return obsHandle.refetch(); })
                        .then(function () { return done(); }, done);
                },
            });
        });
        it('error handling in reducer functions', function () {
            var oldError = console.error;
            var errors = [];
            console.error = function (msg) {
                errors.push(msg);
            };
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({ query: query });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) { resolve(res); },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutation,
                    updateQueries: {
                        todoList: function (prev, options) {
                            throw new Error("Hello... It's me.");
                        },
                    },
                });
            })
                .then(function () {
                subscriptionHandle.unsubscribe();
                assert.lengthOf(errors, 1);
                assert.equal(errors[0].message, "Hello... It's me.");
                console.error = oldError;
            });
        });
        var _a;
    });
    it('does not fail if one of the previous queries did not complete correctly', function (done) {
        var variableQuery = (_a = ["\n      query Echo($message: String) {\n        echo(message: $message)\n      }\n    "], _a.raw = ["\n      query Echo($message: String) {\n        echo(message: $message)\n      }\n    "], gql(_a));
        var variables1 = {
            message: 'a',
        };
        var result1 = {
            data: {
                echo: 'a',
            },
        };
        var variables2 = {
            message: 'b',
        };
        var result2 = {
            data: {
                echo: 'b',
            },
        };
        var resetMutation = (_b = ["\n      mutation Reset {\n        reset {\n          echo\n        }\n      }\n    "], _b.raw = ["\n      mutation Reset {\n        reset {\n          echo\n        }\n      }\n    "], gql(_b));
        var resetMutationResult = {
            data: {
                reset: {
                    echo: '0',
                },
            },
        };
        networkInterface = mockNetworkInterface({
            request: { query: variableQuery, variables: variables1 },
            result: result1,
        }, {
            request: { query: variableQuery, variables: variables2 },
            result: result2,
        }, {
            request: { query: resetMutation },
            result: resetMutationResult,
        });
        client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var watchedQuery = client.watchQuery({
            query: variableQuery,
            variables: variables1,
        });
        var firstSubs = watchedQuery.subscribe({
            next: function () { return null; },
            error: done,
        });
        firstSubs.unsubscribe();
        var yieldCount = 0;
        watchedQuery.subscribe({
            next: function (_a) {
                var data = _a.data;
                yieldCount += 1;
                if (yieldCount === 1) {
                    assert.equal(data.echo, 'b');
                    client.mutate({
                        mutation: resetMutation,
                        updateQueries: {
                            Echo: function (prev, options) {
                                return { echo: '0' };
                            },
                        },
                    });
                }
                else if (yieldCount === 2) {
                    assert.equal(data.echo, '0');
                    done();
                }
            },
            error: function () {
            },
        });
        watchedQuery.refetch(variables2);
        var _a, _b;
    });
    it('allows mutations with optional arguments', function (done) {
        var count = 0;
        client = new ApolloClient({
            addTypename: false,
            networkInterface: {
                query: function (_a) {
                    var variables = _a.variables;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(variables, { a: 1, b: 2 });
                            return Promise.resolve({ data: { result: 'hello' } });
                        case 1:
                            assert.deepEqual(variables, { a: 1, c: 3 });
                            return Promise.resolve({ data: { result: 'world' } });
                        case 2:
                            assert.deepEqual(variables, { a: undefined, b: 2, c: 3 });
                            return Promise.resolve({ data: { result: 'goodbye' } });
                        case 3:
                            assert.deepEqual(variables, {});
                            return Promise.resolve({ data: { result: 'moon' } });
                        default:
                            return Promise.reject(new Error('Too many network calls.'));
                    }
                },
            },
        });
        var mutation = (_a = ["\n      mutation ($a: Int!, $b: Int, $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], _a.raw = ["\n      mutation ($a: Int!, $b: Int, $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], gql(_a));
        Promise.all([
            client.mutate({
                mutation: mutation,
                variables: { a: 1, b: 2 },
            }),
            client.mutate({
                mutation: mutation,
                variables: { a: 1, c: 3 },
            }),
            client.mutate({
                mutation: mutation,
                variables: { a: undefined, b: 2, c: 3 },
            }),
            client.mutate({
                mutation: mutation,
            }),
        ]).then(function () {
            assert.deepEqual(client.queryManager.getApolloState().data, {
                ROOT_MUTATION: {
                    'result({"a":1,"b":2})': 'hello',
                    'result({"a":1,"c":3})': 'world',
                    'result({"b":2,"c":3})': 'goodbye',
                    'result({})': 'moon',
                },
            });
            done();
        }).catch(done);
        var _a;
    });
    it('allows mutations with default values', function (done) {
        var count = 0;
        client = new ApolloClient({
            addTypename: false,
            networkInterface: {
                query: function (_a) {
                    var variables = _a.variables;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(variables, { a: 1, b: 'water' });
                            return Promise.resolve({ data: { result: 'hello' } });
                        case 1:
                            assert.deepEqual(variables, { a: 2, b: 'cheese', c: 3 });
                            return Promise.resolve({ data: { result: 'world' } });
                        case 2:
                            assert.deepEqual(variables, { a: 1, b: 'cheese', c: 3 });
                            return Promise.resolve({ data: { result: 'goodbye' } });
                        default:
                            return Promise.reject(new Error('Too many network calls.'));
                    }
                },
            },
        });
        var mutation = (_a = ["\n      mutation ($a: Int = 1, $b: String = \"cheese\", $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], _a.raw = ["\n      mutation ($a: Int = 1, $b: String = \"cheese\", $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], gql(_a));
        Promise.all([
            client.mutate({
                mutation: mutation,
                variables: { a: 1, b: 'water' },
            }),
            client.mutate({
                mutation: mutation,
                variables: { a: 2, c: 3 },
            }),
            client.mutate({
                mutation: mutation,
                variables: { c: 3 },
            }),
        ]).then(function () {
            assert.deepEqual(client.queryManager.getApolloState().data, {
                ROOT_MUTATION: {
                    'result({"a":1,"b":"water"})': 'hello',
                    'result({"a":2,"b":"cheese","c":3})': 'world',
                    'result({"a":1,"b":"cheese","c":3})': 'goodbye',
                },
            });
            done();
        }).catch(done);
        var _a;
    });
    it('will pass null to the network interface when provided', function (done) {
        var count = 0;
        client = new ApolloClient({
            addTypename: false,
            networkInterface: {
                query: function (_a) {
                    var variables = _a.variables;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(variables, { a: 1, b: 2, c: null });
                            return Promise.resolve({ data: { result: 'hello' } });
                        case 1:
                            assert.deepEqual(variables, { a: 1, b: null, c: 3 });
                            return Promise.resolve({ data: { result: 'world' } });
                        case 2:
                            assert.deepEqual(variables, { a: null, b: null, c: null });
                            return Promise.resolve({ data: { result: 'moon' } });
                        default:
                            return Promise.reject(new Error('Too many network calls.'));
                    }
                },
            },
        });
        var mutation = (_a = ["\n      mutation ($a: Int!, $b: Int, $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], _a.raw = ["\n      mutation ($a: Int!, $b: Int, $c: Int) {\n        result(a: $a, b: $b, c: $c)\n      }\n    "], gql(_a));
        Promise.all([
            client.mutate({
                mutation: mutation,
                variables: { a: 1, b: 2, c: null },
            }),
            client.mutate({
                mutation: mutation,
                variables: { a: 1, b: null, c: 3 },
            }),
            client.mutate({
                mutation: mutation,
                variables: { a: null, b: null, c: null },
            }),
        ]).then(function () {
            assert.deepEqual(client.queryManager.getApolloState().data, {
                ROOT_MUTATION: {
                    'result({"a":1,"b":2,"c":null})': 'hello',
                    'result({"a":1,"b":null,"c":3})': 'world',
                    'result({"a":null,"b":null,"c":null})': 'moon',
                },
            });
            done();
        }).catch(done);
        var _a;
    });
    describe('store transaction updater', function () {
        var mutation = (_a = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var mutationResult = {
            data: {
                __typename: 'Mutation',
                createTodo: {
                    id: '99',
                    __typename: 'Todo',
                    text: 'This one was created with a mutation.',
                    completed: true,
                },
            },
        };
        it('analogous of ARRAY_INSERT', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({ query: query });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) { resolve(res); },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutation,
                    update: function (proxy, mResult) {
                        assert.equal(mResult.data.createTodo.id, '99');
                        assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                        var id = 'TodoList5';
                        var fragment = (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a));
                        var data = proxy.readFragment({ id: id, fragment: fragment });
                        proxy.writeFragment({
                            data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                            id: id, fragment: fragment,
                        });
                        var _a;
                    },
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('does not fail if optional query variables are not supplied', function () {
            var subscriptionHandle;
            var mutationWithVars = (_a = ["\n          mutation createTodo($requiredVar: String!, $optionalVar: String) {\n              createTodo(requiredVar: $requiredVar, optionalVar:$optionalVar) {\n                  id\n                  text\n                  completed\n                  __typename\n              }\n              __typename\n          }\n      "], _a.raw = ["\n          mutation createTodo($requiredVar: String!, $optionalVar: String) {\n              createTodo(requiredVar: $requiredVar, optionalVar:$optionalVar) {\n                  id\n                  text\n                  completed\n                  __typename\n              }\n              __typename\n          }\n      "], gql(_a));
            var variables = {
                requiredVar: 'x',
            };
            return setup({
                request: {
                    query: mutationWithVars,
                    variables: variables,
                },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({
                        query: query,
                        variables: variables,
                    });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) {
                            resolve(res);
                        },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutationWithVars,
                    variables: variables,
                    update: function (proxy, mResult) {
                        assert.equal(mResult.data.createTodo.id, '99');
                        assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                        var id = 'TodoList5';
                        var fragment = (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a));
                        var data = proxy.readFragment({ id: id, fragment: fragment });
                        proxy.writeFragment({
                            data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                            id: id, fragment: fragment,
                        });
                        var _a;
                    },
                });
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
            var _a;
        });
        it('does not make next queries fail if a mutation fails', function (done) {
            var obsHandle = setupObsHandle({
                request: { query: mutation },
                result: { errors: [new Error('mock error')] },
            }, {
                request: { query: queryWithTypename },
                result: result,
            });
            obsHandle.subscribe({
                next: function (obj) {
                    client.mutate({
                        mutation: mutation,
                        update: function (proxy, mResult) {
                            assert.equal(mResult.data.createTodo.id, '99');
                            assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                            var id = 'TodoList5';
                            var fragment = (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a));
                            var data = proxy.readFragment({ id: id, fragment: fragment });
                            proxy.writeFragment({
                                data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                                id: id, fragment: fragment,
                            });
                            var _a;
                        },
                    })
                        .then(function () { return done(new Error('Mutation should have failed')); }, function () { return client.mutate({
                        mutation: mutation,
                        update: function (proxy, mResult) {
                            assert.equal(mResult.data.createTodo.id, '99');
                            assert.equal(mResult.data.createTodo.text, 'This one was created with a mutation.');
                            var id = 'TodoList5';
                            var fragment = (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a));
                            var data = proxy.readFragment({ id: id, fragment: fragment });
                            proxy.writeFragment({
                                data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                                id: id, fragment: fragment,
                            });
                            var _a;
                        },
                    }); })
                        .then(function () { return done(new Error('Mutation should have failed')); }, function () { return obsHandle.refetch(); })
                        .then(function () { return done(); }, done);
                },
            });
        });
        it('error handling in reducer functions', function () {
            var oldError = console.error;
            var errors = [];
            console.error = function (msg) {
                errors.push(msg);
            };
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    var handle = client.watchQuery({ query: query });
                    subscriptionHandle = handle.subscribe({
                        next: function (res) { resolve(res); },
                    });
                });
            })
                .then(function () {
                return client.mutate({
                    mutation: mutation,
                    update: function () {
                        throw new Error("Hello... It's me.");
                    },
                });
            })
                .then(function () {
                subscriptionHandle.unsubscribe();
                assert.lengthOf(errors, 1);
                assert.equal(errors[0].message, "Hello... It's me.");
                console.error = oldError;
            });
        });
        var _a;
    });
    var _a, _b, _c;
});
//# sourceMappingURL=mutationResults.js.map