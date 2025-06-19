import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const TASK_API_URL = `${API_BASE_URL}/taskexecutions`;

// Helper to get authenticated headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface TaskExecution {
  id: number;
  playbook: number;
  playbook_name?: string;
  target_spec: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';
  celery_task_id?: string;
  output_log_directory?: string;
  executed_by?: number;
  executed_by_username?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface TaskExecutionTriggerData {
  playbook: number;
  target_spec: string;
}

// ----- Task Execution Service Functions -----

export const triggerTaskExecution = async (data: TaskExecutionTriggerData): Promise<TaskExecution> => {
  const response = await axios.post(`${TASK_API_URL}/`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const getTaskExecutions = async (playbookId?: number): Promise<TaskExecution[]> => {
  const params = playbookId ? { playbook_id: playbookId } : {};
  const response = await axios.get(`${TASK_API_URL}/`, { headers: getAuthHeaders(), params });
  return response.data;
};

export const getTaskExecutionById = async (id: number): Promise<TaskExecution> => {
  const response = await axios.get(`${TASK_API_URL}/${id}/`, { headers: getAuthHeaders() });
  return response.data;
};

export const getTaskExecutionLog = async (id: number): Promise<string> => {
  // This assumes a backend endpoint like /api/v1/taskexecutions/<id>/log_content/
  // The backend TaskExecutionViewSet needs a custom action for this.
  const response = await axios.get(`${TASK_API_URL}/${id}/log_content/`, {
    headers: getAuthHeaders(),
    responseType: 'text'
  });
  return response.data;
};
