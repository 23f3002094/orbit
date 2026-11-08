import type { CreateTaskInput, Task } from "@/types/task";
import type { Subtask } from "@/types/subtask";
import type { DailyFocusSummary, FocusSession, TaskCompletionSummary, TaskStreakSummary } from "@/types/focus";
import { getAccessToken } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export interface OrbitProfile {
  id: string;
  email: string | null;
  display_name: string;
  created_at: string;
}

async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await getAccessToken()}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
}

export async function syncProfile(): Promise<OrbitProfile> {
  const response = await apiRequest("/me");
  if (!response.ok) throw new Error("Orbit could not prepare your profile.");
  return response.json() as Promise<OrbitProfile>;
}

export async function getTasks(): Promise<Task[]> {
  const response = await apiRequest("/tasks");
  if (!response.ok) throw new Error("Orbit could not load your tasks.");
  return response.json() as Promise<Task[]>;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await apiRequest("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? "Orbit could not create that task.");
  }

  return response.json() as Promise<Task>;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const response = await apiRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error("Orbit could not update that task.");
  return response.json() as Promise<Task>;
}

export async function updateTaskCompletion(taskId: string, isCompleted: boolean): Promise<Task> {
  return updateTask(taskId, { is_completed: isCompleted });
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Orbit could not delete that task.");
}

export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  const response = await apiRequest(`/tasks/${taskId}/subtasks`);
  if (!response.ok) throw new Error("Orbit could not load this task's subtasks.");
  return response.json() as Promise<Subtask[]>;
}

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const response = await apiRequest(`/tasks/${taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Orbit could not create that subtask.");
  return response.json() as Promise<Subtask>;
}

export async function updateSubtaskCompletion(subtaskId: string, isCompleted: boolean): Promise<Subtask> {
  const response = await apiRequest(`/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  if (!response.ok) throw new Error("Orbit could not update that subtask.");
  return response.json() as Promise<Subtask>;
}

export async function createFocusSession(input: {
  task_id: string;
  focused_on: string;
  duration_seconds: number;
  is_full_pomodoro: boolean;
}): Promise<FocusSession> {
  const response = await apiRequest("/focus-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Orbit could not save this focus session.");
  return response.json() as Promise<FocusSession>;
}

export async function getDailyFocusSummary(endDate: string, days = 7): Promise<DailyFocusSummary[]> {
  const params = new URLSearchParams({ end_date: endDate, days: String(days) });
  const response = await apiRequest(`/focus-sessions/daily?${params}`);
  if (!response.ok) throw new Error("Orbit could not load your focus statistics.");
  return response.json() as Promise<DailyFocusSummary[]>;
}

export async function getFocusSessions(startDate: string, endDate: string): Promise<FocusSession[]> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const response = await apiRequest(`/focus-sessions?${params}`);
  if (!response.ok) throw new Error("Orbit could not load your focus timeline.");
  return response.json() as Promise<FocusSession[]>;
}

export async function getTaskStreak(endDate: string): Promise<TaskStreakSummary> {
  const response = await apiRequest(`/insights/task-streak?end_date=${endDate}`);
  if (!response.ok) throw new Error("Orbit could not load your task streak.");
  return response.json() as Promise<TaskStreakSummary>;
}

export async function getTaskCompletion(endDate: string): Promise<TaskCompletionSummary> {
  const response = await apiRequest(`/insights/task-completion?end_date=${endDate}`);
  if (!response.ok) throw new Error("Orbit could not load your task completion statistics.");
  return response.json() as Promise<TaskCompletionSummary>;
}
