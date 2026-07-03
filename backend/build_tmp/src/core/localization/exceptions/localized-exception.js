"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizedException = void 0;
const common_1 = require("@nestjs/common");
class LocalizedException extends common_1.HttpException {
    fallbackMessage;
    localizationKey;
    localizationParams;
    constructor(localizationKey, params, status = common_1.HttpStatus.BAD_REQUEST, fallbackMessage) {
        const response = {
            key: localizationKey,
            message: fallbackMessage || localizationKey,
            params,
            statusCode: status,
        };
        super(response, status);
        this.fallbackMessage = fallbackMessage;
        this.localizationKey = localizationKey;
        this.localizationParams = params;
        this.name = 'LocalizedException';
    }
    getKey() {
        return this.localizationKey;
    }
    getParams() {
        return this.localizationParams;
    }
}
exports.LocalizedException = LocalizedException;
//# sourceMappingURL=localized-exception.js.map