import { assert } from 'chai';
import { merge } from 'lodash';
import * as sinon from 'sinon';
import { HTTPBatchedNetworkInterface } from '../src/transport/batchedNetworkInterface';
import { createMockFetch, createMockedIResponse, } from './mocks/mockFetch';
import { printRequest, } from '../src/transport/networkInterface';
import gql from 'graphql-tag';
import 'whatwg-fetch';
describe('HTTPBatchedNetworkInterface', function () {
    var assertRoundtrip = function (_a) {
        var requestResultPairs = _a.requestResultPairs, fetchFunc = _a.fetchFunc, _b = _a.middlewares, middlewares = _b === void 0 ? [] : _b, _c = _a.afterwares, afterwares = _c === void 0 ? [] : _c, _d = _a.opts, opts = _d === void 0 ? {} : _d;
        var url = 'http://fake.com/graphql';
        var batchedNetworkInterface = new HTTPBatchedNetworkInterface({
            uri: url,
            batchInterval: 10,
            fetchOpts: opts,
        });
        batchedNetworkInterface.use(middlewares);
        batchedNetworkInterface.useAfter(afterwares);
        var printedRequests = [];
        var resultList = [];
        requestResultPairs.forEach(function (_a) {
            var request = _a.request, result = _a.result;
            printedRequests.push(printRequest(request));
            resultList.push(result);
        });
        fetch = fetchFunc || createMockFetch({
            url: url,
            opts: merge({
                body: JSON.stringify(printedRequests),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            }, opts),
            result: createMockedIResponse(resultList),
        });
        return batchedNetworkInterface.batchQuery(requestResultPairs.map(function (_a) {
            var request = _a.request;
            return request;
        }))
            .then(function (results) {
            assert.deepEqual(results, resultList);
        });
    };
    var authorQuery = (_a = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], _a.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], gql(_a));
    var authorResult = {
        data: {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        },
    };
    var personQuery = (_b = ["\n    query {\n      person {\n        name\n      }\n    }"], _b.raw = ["\n    query {\n      person {\n        name\n      }\n    }"], gql(_b));
    var personResult = {
        data: {
            person: {
                name: 'John Smith',
            },
        },
    };
    it('should construct itself correctly', function () {
        var url = 'http://notreal.com/graphql';
        var opts = {};
        var batchedNetworkInterface = new HTTPBatchedNetworkInterface({
            uri: url,
            batchInterval: 10,
            fetchOpts: opts,
        });
        assert(batchedNetworkInterface);
        assert.equal(batchedNetworkInterface._uri, url);
        assert.deepEqual(batchedNetworkInterface._opts, opts);
        assert(batchedNetworkInterface.batchQuery);
    });
    it('should have a default value of 10ms for batchInterval', function () {
        var url = 'http://notreal.com/graphql';
        var opts = {};
        var batchedNetworkInterface = new HTTPBatchedNetworkInterface({
            uri: url,
            fetchOpts: opts,
        });
        var queryBatcher = batchedNetworkInterface['batcher'];
        assert.equal(queryBatcher['batchInterval'], 10);
    });
    it('should correctly return the result for a single request', function () {
        return assertRoundtrip({
            requestResultPairs: [{
                    request: { query: authorQuery },
                    result: authorResult,
                }],
        });
    });
    it('should correctly return the results for multiple requests', function () {
        return assertRoundtrip({
            requestResultPairs: [
                {
                    request: { query: authorQuery },
                    result: authorResult,
                },
                {
                    request: { query: personQuery },
                    result: personResult,
                },
            ],
        });
    });
    it('should correctly execute middleware once per batch request', function () {
        var middlewareCallCounter = sinon.stub();
        return assertRoundtrip({
            requestResultPairs: [
                {
                    request: { query: authorQuery },
                    result: authorResult,
                },
                {
                    request: { query: personQuery },
                    result: personResult,
                },
            ],
            middlewares: [{
                    applyBatchMiddleware: function (req, next) {
                        middlewareCallCounter();
                        next();
                    },
                }],
        })
            .then(function () {
            assert.equal(middlewareCallCounter.callCount, 1);
        });
    });
    it('should correctly execute afterware once per batch request', function () {
        var afterwareCallCounter = sinon.stub();
        return assertRoundtrip({
            requestResultPairs: [
                {
                    request: { query: authorQuery },
                    result: authorResult,
                },
                {
                    request: { query: personQuery },
                    result: personResult,
                },
            ],
            afterwares: [{
                    applyBatchAfterware: function (_a, next) {
                        var responses = _a.responses;
                        afterwareCallCounter();
                        next();
                    },
                }],
        })
            .then(function () {
            assert.equal(afterwareCallCounter.callCount, 1);
        });
    });
    describe('errors', function () {
        it('should return errors thrown by fetch', function (done) {
            var err = new Error('Error of some kind thrown by fetch.');
            var fetchFunc = function () { throw err; };
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                fetchFunc: fetchFunc,
            }).then(function () {
                done(new Error('Assertion passed when it should not have.'));
            }).catch(function (error) {
                assert(error);
                assert.deepEqual(error, err);
                done();
            });
        });
        it('should throw an error with the response when a non-200 response is received', function (done) {
            var fakeForbiddenResponse = createMockedIResponse([], { status: 401, statusText: 'Unauthorized' });
            var fetchFunc = function () { return Promise.resolve(fakeForbiddenResponse); };
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                fetchFunc: fetchFunc,
            }).then(function () {
                done(new Error('An error should have been thrown'));
            }).catch(function (err) {
                assert.strictEqual(err.response, fakeForbiddenResponse, 'Incorrect response provided');
                assert.equal(err.message, 'Network request failed with status 401 - "Unauthorized"', 'Incorrect message generated');
                done();
            });
        });
        it('should return errors thrown by middleware', function (done) {
            var err = new Error('Error of some kind thrown by middleware.');
            var errorMiddleware = {
                applyBatchMiddleware: function () {
                    throw err;
                },
            };
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                middlewares: [errorMiddleware],
            }).then(function () {
                done(new Error('Returned a result when it should not have.'));
            }).catch(function (error) {
                assert.deepEqual(error, err);
                done();
            });
        });
        it('should return errors thrown by afterware', function (done) {
            var err = new Error('Error of some kind thrown by afterware.');
            var errorAfterware = {
                applyBatchAfterware: function () {
                    throw err;
                },
            };
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                afterwares: [errorAfterware],
            }).then(function () {
                done(new Error('Returned a result when it should not have.'));
            }).catch(function (error) {
                assert.deepEqual(error, err);
                done();
            });
        });
    });
    it('middleware should be able to modify requests/options', function () {
        var changeMiddleware = {
            applyBatchMiddleware: function (_a, next) {
                var opts = _a.options;
                opts.headers['Content-Length'] = '18';
                next();
            },
        };
        var customHeaders = {
            'Content-Length': '18',
        };
        var options = { headers: customHeaders };
        return assertRoundtrip({
            requestResultPairs: [{
                    request: { query: authorQuery },
                    result: authorResult,
                }],
            opts: options,
            middlewares: [changeMiddleware],
        });
    });
    it('opts should be able to modify request headers and method (#920)', function () {
        var customHeaders = {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'x-www-form-urlencoded',
        };
        var options = { method: 'GET', headers: customHeaders };
        return assertRoundtrip({
            requestResultPairs: [{
                    request: { query: authorQuery },
                    result: authorResult,
                }],
            opts: options,
        });
    });
    describe('afterware execution', function () {
        var afterwareStub = sinon.stub();
        var testAfterwares = [
            {
                applyBatchAfterware: function (response, next) {
                    afterwareStub();
                    next();
                },
            },
            {
                applyBatchAfterware: function (response, next) {
                    afterwareStub();
                    next();
                },
            },
        ];
        afterEach(function () { return afterwareStub.reset(); });
        it('executes afterware when valid responses given back', function (done) {
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                afterwares: testAfterwares,
            }).then(function () {
                assert.equal(afterwareStub.callCount, testAfterwares.length, 'Afterwares provided were not invoked');
                done();
            }).catch(function (err) {
                done(err);
            });
        });
        it('executes afterware when an invalid response is given back', function (done) {
            var fakeForbiddenResponse = createMockedIResponse([], { status: 401, statusText: 'Unauthorized' });
            var fetchFunc = function () { return Promise.resolve(fakeForbiddenResponse); };
            assertRoundtrip({
                requestResultPairs: [{
                        request: { query: authorQuery },
                        result: authorResult,
                    }],
                fetchFunc: fetchFunc,
                afterwares: testAfterwares,
            }).then(function () {
                done(new Error('The networkInterface did not reject as expected'));
            }).catch(function (err) {
                assert.equal(afterwareStub.callCount, testAfterwares.length, 'Afterwares provided were not invoked');
                done();
            });
        });
    });
    var _a, _b;
});
//# sourceMappingURL=batchedNetworkInterface.js.map