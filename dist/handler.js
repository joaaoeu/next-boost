"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const next_boost_hdc_adapter_1 = __importDefault(require("next-boost-hdc-adapter"));
const zlib_1 = require("zlib");
const cache_manager_1 = require("./cache-manager");
const renderer_1 = __importDefault(require("./renderer"));
const utils_1 = require("./utils");
function matchRule(conf, req) {
    const err = ['GET', 'HEAD'].indexOf(req.method) === -1;
    if (err)
        return { matched: false, ttl: -1 };
    if (typeof conf.rules === 'function') {
        const ttl = conf.rules(req);
        if (ttl) {
            return { matched: true, ttl };
        }
    }
    else {
        for (const rule of conf.rules) {
            if (req.url && new RegExp(rule.regex).test(req.url)) {
                return { matched: true, ttl: rule.ttl };
            }
        }
    }
    return { matched: false, ttl: 0 };
}
function toBuffer(o) {
    return Buffer.from(JSON.stringify(o));
}
// mutex lock to prevent same page rendered more than once
const SYNC_LOCK = new Set();
const wrap = (cache, conf, renderer, plainHandler) => {
    return (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        req.url = (0, utils_1.filterUrl)(req.url, conf.paramFilter);
        const key = conf.cacheKey ? conf.cacheKey(req) : req.url;
        const { matched, ttl } = matchRule(conf, req);
        if (!matched)
            return plainHandler(req, res);
        const start = process.hrtime();
        const fc = req.headers['x-cache-status'] === 'update'; // forced
        const { status, stop } = yield (0, cache_manager_1.serveCache)(cache, SYNC_LOCK, key, fc, res);
        if (stop)
            return !conf.quiet && (0, utils_1.log)(start, status, req.url);
        // log the time took for staled
        if (status === 'stale')
            !conf.quiet && (0, utils_1.log)(start, status, req.url);
        SYNC_LOCK.add(key);
        const args = { path: req.url, headers: req.headers, method: req.method };
        const rv = yield renderer.render(args);
        // rv.body is a Buffer in JSON format: { type: 'Buffer', data: [...] }
        const body = Buffer.from(rv.body);
        // stale means already served from cache with old ver, just update the cache
        if (status !== 'stale')
            (0, utils_1.serve)(res, rv);
        // stale will print 2 lines, first 'stale', second 'update'
        !conf.quiet && (0, utils_1.log)(start, status === 'stale' ? 'update' : status, req.url);
        if (rv.statusCode === 200 && body.length > 0) {
            // save gzipped data
            const buf = (0, utils_1.isZipped)(rv.headers) ? body : (0, zlib_1.gzipSync)(body);
            yield cache.set('body:' + key, buf, ttl);
            yield cache.set('header:' + key, toBuffer(rv.headers), ttl);
        }
        else if (status === 'force') {
            // updating but empty result
            yield cache.del('body:' + key);
            yield cache.del('header:' + key);
        }
        SYNC_LOCK.delete(key);
    });
};
function CachedHandler(args, options) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('> Preparing cached handler');
        // merge config
        const conf = (0, utils_1.mergeConfig)(options);
        // the cache
        const cache = conf.cacheAdapter || next_boost_hdc_adapter_1.default.init();
        const renderer = (0, renderer_1.default)();
        yield renderer.init(args);
        const plain = yield require(args.script).default(args);
        // init the child process for revalidate and cache purge
        return {
            handler: wrap(cache, conf, renderer, plain),
            cache,
            close: () => {
                next_boost_hdc_adapter_1.default.shutdown();
                renderer.kill();
            },
        };
    });
}
exports.default = CachedHandler;
