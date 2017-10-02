import { QueryManager, } from '../../src/core/QueryManager';
import mockNetworkInterface from './mockNetworkInterface';
import { createApolloStore, } from '../../src/store';
var defaultReduxRootSelector = function (state) { return state.apollo; };
export default function () {
    var mockedResponses = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        mockedResponses[_i] = arguments[_i];
    }
    return new QueryManager({
        networkInterface: mockNetworkInterface.apply(void 0, mockedResponses),
        store: createApolloStore(),
        reduxRootSelector: defaultReduxRootSelector,
        addTypename: false,
    });
};
//# sourceMappingURL=mockQueryManager.js.map