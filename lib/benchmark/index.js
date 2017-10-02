import gql from 'graphql-tag';
import { group, benchmark, afterEach, runBenchmarks, dataIdFromObject, } from './util';
import { ApolloClient, } from '../src/index';
import { diffQueryAgainstStore, } from '../src/data/readFromStore';
import mockNetworkInterface from '../test/mocks/mockNetworkInterface';
import { times, cloneDeep, } from 'lodash';
var simpleQuery = (_a = ["\n  query {\n    author {\n      firstName\n      lastName\n    }\n}"], _a.raw = ["\n  query {\n    author {\n      firstName\n      lastName\n    }\n}"], gql(_a));
var simpleResult = {
    data: {
        author: {
            firstName: 'John',
            lastName: 'Smith',
        },
    },
};
var simpleReqResp = {
    request: { query: simpleQuery },
    result: simpleResult,
};
var getClientInstance = function () {
    return new ApolloClient({
        networkInterface: mockNetworkInterface({
            request: { query: simpleQuery },
            result: simpleResult,
        }),
        addTypename: false,
    });
};
var createReservations = function (count) {
    var reservations = [];
    times(count, function (reservationIndex) {
        reservations.push({
            name: 'Fake Reservation',
            id: reservationIndex.toString(),
        });
    });
    return reservations;
};
group(function (end) {
    benchmark('constructing an instance', function (done) {
        var c = new ApolloClient({});
        done();
    });
    end();
});
group(function (end) {
    benchmark('fetching a query result from mocked server', function (done) {
        var client = getClientInstance();
        client.query({ query: simpleQuery }).then(function (result) {
            done();
        });
    });
    end();
});
group(function (end) {
    benchmark('write data and receive update from the cache', function (done) {
        var client = getClientInstance();
        var observable = client.watchQuery({
            query: simpleQuery,
            fetchPolicy: 'cache-only',
        });
        observable.subscribe({
            next: function (res) {
                if (Object.keys(res.data).length > 0) {
                    done();
                }
            },
            error: function (err) {
                console.warn('Error occurred in observable.');
            },
        });
        client.query({ query: simpleQuery });
    });
    end();
});
group(function (end) {
    var meanTimes = {};
    times(50, function (countR) {
        var count = countR * 5;
        benchmark({
            name: "write data and deliver update to " + count + " subscribers",
            count: count,
        }, function (done) {
            var promises = [];
            var client = getClientInstance();
            times(count, function () {
                promises.push(new Promise(function (resolve, reject) {
                    client.watchQuery({
                        query: simpleQuery,
                        fetchPolicy: 'cache-only',
                    }).subscribe({
                        next: function (res) {
                            if (Object.keys(res.data).length > 0) {
                                resolve();
                            }
                        },
                    });
                }));
            });
            client.query({ query: simpleQuery });
            Promise.all(promises).then(function () {
                done();
            });
        });
        afterEach(function (description, event) {
            var iterCount = description['count'];
            meanTimes[iterCount.toString()] = event.target.stats.mean * 1000;
        });
    });
    end();
});
times(25, function (countR) {
    var count = (countR + 1) * 10;
    var query = (_a = ["\n    query($id: String) {\n      author(id: $id) {\n        name\n        id\n        __typename\n      }\n    }"], _a.raw = ["\n    query($id: String) {\n      author(id: $id) {\n        name\n        id\n        __typename\n      }\n    }"], gql(_a));
    var originalVariables = { id: 1 };
    var originalResult = {
        data: {
            author: {
                name: 'John Smith',
                id: 1,
                __typename: 'Author',
            },
        },
    };
    group(function (end) {
        var mockedResponses = [];
        times(count, function (index) {
            var result = cloneDeep(originalResult);
            result.data.author.id = index;
            var variables = cloneDeep(originalVariables);
            variables.id = index;
            mockedResponses.push({
                request: { query: query, variables: variables },
                result: result,
            });
        });
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface.apply(void 0, mockedResponses),
            addTypename: false,
            dataIdFromObject: dataIdFromObject,
        });
        var promises = times(count, function (index) {
            return client.query({
                query: query,
                variables: { id: index },
            }).then(function (result) {
                return Promise.resolve({});
            });
        });
        var myBenchmark = benchmark;
        var myAfterEach = afterEach;
        Promise.all(promises).then(function () {
            myBenchmark({
                name: "read single item from cache with " + count + " items in cache",
                count: count,
            }, function (done) {
                var randomIndex = Math.floor(Math.random() * count);
                client.query({
                    query: query,
                    variables: { id: randomIndex },
                }).then(function (result) {
                    done();
                });
            });
            end();
        });
    });
    var _a;
});
times(50, function (index) {
    group(function (end) {
        var query = (_a = ["\n      query($id: String) {\n        house(id: $id) {\n          reservations {\n            name\n            id\n          }\n        }\n      }"], _a.raw = ["\n      query($id: String) {\n        house(id: $id) {\n          reservations {\n            name\n            id\n          }\n        }\n      }"], gql(_a));
        var houseId = '12';
        var reservationCount = index + 1;
        var reservations = createReservations(reservationCount);
        var variables = { id: houseId };
        var result = {
            data: {
                house: {
                    reservations: reservations,
                },
            },
        };
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface({
                request: { query: query, variables: variables },
                result: result,
            }),
            addTypename: false,
            dataIdFromObject: dataIdFromObject,
        });
        var myBenchmark = benchmark;
        client.query({
            query: query,
            variables: variables,
        }).then(function () {
            myBenchmark("read result with " + reservationCount + " items associated with the result", function (done) {
                client.query({
                    query: query,
                    variables: variables,
                    fetchPolicy: 'cache-only',
                }).then(function () {
                    done();
                });
            });
            end();
        });
        var _a;
    });
});
times(50, function (index) {
    group(function (end) {
        var reservationCount = index + 1;
        var query = (_a = ["\n      query($id: String) {\n        house(id: $id) {\n          reservations {\n            name\n            id\n          }\n        }\n      }"], _a.raw = ["\n      query($id: String) {\n        house(id: $id) {\n          reservations {\n            name\n            id\n          }\n        }\n      }"], gql(_a));
        var variables = { id: '7' };
        var reservations = createReservations(reservationCount);
        var result = {
            data: {
                house: { reservations: reservations },
            },
        };
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface({
                request: { query: query, variables: variables },
                result: result,
            }),
            addTypename: false,
            dataIdFromObject: dataIdFromObject,
        });
        var myBenchmark = benchmark;
        var results = [];
        client.query({
            query: query,
            variables: variables,
        }).then(function () {
            myBenchmark("diff query against store with " + reservationCount + " items", function (done) {
                results.push(diffQueryAgainstStore({
                    query: query,
                    variables: variables,
                    store: client.store.getState()['apollo'].data,
                }));
                done();
            });
            end();
        });
        var _a;
    });
});
runBenchmarks();
var _a;
//# sourceMappingURL=index.js.map