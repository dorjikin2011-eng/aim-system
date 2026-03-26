"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../src/server"));
/**
 * Vercel serverless function wrapper for Express app
 */
exports.default = (req, res) => {
    (0, server_1.default)(req, res);
};
