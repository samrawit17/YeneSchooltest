import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
export declare class EmailAction extends BaseAction {
    readonly type = "send_email";
    execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
    private compileTemplate;
}
