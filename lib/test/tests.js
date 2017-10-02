import 'es6-promise';
import 'isomorphic-fetch';
import { QueryManager } from '../src/core/QueryManager';
process.env.NODE_ENV = 'test';
QueryManager.EMIT_REDUX_ACTIONS = false;
require('source-map-support').install();
console.warn = console.error = function () {
    var messages = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        messages[_i] = arguments[_i];
    }
    console.log.apply(console, ["==> Error in test: Tried to log warning or error with message:\n"].concat(messages));
    if ((!process.env.CI) && (!process.env.COV)) {
        process.exit(1);
    }
};
process.on('unhandledRejection', function () { });
import './warnOnce';
import './fragmentMatcher';
import './writeToStore';
import './readFromStore';
import './roundtrip';
import './diffAgainstStore';
import './networkInterface';
import './deduplicator';
import './QueryManager';
import './client';
import './store';
import './queryTransform';
import './getFromAST';
import './directives';
import './batching';
import './scheduler';
import './mutationResults';
import './optimistic';
import './fetchMore';
import './errors';
import './mockNetworkInterface';
import './graphqlSubscriptions';
import './batchedNetworkInterface';
import './ObservableQuery';
import './subscribeToMore';
import './customResolvers';
import './isEqual';
import './cloneDeep';
import './assign';
import './environment';
import './ApolloClient';
import './proxy';
//# sourceMappingURL=tests.js.map