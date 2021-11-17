/// <reference types="node" />
import { ServerResponse } from 'http';
import { CacheAdapter } from './handler';
declare type HasReturn = ReturnType<CacheAdapter['has']> extends Promise<infer T> ? T : never;
declare type ServeResult = {
    status: HasReturn | 'force' | 'error';
    stop: boolean;
};
export declare function serveCache(cache: CacheAdapter, lock: Set<string>, key: string, forced: boolean, res: ServerResponse): Promise<ServeResult>;
export {};
