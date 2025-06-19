import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const PLAYBOOK_API_URL = `${API_BASE_URL}/playbooks`;

// Helper to get authenticated headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Playbook {
  id: number;
  name: string;
  description?: string;
  content: string; // YAML content
  created_by_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlaybookFormData {
  name: string;
  description?: string;
  content: string;
}

// ----- Playbook Service Functions -----
export const getPlaybooks = async (): Promise<Playbook[]> => {
  const response = await axios.get(`${PLAYBOOK_API_URL}/`, { headers: getAuthHeaders() });
  return response.data;
};

export const getPlaybookById = async (id: number): Promise<Playbook> => {
  const response = await axios.get(`${PLAYBOOK_API_URL}/${id}/`, { headers: getAuthHeaders() });
  return response.data;
};

export const createPlaybook = async (data: PlaybookFormData): Promise<Playbook> => {
  const response = await axios.post(`${PLAYBOOK_API_URL}/`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updatePlaybook = async (id: number, data: PlaybookFormData): Promise<Playbook> => {
  const response = await axios.put(`${PLAYBOOK_API_URL}/${id}/`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deletePlaybook = async (id: number): Promise<void> => {
  await axios.delete(`${PLAYBOOK_API_URL}/${id}/`, { headers: getAuthHeaders() });
};
