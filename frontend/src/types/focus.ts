export interface FocusSession {
  id: string;
  task_id: string;
  focused_on: string;
  duration_minutes: number;
  completed_at: string;
}

export interface DailyFocusSummary {
  focused_on: string;
  focused_minutes: number;
  completed_pomodoros: number;
}
