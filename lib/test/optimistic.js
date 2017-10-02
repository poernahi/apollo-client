var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
import * as chai from 'chai';
var assert = chai.assert;
import mockNetworkInterface from './mocks/mockNetworkInterface';
import ApolloClient from '../src';
import { assign, cloneDeep } from 'lodash';
import gql from 'graphql-tag';
import { addTypenameToDocument, } from '../src/queries/queryTransform';
import { isMutationResultAction, } from '../src/actions';
describe('optimistic mutation results', function () {
    var query = (_a = ["\n    query todoList {\n      __typename\n      todoList(id: 5) {\n        __typename\n        id\n        todos {\n          id\n          __typename\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          __typename\n          text\n          completed\n        }\n      }\n      noIdList: todoList(id: 6) {\n        __typename\n        id\n        todos {\n          __typename\n          text\n          completed\n        }\n      }\n    }\n  "], _a.raw = ["\n    query todoList {\n      __typename\n      todoList(id: 5) {\n        __typename\n        id\n        todos {\n          id\n          __typename\n          text\n          completed\n        }\n        filteredTodos: todos(completed: true) {\n          id\n          __typename\n          text\n          completed\n        }\n      }\n      noIdList: todoList(id: 6) {\n        __typename\n        id\n        todos {\n          __typename\n          text\n          completed\n        }\n      }\n    }\n  "], gql(_a));
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
    var client;
    var networkInterface;
    function setup() {
        var mockedResponses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            mockedResponses[_i] = arguments[_i];
        }
        networkInterface = mockNetworkInterface.apply(void 0, [{
                request: { query: query },
                result: result,
            }].concat(mockedResponses));
        client = new ApolloClient({
            networkInterface: networkInterface,
            dataIdFromObject: function (obj) {
                if (obj.id && obj.__typename) {
                    return obj.__typename + obj.id;
                }
                return null;
            },
        });
        var obsHandle = client.watchQuery({
            query: query,
        });
        return obsHandle.result();
    }
    describe('error handling', function () {
        var mutation = (_a = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation createTodo {\n        # skipping arguments in the test since they don't matter\n        createTodo {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var mutationResult = {
            data: {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: '99',
                    text: 'This one was created with a mutation.',
                    completed: true,
                },
            },
        };
        var mutationResult2 = {
            data: assign({}, mutationResult.data, {
                createTodo: assign({}, mutationResult.data.createTodo, {
                    id: '66',
                    text: 'Second mutation.',
                }),
            }),
        };
        var optimisticResponse = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '99',
                text: 'Optimistically generated',
                completed: true,
            },
        };
        var optimisticResponse2 = assign({}, optimisticResponse, {
            createTodo: assign({}, optimisticResponse.createTodo, {
                id: '66',
                text: 'Optimistically generated 2',
            }),
        });
        describe('with `updateQueries`', function () {
            var updateQueries = {
                todoList: function (prev, options) {
                    var state = cloneDeep(prev);
                    state.todoList.todos.unshift(options.mutationResult.data.createTodo);
                    return state;
                },
            };
            it('handles a single error for a single mutation', function () {
                return setup({
                    request: { query: mutation },
                    error: new Error('forbidden (test error)'),
                })
                    .then(function () {
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        updateQueries: updateQueries,
                    });
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 4);
                    assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                    return promise;
                })
                    .catch(function (err) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Network error: forbidden (test error)');
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 3);
                    assert.notProperty(dataInStore, 'Todo99');
                });
            });
            it('handles errors produced by one mutation in a series', function () {
                var subscriptionHandle;
                return setup({
                    request: { query: mutation },
                    error: new Error('forbidden (test error)'),
                }, {
                    request: { query: mutation },
                    result: mutationResult2,
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
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        updateQueries: updateQueries,
                    }).catch(function (err) {
                        assert.instanceOf(err, Error);
                        assert.equal(err.message, 'Network error: forbidden (test error)');
                        return null;
                    });
                    var promise2 = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse2,
                        updateQueries: updateQueries,
                    });
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 5);
                    assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                    assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                    return Promise.all([promise, promise2]);
                })
                    .then(function () {
                    subscriptionHandle.unsubscribe();
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 4);
                    assert.notProperty(dataInStore, 'Todo99');
                    assert.property(dataInStore, 'Todo66');
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                    assert.notDeepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
                });
            });
            it('can run 2 mutations concurrently and handles all intermediate states well', function () {
                function checkBothMutationsAreApplied(expectedText1, expectedText2) {
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 5);
                    assert.property(dataInStore, 'Todo99');
                    assert.property(dataInStore, 'Todo66');
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
                    assert.equal(dataInStore['Todo99'].text, expectedText1);
                    assert.equal(dataInStore['Todo66'].text, expectedText2);
                }
                var subscriptionHandle;
                return setup({
                    request: { query: mutation },
                    result: mutationResult,
                }, {
                    request: { query: mutation },
                    result: mutationResult2,
                    delay: 100,
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
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        updateQueries: updateQueries,
                    }).then(function (res) {
                        checkBothMutationsAreApplied('This one was created with a mutation.', 'Optimistically generated 2');
                        var latestState = client.queryManager.mutationStore;
                        assert.equal(latestState.get('5').loading, false);
                        assert.equal(latestState.get('6').loading, true);
                        return res;
                    });
                    var promise2 = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse2,
                        updateQueries: updateQueries,
                    }).then(function (res) {
                        checkBothMutationsAreApplied('This one was created with a mutation.', 'Second mutation.');
                        var latestState = client.queryManager.mutationStore;
                        assert.equal(latestState.get('5').loading, false);
                        assert.equal(latestState.get('6').loading, false);
                        return res;
                    });
                    var mutationsState = client.queryManager.mutationStore;
                    assert.equal(mutationsState.get('5').loading, true);
                    assert.equal(mutationsState.get('6').loading, true);
                    checkBothMutationsAreApplied('Optimistically generated', 'Optimistically generated 2');
                    return Promise.all([promise, promise2]);
                })
                    .then(function () {
                    subscriptionHandle.unsubscribe();
                    checkBothMutationsAreApplied('This one was created with a mutation.', 'Second mutation.');
                });
            });
        });
        describe('with `update`', function () {
            var update = function (proxy, mResult) {
                var data = proxy.readFragment({
                    id: 'TodoList5',
                    fragment: (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a)),
                });
                proxy.writeFragment({
                    data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                    id: 'TodoList5',
                    fragment: (_b = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _b.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_b)),
                });
                var _a, _b;
            };
            it('handles a single error for a single mutation', function () {
                return setup({
                    request: { query: mutation },
                    error: new Error('forbidden (test error)'),
                })
                    .then(function () {
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        update: update,
                    });
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 4);
                    assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                    return promise;
                })
                    .catch(function (err) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Network error: forbidden (test error)');
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 3);
                    assert.notProperty(dataInStore, 'Todo99');
                });
            });
            it('handles errors produced by one mutation in a series', function () {
                var subscriptionHandle;
                return setup({
                    request: { query: mutation },
                    error: new Error('forbidden (test error)'),
                }, {
                    request: { query: mutation },
                    result: mutationResult2,
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
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        update: update,
                    }).catch(function (err) {
                        assert.instanceOf(err, Error);
                        assert.equal(err.message, 'Network error: forbidden (test error)');
                        return null;
                    });
                    var promise2 = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse2,
                        update: update,
                    });
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 5);
                    assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                    assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                    return Promise.all([promise, promise2]);
                })
                    .then(function () {
                    subscriptionHandle.unsubscribe();
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 4);
                    assert.notProperty(dataInStore, 'Todo99');
                    assert.property(dataInStore, 'Todo66');
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                    assert.notDeepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
                });
            });
            it('can run 2 mutations concurrently and handles all intermediate states well', function () {
                function checkBothMutationsAreApplied(expectedText1, expectedText2) {
                    var dataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(dataInStore['TodoList5'].todos.length, 5);
                    assert.property(dataInStore, 'Todo99');
                    assert.property(dataInStore, 'Todo66');
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                    assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
                    assert.equal(dataInStore['Todo99'].text, expectedText1);
                    assert.equal(dataInStore['Todo66'].text, expectedText2);
                }
                var subscriptionHandle;
                return setup({
                    request: { query: mutation },
                    result: mutationResult,
                }, {
                    request: { query: mutation },
                    result: mutationResult2,
                    delay: 100,
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
                    var promise = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse,
                        update: update,
                    }).then(function (res) {
                        checkBothMutationsAreApplied('This one was created with a mutation.', 'Optimistically generated 2');
                        var latestState = client.queryManager.mutationStore;
                        assert.equal(latestState.get('5').loading, false);
                        assert.equal(latestState.get('6').loading, true);
                        return res;
                    });
                    var promise2 = client.mutate({
                        mutation: mutation,
                        optimisticResponse: optimisticResponse2,
                        update: update,
                    }).then(function (res) {
                        checkBothMutationsAreApplied('This one was created with a mutation.', 'Second mutation.');
                        var latestState = client.queryManager.mutationStore;
                        assert.equal(latestState.get('5').loading, false);
                        assert.equal(latestState.get('6').loading, false);
                        return res;
                    });
                    var mutationsState = client.queryManager.mutationStore;
                    assert.equal(mutationsState.get('5').loading, true);
                    assert.equal(mutationsState.get('6').loading, true);
                    checkBothMutationsAreApplied('Optimistically generated', 'Optimistically generated 2');
                    return Promise.all([promise, promise2]);
                })
                    .then(function () {
                    subscriptionHandle.unsubscribe();
                    checkBothMutationsAreApplied('This one was created with a mutation.', 'Second mutation.');
                });
            });
        });
        var _a;
    });
    describe('passing a function to optimisticResponse', function () {
        var mutation = (_a = ["\n      mutation createTodo ($text: String) {\n        createTodo (text: $text) {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      mutation createTodo ($text: String) {\n        createTodo (text: $text) {\n          id\n          text\n          completed\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var variables = { text: 'Optimistically generated from variables' };
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
        var optimisticResponse = function (_a) {
            var text = _a.text;
            return ({
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: '99',
                    text: text,
                    completed: true,
                },
            });
        };
        it('will use a passed variable in optimisticResponse', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation, variables: variables },
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
                var promise = client.mutate({
                    mutation: mutation,
                    variables: variables,
                    optimisticResponse: optimisticResponse,
                    update: function (proxy, mResult) {
                        assert.equal(mResult.data.createTodo.id, '99');
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
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated from variables');
                return promise;
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
        var _a;
    });
    describe('optimistic updates using `updateQueries`', function () {
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
        var optimisticResponse = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '99',
                text: 'Optimistically generated',
                completed: true,
            },
        };
        var mutationResult2 = {
            data: assign({}, mutationResult.data, {
                createTodo: assign({}, mutationResult.data.createTodo, {
                    id: '66',
                    text: 'Second mutation.',
                }),
            }),
        };
        var optimisticResponse2 = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '66',
                text: 'Optimistically generated 2',
                completed: true,
            },
        };
        it('will insert a single item to the beginning', function () {
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
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    updateQueries: {
                        todoList: function (prev, options) {
                            var mResult = options.mutationResult;
                            assert.equal(mResult.data.createTodo.id, '99');
                            var state = cloneDeep(prev);
                            state.todoList.todos.unshift(mResult.data.createTodo);
                            return state;
                        },
                    },
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                return promise;
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
        it('two array insert like mutations', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            }, {
                request: { query: mutation },
                result: mutationResult2,
                delay: 50,
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
                var updateQueries = {
                    todoList: function (prev, options) {
                        var mResult = options.mutationResult;
                        var state = cloneDeep(prev);
                        if (mResult.data) {
                            state.todoList.todos.unshift(mResult.data.createTodo);
                        }
                        return state;
                    },
                };
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    updateQueries: updateQueries,
                }).then(function (res) {
                    var currentDataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(currentDataInStore['TodoList5'].todos.length, 5);
                    assert.equal(currentDataInStore['Todo99'].text, 'This one was created with a mutation.');
                    assert.equal(currentDataInStore['Todo66'].text, 'Optimistically generated 2');
                    return res;
                });
                var promise2 = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse2,
                    updateQueries: updateQueries,
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 5);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                return Promise.all([promise, promise2]);
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 5);
                assert.equal(newResult.data.todoList.todos[0].text, 'Second mutation.');
                assert.equal(newResult.data.todoList.todos[1].text, 'This one was created with a mutation.');
            });
        });
        it('two mutations, one fails', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                error: new Error('forbidden (test error)'),
                delay: 20,
            }, {
                request: { query: mutation },
                result: mutationResult2,
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
                var updateQueries = {
                    todoList: function (prev, options) {
                        var mResult = options.mutationResult;
                        var state = cloneDeep(prev);
                        if (mResult.data) {
                            state.todoList.todos.unshift(mResult.data.createTodo);
                        }
                        return state;
                    },
                };
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    updateQueries: updateQueries,
                }).catch(function (err) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Network error: forbidden (test error)');
                    return null;
                });
                var promise2 = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse2,
                    updateQueries: updateQueries,
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 5);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                return Promise.all([promise, promise2]);
            })
                .then(function () {
                subscriptionHandle.unsubscribe();
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.notProperty(dataInStore, 'Todo99');
                assert.property(dataInStore, 'Todo66');
                assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                assert.notDeepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
            });
        });
        it('will handle dependent updates', function (done) {
            networkInterface = mockNetworkInterface({
                request: { query: query },
                result: result,
            }, {
                request: { query: mutation },
                result: mutationResult,
                delay: 10,
            }, {
                request: { query: mutation },
                result: mutationResult2,
                delay: 20,
            });
            var customOptimisticResponse1 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-99',
                    text: 'Optimistically generated',
                    completed: true,
                },
            };
            var customOptimisticResponse2 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-66',
                    text: 'Optimistically generated 2',
                    completed: true,
                },
            };
            var updateQueries = {
                todoList: function (prev, options) {
                    var mResult = options.mutationResult;
                    var state = cloneDeep(prev);
                    if (mResult.data) {
                        state.todoList.todos.unshift(mResult.data.createTodo);
                    }
                    return state;
                },
            };
            client = new ApolloClient({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) {
                    if (obj.id && obj.__typename) {
                        return obj.__typename + obj.id;
                    }
                    return null;
                },
            });
            var defaultTodos = result.data.todoList.todos;
            var count = 0;
            client.watchQuery({ query: query }).subscribe({
                next: function (value) {
                    var todos = value.data.todoList.todos;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(defaultTodos, todos);
                            twoMutations();
                            break;
                        case 1:
                            assert.deepEqual([customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 2:
                            assert.deepEqual([customOptimisticResponse2.createTodo, customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 3:
                            assert.deepEqual([customOptimisticResponse2.createTodo, mutationResult.data.createTodo].concat(defaultTodos), todos);
                            break;
                        case 4:
                            assert.deepEqual([mutationResult2.data.createTodo, mutationResult.data.createTodo].concat(defaultTodos), todos);
                            done();
                            break;
                        default:
                            done(new Error('Next should not have been called again.'));
                    }
                },
                error: function (error) { return done(error); },
            });
            function twoMutations() {
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse1,
                    updateQueries: updateQueries,
                })
                    .catch(function (error) { return done(error); });
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse2,
                    updateQueries: updateQueries,
                })
                    .catch(function (error) { return done(error); });
            }
        });
        var _a;
    });
    describe('optimistic updates using `update`', function () {
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
        var optimisticResponse = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '99',
                text: 'Optimistically generated',
                completed: true,
            },
        };
        var mutationResult2 = {
            data: assign({}, mutationResult.data, {
                createTodo: assign({}, mutationResult.data.createTodo, {
                    id: '66',
                    text: 'Second mutation.',
                }),
            }),
        };
        var optimisticResponse2 = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '66',
                text: 'Optimistically generated 2',
                completed: true,
            },
        };
        it('will insert a single item to the beginning', function () {
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
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    update: function (proxy, mResult) {
                        assert.equal(mResult.data.createTodo.id, '99');
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
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                return promise;
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
        it('two array insert like mutations', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                result: mutationResult,
            }, {
                request: { query: mutation },
                result: mutationResult2,
                delay: 50,
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
                var update = function (proxy, mResult) {
                    var data = proxy.readFragment({
                        id: 'TodoList5',
                        fragment: (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a)),
                    });
                    proxy.writeFragment({
                        data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                        id: 'TodoList5',
                        fragment: (_b = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _b.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_b)),
                    });
                    var _a, _b;
                };
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    update: update,
                }).then(function (res) {
                    var currentDataInStore = client.queryManager.getDataWithOptimisticResults();
                    assert.equal(currentDataInStore['TodoList5'].todos.length, 5);
                    assert.equal(currentDataInStore['Todo99'].text, 'This one was created with a mutation.');
                    assert.equal(currentDataInStore['Todo66'].text, 'Optimistically generated 2');
                    return res;
                });
                var promise2 = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse2,
                    update: update,
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 5);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                return Promise.all([promise, promise2]);
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                subscriptionHandle.unsubscribe();
                assert.equal(newResult.data.todoList.todos.length, 5);
                assert.equal(newResult.data.todoList.todos[0].text, 'Second mutation.');
                assert.equal(newResult.data.todoList.todos[1].text, 'This one was created with a mutation.');
            });
        });
        it('two mutations, one fails', function () {
            var subscriptionHandle;
            return setup({
                request: { query: mutation },
                error: new Error('forbidden (test error)'),
                delay: 20,
            }, {
                request: { query: mutation },
                result: mutationResult2,
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
                var update = function (proxy, mResult) {
                    var data = proxy.readFragment({
                        id: 'TodoList5',
                        fragment: (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a)),
                    });
                    proxy.writeFragment({
                        data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                        id: 'TodoList5',
                        fragment: (_b = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _b.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_b)),
                    });
                    var _a, _b;
                };
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                    update: update,
                }).catch(function (err) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Network error: forbidden (test error)');
                    return null;
                });
                var promise2 = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse2,
                    update: update,
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 5);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                assert.equal(dataInStore['Todo66'].text, 'Optimistically generated 2');
                return Promise.all([promise, promise2]);
            })
                .then(function () {
                subscriptionHandle.unsubscribe();
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.notProperty(dataInStore, 'Todo99');
                assert.property(dataInStore, 'Todo66');
                assert.deepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo66'));
                assert.notDeepInclude(dataInStore['TodoList5'].todos, realIdValue('Todo99'));
            });
        });
        it('will handle dependent updates', function (done) {
            networkInterface = mockNetworkInterface({
                request: { query: query },
                result: result,
            }, {
                request: { query: mutation },
                result: mutationResult,
                delay: 10,
            }, {
                request: { query: mutation },
                result: mutationResult2,
                delay: 20,
            });
            var customOptimisticResponse1 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-99',
                    text: 'Optimistically generated',
                    completed: true,
                },
            };
            var customOptimisticResponse2 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-66',
                    text: 'Optimistically generated 2',
                    completed: true,
                },
            };
            var update = function (proxy, mResult) {
                var data = proxy.readFragment({
                    id: 'TodoList5',
                    fragment: (_a = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _a.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_a)),
                });
                proxy.writeFragment({
                    data: __assign({}, data, { todos: [mResult.data.createTodo].concat(data.todos) }),
                    id: 'TodoList5',
                    fragment: (_b = ["fragment todoList on TodoList { todos { id text completed __typename } }"], _b.raw = ["fragment todoList on TodoList { todos { id text completed __typename } }"], gql(_b)),
                });
                var _a, _b;
            };
            client = new ApolloClient({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) {
                    if (obj.id && obj.__typename) {
                        return obj.__typename + obj.id;
                    }
                    return null;
                },
            });
            var defaultTodos = result.data.todoList.todos;
            var count = 0;
            client.watchQuery({ query: query }).subscribe({
                next: function (value) {
                    var todos = value.data.todoList.todos;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(defaultTodos, todos);
                            twoMutations();
                            break;
                        case 1:
                            assert.deepEqual([customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 2:
                            assert.deepEqual([customOptimisticResponse2.createTodo, customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 3:
                            assert.deepEqual([customOptimisticResponse2.createTodo, mutationResult.data.createTodo].concat(defaultTodos), todos);
                            break;
                        case 4:
                            assert.deepEqual([mutationResult2.data.createTodo, mutationResult.data.createTodo].concat(defaultTodos), todos);
                            done();
                            break;
                        default:
                            done(new Error('Next should not have been called again.'));
                    }
                },
                error: function (error) { return done(error); },
            });
            function twoMutations() {
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse1,
                    update: update,
                })
                    .catch(function (error) { return done(error); });
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse2,
                    update: update,
                })
                    .catch(function (error) { return done(error); });
            }
        });
        var _a;
    });
    describe('optimistic updates with result reducer', function () {
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
        var optimisticResponse = {
            __typename: 'Mutation',
            createTodo: {
                __typename: 'Todo',
                id: '99',
                text: 'Optimistically generated',
                completed: true,
            },
        };
        it('can add an item to an array', function () {
            var observableQuery;
            var counter = 0;
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
            })
                .then(function () {
                var promise = client.mutate({
                    mutation: mutation,
                    optimisticResponse: optimisticResponse,
                });
                var dataInStore = client.queryManager.getDataWithOptimisticResults();
                assert.equal(dataInStore['TodoList5'].todos.length, 4);
                assert.equal(dataInStore['Todo99'].text, 'Optimistically generated');
                return promise;
            })
                .then(function () {
                return client.query({ query: query });
            })
                .then(function (newResult) {
                assert.equal(newResult.data.todoList.todos.length, 4);
                assert.equal(newResult.data.todoList.todos[0].text, 'This one was created with a mutation.');
            });
        });
        it('will handle dependent updates', function (done) {
            var customMutationResult1 = {
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
            var customMutationResult2 = {
                data: {
                    __typename: 'Mutation',
                    createTodo: {
                        id: '66',
                        __typename: 'Todo',
                        text: 'Second mutation.',
                        completed: true,
                    },
                },
            };
            var customOptimisticResponse1 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-99',
                    text: 'Optimistically generated',
                    completed: true,
                },
            };
            var customOptimisticResponse2 = {
                __typename: 'Mutation',
                createTodo: {
                    __typename: 'Todo',
                    id: 'optimistic-66',
                    text: 'Optimistically generated 2',
                    completed: true,
                },
            };
            networkInterface = mockNetworkInterface({
                request: { query: query },
                result: result,
            }, {
                request: { query: mutation },
                result: customMutationResult1,
                delay: 10,
            }, {
                request: { query: mutation },
                result: customMutationResult2,
                delay: 20,
            });
            client = new ApolloClient({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) {
                    if (obj.id && obj.__typename) {
                        return obj.__typename + obj.id;
                    }
                    return null;
                },
            });
            var defaultTodos = result.data.todoList.todos;
            var count = 0;
            client.watchQuery({
                query: query,
                reducer: function (previousResult, action) {
                    if (isMutationResultAction(action)) {
                        var newResult = cloneDeep(previousResult);
                        newResult.todoList.todos.unshift(action.result.data['createTodo']);
                        return newResult;
                    }
                    return previousResult;
                },
            }).subscribe({
                next: function (value) {
                    var todos = value.data.todoList.todos;
                    switch (count++) {
                        case 0:
                            assert.deepEqual(defaultTodos, todos);
                            twoMutations();
                            break;
                        case 1:
                            assert.deepEqual([customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 2:
                            assert.deepEqual([customOptimisticResponse2.createTodo, customOptimisticResponse1.createTodo].concat(defaultTodos), todos);
                            break;
                        case 3:
                            assert.deepEqual([customOptimisticResponse2.createTodo, customMutationResult1.data.createTodo].concat(defaultTodos), todos);
                            break;
                        case 4:
                            assert.deepEqual([customMutationResult2.data.createTodo, customMutationResult1.data.createTodo].concat(defaultTodos), todos);
                            done();
                            break;
                        default:
                            done(new Error('Next should not have been called again.'));
                    }
                },
                error: function (error) { return done(error); },
            });
            function twoMutations() {
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse1,
                })
                    .catch(function (error) { return done(error); });
                client.mutate({
                    mutation: mutation,
                    optimisticResponse: customOptimisticResponse2,
                })
                    .catch(function (error) { return done(error); });
            }
        });
        var _a;
    });
    var _a;
});
describe('optimistic mutation - githunt comments', function () {
    var query = (_a = ["\n    query Comment($repoName: String!) {\n      entry(repoFullName: $repoName) {\n        comments {\n          postedBy {\n            login\n            html_url\n          }\n        }\n      }\n    }\n  "], _a.raw = ["\n    query Comment($repoName: String!) {\n      entry(repoFullName: $repoName) {\n        comments {\n          postedBy {\n            login\n            html_url\n          }\n        }\n      }\n    }\n  "], gql(_a));
    var queryWithFragment = (_b = ["\n    query Comment($repoName: String!) {\n      entry(repoFullName: $repoName) {\n        comments {\n          ...authorFields\n        }\n      }\n    }\n\n    fragment authorFields on User {\n      postedBy {\n        login\n        html_url\n      }\n    }\n  "], _b.raw = ["\n    query Comment($repoName: String!) {\n      entry(repoFullName: $repoName) {\n        comments {\n          ...authorFields\n        }\n      }\n    }\n\n    fragment authorFields on User {\n      postedBy {\n        login\n        html_url\n      }\n    }\n  "], gql(_b));
    var variables = {
        repoName: 'org/repo',
    };
    var userDoc = {
        __typename: 'User',
        login: 'stubailo',
        html_url: 'http://avatar.com/stubailo.png',
    };
    var result = {
        data: {
            __typename: 'Query',
            entry: {
                __typename: 'Entry',
                comments: [
                    {
                        __typename: 'Comment',
                        postedBy: userDoc,
                    },
                ],
            },
        },
    };
    var client;
    var networkInterface;
    function setup() {
        var mockedResponses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            mockedResponses[_i] = arguments[_i];
        }
        networkInterface = mockNetworkInterface.apply(void 0, [{
                request: {
                    query: addTypenameToDocument(query),
                    variables: variables,
                },
                result: result,
            }, {
                request: {
                    query: addTypenameToDocument(queryWithFragment),
                    variables: variables,
                },
                result: result,
            }].concat(mockedResponses));
        client = new ApolloClient({
            networkInterface: networkInterface,
            dataIdFromObject: function (obj) {
                if (obj.id && obj.__typename) {
                    return obj.__typename + obj.id;
                }
                return null;
            },
        });
        var obsHandle = client.watchQuery({
            query: query,
            variables: variables,
        });
        return obsHandle.result();
    }
    var mutation = (_c = ["\n    mutation submitComment($repoFullName: String!, $commentContent: String!) {\n      submitComment(repoFullName: $repoFullName, commentContent: $commentContent) {\n        postedBy {\n          login\n          html_url\n        }\n      }\n    }\n  "], _c.raw = ["\n    mutation submitComment($repoFullName: String!, $commentContent: String!) {\n      submitComment(repoFullName: $repoFullName, commentContent: $commentContent) {\n        postedBy {\n          login\n          html_url\n        }\n      }\n    }\n  "], gql(_c));
    var mutationWithFragment = (_d = ["\n    mutation submitComment($repoFullName: String!, $commentContent: String!) {\n      submitComment(repoFullName: $repoFullName, commentContent: $commentContent) {\n        ...authorFields\n      }\n    }\n  "], _d.raw = ["\n    mutation submitComment($repoFullName: String!, $commentContent: String!) {\n      submitComment(repoFullName: $repoFullName, commentContent: $commentContent) {\n        ...authorFields\n      }\n    }\n  "], gql(_d));
    var mutationResult = {
        data: {
            __typename: 'Mutation',
            submitComment: {
                __typename: 'Comment',
                postedBy: userDoc,
            },
        },
    };
    var updateQueries = {
        Comment: function (prev, _a) {
            var mutationResultArg = _a.mutationResult;
            if (mutationResultArg.data) {
                var newComment = mutationResultArg.data.submitComment;
                var state = cloneDeep(prev);
                state.entry.comments.unshift(newComment);
                return state;
            }
            return prev;
        },
    };
    var optimisticResponse = {
        __typename: 'Mutation',
        submitComment: {
            __typename: 'Comment',
            postedBy: userDoc,
        },
    };
    it('can post a new comment', function () {
        var mutationVariables = {
            repoFullName: 'org/repo',
            commentContent: 'New Comment',
        };
        var subscriptionHandle;
        return setup({
            request: {
                query: addTypenameToDocument(mutation),
                variables: mutationVariables,
            },
            result: mutationResult,
        })
            .then(function () {
            return new Promise(function (resolve, reject) {
                var handle = client.watchQuery({ query: query, variables: variables });
                subscriptionHandle = handle.subscribe({
                    next: function (res) { resolve(res); },
                });
            });
        })
            .then(function () {
            return client.mutate({
                mutation: mutation,
                optimisticResponse: optimisticResponse,
                variables: mutationVariables,
                updateQueries: updateQueries,
            });
        }).then(function () {
            return client.query({ query: query, variables: variables });
        }).then(function (newResult) {
            subscriptionHandle.unsubscribe();
            assert.equal(newResult.data.entry.comments.length, 2);
        });
    });
    var _a, _b, _c, _d;
});
function realIdValue(id) {
    return {
        type: 'id',
        generated: false,
        id: id,
    };
}
//# sourceMappingURL=optimistic.js.map