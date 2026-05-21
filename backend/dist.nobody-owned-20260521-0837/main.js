"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
function describeDatabaseTarget(databaseUrl) {
    if (!databaseUrl) {
        return 'DATABASE_URL is not set';
    }
    try {
        const parsed = new URL(databaseUrl);
        const dbName = parsed.pathname.replace(/^\//, '') || '<unknown>';
        return `${parsed.hostname}:${parsed.port || '5432'}/${dbName}`;
    }
    catch {
        return 'DATABASE_URL is set but could not be parsed';
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        optionsSuccessStatus: 204,
    });
    app.set('trust proxy', process.env.TRUST_PROXY ?? 1);
    app.use((0, cookie_parser_1.default)());
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'public'));
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
    }));
    app.useBodyParser('json', { limit: '10mb' });
    const port = process.env.PORT ?? 5000;
    await app.listen(port);
    console.log(`[startup] Backend listening on port ${port}`);
    console.log(`[startup] Database target: ${describeDatabaseTarget(process.env.DATABASE_POOL_URL || process.env.DATABASE_URL)}`);
    console.log('[startup] Expected Docker database for local development: localhost:5433/lemarisms');
}
bootstrap();
//# sourceMappingURL=main.js.map