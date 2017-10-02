import mockNetworkInterface from './mocks/mockNetworkInterface';
import gql from 'graphql-tag';
import { assert } from 'chai';
import ApolloClient, { toIdValue } from '../src';
import { NetworkStatus } from '../src/queries/networkStatus';
describe('custom resolvers', function () {
    it("works for cache redirection", function () {
        var dataIdFromObject = function (obj) {
            return obj.id;
        };
        var listQuery = (_a = ["{ people { id name } }"], _a.raw = ["{ people { id name } }"], gql(_a));
        var listData = {
            people: [
                {
                    id: '4',
                    name: 'Luke Skywalker',
                    __typename: 'Person',
                },
            ],
        };
        var netListQuery = (_b = ["{ people { id name __typename } }"], _b.raw = ["{ people { id name __typename } }"], gql(_b));
        var itemQuery = (_c = ["{ person(id: 4) { id name } }"], _c.raw = ["{ person(id: 4) { id name } }"], gql(_c));
        var networkInterface = mockNetworkInterface({
            request: { query: netListQuery },
            result: { data: listData },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            customResolvers: {
                Query: {
                    person: function (_, args) { return toIdValue(args['id']); },
                },
            },
            dataIdFromObject: dataIdFromObject,
        });
        return client.query({ query: listQuery }).then(function () {
            return client.query({ query: itemQuery });
        }).then(function (itemResult) {
            assert.deepEqual(itemResult, {
                loading: false,
                networkStatus: NetworkStatus.ready,
                stale: false,
                data: {
                    person: {
                        __typename: 'Person',
                        id: '4',
                        name: 'Luke Skywalker',
                    },
                },
            });
        });
        var _a, _b, _c;
    });
});
//# sourceMappingURL=customResolvers.js.map