export type TaskPriority = "must_do" | "should_do" | "could_do";

export interface Task {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: TaskPriority;
  category: string;
  estimated_minutes: number | null;
  is_completed: boolean;
}

export interface CreateTaskInput {
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: TaskPriority;
  category: string;
  estimated_minutes: number | null;
}
