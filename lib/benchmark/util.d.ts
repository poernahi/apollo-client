export declare type DoneFunction = () => void;
export interface DescriptionObject {
    name: string;
    [other: string]: any;
}
export declare type Nullable<T> = T | undefined;
export declare type Description = DescriptionObject | string;
export declare type CycleFunction = (doneFn: DoneFunction) => void;
export declare type BenchmarkFunction = (description: Description, cycleFn: CycleFunction) => void;
export declare type GroupFunction = (done: DoneFunction) => void;
export declare type AfterEachCallbackFunction = (descr: Description, event: any) => void;
export declare type AfterEachFunction = (afterEachFnArg: AfterEachCallbackFunction) => void;
export declare type AfterAllCallbackFunction = () => void;
export declare type AfterAllFunction = (afterAllFn: AfterAllCallbackFunction) => void;
export declare let benchmark: BenchmarkFunction;
export declare let afterEach: AfterEachFunction;
export declare let afterAll: AfterAllFunction;
export declare function log(logString: string, ...args: any[]): void;
export declare const dataIdFromObject: (object: any) => string | null;
export declare const groupPromises: Promise<void>[];
export declare const group: (groupFn: GroupFunction) => void;
export declare function runBenchmarks(): void;
