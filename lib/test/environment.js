import { assert } from 'chai';
import { isEnv, isProduction, isDevelopment, isTest } from '../src/util/environment';
describe('environment', function () {
    var keepEnv;
    beforeEach(function () {
        keepEnv = process.env.NODE_ENV;
    });
    afterEach(function () {
        process.env.NODE_ENV = keepEnv;
    });
    describe('isEnv', function () {
        it("should match when there's a value", function () {
            [
                'production',
                'development',
                'test',
            ]
                .forEach(function (env) {
                process.env.NODE_ENV = env;
                assert.isTrue(isEnv(env));
            });
        });
        it("should treat no proces.env.NODE_ENV as it'd be in development", function () {
            delete process.env.NODE_ENV;
            assert.isTrue(isEnv('development'));
        });
    });
    describe('isProduction', function () {
        it('should return true if in production', function () {
            process.env.NODE_ENV = 'production';
            assert.isTrue(isProduction());
        });
        it('should return false if not in production', function () {
            process.env.NODE_ENV = 'test';
            assert.isTrue(!isProduction());
        });
    });
    describe('isTest', function () {
        it('should return true if in test', function () {
            process.env.NODE_ENV = 'test';
            assert.isTrue(isTest());
        });
        it('should return true if not in test', function () {
            process.env.NODE_ENV = 'development';
            assert.isTrue(!isTest());
        });
    });
    describe('isDevelopment', function () {
        it('should return true if in development', function () {
            process.env.NODE_ENV = 'development';
            assert.isTrue(isDevelopment());
        });
        it('should return true if not in development and environment is defined', function () {
            process.env.NODE_ENV = 'test';
            assert.isTrue(!isDevelopment());
        });
        it('should make development as the default environment', function () {
            delete process.env.NODE_ENV;
            assert.isTrue(isDevelopment());
        });
    });
});
//# sourceMappingURL=environment.js.map