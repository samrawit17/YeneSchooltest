import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { EventBusService } from '../../core/events/event-bus.service';
export declare class SmsAction extends BaseAction {
    private readonly eventBus;
    readonly type = "send_sms";
    constructor(eventBus: EventBusService);
    execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
    private compileTemplate;
}
