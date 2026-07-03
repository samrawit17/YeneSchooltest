import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHealth(): {
        status: string;
        timestamp: string;
    };
    getHello(): string;
    getProtected(req: any): {
        message: string;
        user: any;
    };
    getAdmin(req: any): {
        message: string;
        user: any;
    };
    getPermissions(req: any): {
        message: string;
        user: any;
    };
}
