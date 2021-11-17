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
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveCache = void 0;
const stream_1 = require("stream");
const utils_1 = require("./utils");
const MAX_WAIT = 10000; // 10 seconds
const INTERVAL = 10; // 10 ms
function serveCache(cache, lock, key, forced, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const rv = { status: 'force', stop: false };
        if (forced)
            return rv;
        rv.status = yield cache.has('body:' + key);
        // forced to skip cache or first-time miss
        if (!lock.has(key) && rv.status === 'miss')
            return rv;
        // non first-time miss, wait for the cache
        if (rv.status === 'miss')
            yield waitAndServe(() => lock.has(key), rv);
        const payload = { body: null, headers: null };
        if (!rv.stop) {
            payload.body = yield cache.get('body:' + key);
            const headersBuffer = yield cache.get('header:' + key);
            if (headersBuffer) {
                payload.headers = JSON.parse(headersBuffer.toString());
            }
        }
        send(payload, res);
        // no need to run update again
        if ((lock.has(key) && rv.status === 'stale') || rv.status === 'hit') {
            rv.stop = true;
        }
        return rv;
    });
}
exports.serveCache = serveCache;
function waitAndServe(hasLock, rv) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = new Date().getTime();
        while (hasLock()) {
            yield (0, utils_1.sleep)(INTERVAL);
            const now = new Date().getTime();
            // to protect the server from heavy payload
            if (now - start > MAX_WAIT) {
                rv.stop = true;
                rv.status = 'error';
                return;
            }
        }
        rv.status = 'hit';
    });
}
function send(payload, res) {
    const { body, headers } = payload;
    if (!body) {
        res.statusCode = 504;
        return res.end();
    }
    for (const k in headers) {
        res.setHeader(k, headers[k]);
    }
    res.statusCode = 200;
    res.removeHeader('transfer-encoding');
    res.setHeader('content-length', Buffer.byteLength(body));
    res.setHeader('content-encoding', 'gzip');
    const stream = new stream_1.PassThrough();
    stream.pipe(res);
    stream.end(body);
}
