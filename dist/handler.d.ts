/// <reference types="node" />
import { IncomingMessage, RequestListener } from 'http';
import { InitArgs } from './renderer';
import { ParamFilter } from './utils';
interface URLCacheRule {
    regex: string;
    ttl: number;
}
export declare type CacheKeyBuilder = (req: IncomingMessage) => string;
export declare type CacheStatus = 'hit' | 'stale' | 'miss';
export declare type CacheAdapter = {
    set(key: string, value: Buffer, ttl?: number): Promise<void>;
    get(key: string, defaultValue?: Buffer): Promise<Buffer | undefined>;
    has(key: string): Promise<CacheStatus>;
    del(key: string): Promise<void>;
};
export declare type URLCacheRuleResolver = (req: IncomingMessage) => number;
export interface HandlerConfig {
    filename?: string;
    quiet?: boolean;
    rules?: Array<URLCacheRule> | URLCacheRuleResolver;
    cacheAdapter?: CacheAdapter;
    paramFilter?: ParamFilter;
    cacheKey?: CacheKeyBuilder;
}
export default function CachedHandler(args: InitArgs, options?: HandlerConfig): Promise<{
    handler: RequestListener;
    cache: CacheAdapter;
    close: () => void;
}>;
export {};
