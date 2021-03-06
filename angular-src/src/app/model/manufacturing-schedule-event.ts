import { Activity } from './activity'

export class ManufacturingScheduleEvent {
  activity: Activity;
  manufacturing_line: string;
  start_date: Date;
  duration: number;
  committed: boolean;
  duration_override: boolean;
  orphaned?: boolean;
  past_deadline?: boolean;
}
