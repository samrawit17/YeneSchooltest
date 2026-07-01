export interface AutomationEvent {
  eventType: string;
  payload: Record<string, any>;
  schoolId: string;
  timestamp: Date;
}
