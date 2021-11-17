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
const http_1 = __importDefault(require("http"));
const multee_1 = __importDefault(require("multee"));
const { createHandler, start } = (0, multee_1.default)('worker');
let server;
const init = createHandler('init', (args) => __awaiter(void 0, void 0, void 0, function* () {
    const fn = require(args.script).default;
    server = new http_1.default.Server(yield fn(args.args)).listen(0);
}));
const render = createHandler('renderer', (options) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        if (typeof addr !== 'object') {
            return reject('Failed to create server in renderer');
        }
        const args = Object.assign({ hostname: '127.0.0.1', port: addr.port }, options);
        const req = http_1.default.request(args, res => {
            let body = Buffer.from('');
            res.on('data', chunk => (body = Buffer.concat([body, chunk])));
            res.on('end', () => resolve({ headers: res.headers, statusCode: res.statusCode, body }));
        });
        req.on('error', e => reject(`Failed in renderer: ${e.message}`));
        req.end();
    });
}));
exports.default = () => {
    const child = start(__filename);
    return {
        init: init(child),
        render: render(child),
        kill: () => child.terminate(),
    };
};
