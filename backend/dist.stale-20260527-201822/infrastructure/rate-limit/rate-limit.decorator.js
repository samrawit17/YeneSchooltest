"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRateLimit = exports.RateLimit = exports.SKIP_RATE_LIMIT_KEY = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.RATE_LIMIT_KEY = 'rate_limit_options';
exports.SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';
const RateLimit = (options) => (0, common_1.SetMetadata)(exports.RATE_LIMIT_KEY, options);
exports.RateLimit = RateLimit;
const SkipRateLimit = () => (0, common_1.SetMetadata)(exports.SKIP_RATE_LIMIT_KEY, true);
exports.SkipRateLimit = SkipRateLimit;
//# sourceMappingURL=rate-limit.decorator.js.map