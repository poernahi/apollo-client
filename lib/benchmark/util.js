import * as Benchmark from 'benchmark';
var bsuite = new Benchmark.Suite();
export var benchmark;
export var afterEach;
export var afterAll;
export function log(logString) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    console.log.apply(console, [logString].concat(args));
}
export var dataIdFromObject = function (object) {
    if (object.__typename && object.id) {
        return object.__typename + '__' + object.id;
    }
    return null;
};
function currentScope() {
    return {
        benchmark: benchmark,
        afterEach: afterEach,
        afterAll: afterAll,
    };
}
function setScope(scope) {
    benchmark = scope.benchmark;
    afterEach = scope.afterEach;
    afterAll = scope.afterAll;
}
export var groupPromises = [];
export var group = function (groupFn) {
    var oldScope = currentScope();
    var scope = {};
    var afterEachFn = undefined;
    scope.afterEach = function (afterEachFnArg) {
        afterEachFn = afterEachFnArg;
    };
    var afterAllFn = undefined;
    scope.afterAll = function (afterAllFnArg) {
        afterAllFn = afterAllFnArg;
    };
    var benchmarkPromises = [];
    scope.benchmark = function (description, benchmarkFn) {
        var name = description.name || description;
        log('Adding benchmark: ', name);
        var scopes = [];
        var cycleCount = 0;
        benchmarkPromises.push(new Promise(function (resolve, reject) {
            bsuite.add(name, {
                defer: true,
                fn: function (deferred) {
                    var done = function () {
                        cycleCount++;
                        deferred.resolve();
                    };
                    benchmarkFn(done);
                },
                onComplete: function (event) {
                    if (afterEachFn) {
                        afterEachFn(description, event);
                    }
                    resolve();
                },
            });
        }));
    };
    groupPromises.push(new Promise(function (resolve, reject) {
        var groupDone = function () {
            Promise.all(benchmarkPromises).then(function () {
                if (afterAllFn) {
                    afterAllFn();
                }
            });
            resolve();
        };
        setScope(scope);
        groupFn(groupDone);
        setScope(oldScope);
    }));
};
export function runBenchmarks() {
    Promise.all(groupPromises).then(function () {
        log('Running benchmarks.');
        bsuite
            .on('error', function (error) {
            log('Error: ', error);
        })
            .on('cycle', function (event) {
            log('Mean time in ms: ', event.target.stats.mean * 1000);
            log(String(event.target));
        })
            .run({ 'async': false });
    });
}
//# sourceMappingURL=util.js.map