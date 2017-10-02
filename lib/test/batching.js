import { QueryBatcher, } from '../src/transport/batching';
import { assert } from 'chai';
import { mockBatchedNetworkInterface, } from './mocks/mockNetworkInterface';
import gql from 'graphql-tag';
var networkInterface = mockBatchedNetworkInterface();
describe('QueryBatcher', function () {
    it('should construct', function () {
        assert.doesNotThrow(function () {
            var querySched = new QueryBatcher({
                batchInterval: 10,
                batchFetchFunction: networkInterface.batchQuery.bind(networkInterface),
            });
            querySched.consumeQueue();
        });
    });
    it('should not do anything when faced with an empty queue', function () {
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: networkInterface.batchQuery.bind(networkInterface),
        });
        assert.equal(batcher.queuedRequests.length, 0);
        batcher.consumeQueue();
        assert.equal(batcher.queuedRequests.length, 0);
    });
    it('should be able to add to the queue', function () {
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: networkInterface.batchQuery.bind(networkInterface),
        });
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var request = {
            request: { query: query },
        };
        assert.equal(batcher.queuedRequests.length, 0);
        batcher.enqueueRequest(request);
        assert.equal(batcher.queuedRequests.length, 1);
        batcher.enqueueRequest(request);
        assert.equal(batcher.queuedRequests.length, 2);
        var _a;
    });
    describe('request queue', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var myNetworkInterface = mockBatchedNetworkInterface({
            request: { query: query },
            result: { data: data },
        }, {
            request: { query: query },
            result: { data: data },
        });
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: myNetworkInterface.batchQuery.bind(myNetworkInterface),
        });
        var request = {
            query: query,
        };
        it('should be able to consume from a queue containing a single query', function (done) {
            var myBatcher = new QueryBatcher({
                batchInterval: 10,
                batchFetchFunction: myNetworkInterface.batchQuery.bind(myNetworkInterface),
            });
            myBatcher.enqueueRequest(request);
            var promises = myBatcher.consumeQueue();
            assert.equal(promises.length, 1);
            promises[0].then(function (resultObj) {
                assert.equal(myBatcher.queuedRequests.length, 0);
                assert.deepEqual(resultObj, { data: data });
                done();
            });
        });
        it('should be able to consume from a queue containing multiple queries', function (done) {
            var request2 = {
                query: query,
            };
            var NI = mockBatchedNetworkInterface({
                request: { query: query },
                result: { data: data },
            }, {
                request: { query: query },
                result: { data: data },
            });
            var myBatcher = new QueryBatcher({
                batchInterval: 10,
                batchFetchFunction: NI.batchQuery.bind(NI),
            });
            myBatcher.enqueueRequest(request);
            myBatcher.enqueueRequest(request2);
            var promises = myBatcher.consumeQueue();
            assert.equal(batcher.queuedRequests.length, 0);
            assert.equal(promises.length, 2);
            promises[0].then(function (resultObj1) {
                assert.deepEqual(resultObj1, { data: data });
                promises[1].then(function (resultObj2) {
                    assert.deepEqual(resultObj2, { data: data });
                    done();
                });
            });
        });
        it('should return a promise when we enqueue a request and resolve it with a result', function (done) {
            var NI = mockBatchedNetworkInterface({
                request: { query: query },
                result: { data: data },
            });
            var myBatcher = new QueryBatcher({
                batchInterval: 10,
                batchFetchFunction: NI.batchQuery.bind(NI),
            });
            var promise = myBatcher.enqueueRequest(request);
            myBatcher.consumeQueue();
            promise.then(function (result) {
                assert.deepEqual(result, { data: data });
                done();
            });
        });
        var _a;
    });
    it('should work when single query', function (done) {
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: networkInterface.batchQuery.bind(networkInterface),
        });
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var request = { query: query };
        batcher.enqueueRequest(request);
        assert.equal(batcher.queuedRequests.length, 1);
        setTimeout(function () {
            assert.equal(batcher.queuedRequests.length, 0);
            done();
        }, 20);
        var _a;
    });
    it('should correctly batch multiple queries', function (done) {
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: networkInterface.batchQuery.bind(networkInterface),
        });
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var request = { query: query };
        batcher.enqueueRequest(request);
        batcher.enqueueRequest(request);
        assert.equal(batcher.queuedRequests.length, 2);
        setTimeout(function () {
            batcher.enqueueRequest(request);
            assert.equal(batcher.queuedRequests.length, 3);
        }, 5);
        setTimeout(function () {
            assert.equal(batcher.queuedRequests.length, 0);
            done();
        }, 20);
        var _a;
    });
    it('should reject the promise if there is a network error', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var request = {
            query: query,
        };
        var error = new Error('Network error');
        var myNetworkInterface = mockBatchedNetworkInterface({
            request: { query: query },
            error: error,
        });
        var batcher = new QueryBatcher({
            batchInterval: 10,
            batchFetchFunction: myNetworkInterface.batchQuery.bind(myNetworkInterface),
        });
        var promise = batcher.enqueueRequest(request);
        batcher.consumeQueue();
        promise.catch(function (resError) {
            assert.equal(resError.message, 'Network error');
            done();
        });
        var _a;
    });
});
//# sourceMappingURL=batching.js.map