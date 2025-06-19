import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const HOST_API_URL = API_BASE_URL; // Base URL already includes /api/v1

// Helper to get authenticated headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ----- HostGroup Interfaces -----
export interface HostGroup {
  id: number;
  name: string;
  description?: string;
  created_by_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HostGroupFormData {
  name: string;
  description?: string;
}

// ----- Host Interfaces -----
export interface Host {
  id: number;
  name: string;
  ip_address?: string;
  fqdn?: string;
  ansible_user?: string;
  ansible_port?: number;
  ssh_key_name?: string;
  groups: number[];
  group_details?: HostGroup[];
  variables?: Record<string, any>;
  created_by_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HostFormData {
  name: string;
  ip_address?: string;
  fqdn?: string;
  ansible_user?: string;
  ansible_port?: number;
  ssh_key_name?: string;
  groups: number[];
  variables?: string; // JSON string for variables
}


// ----- HostGroup Service Functions -----
export const getHostGroups = async (): Promise<HostGroup[]> => {
  const response = await axios.get(`${HOST_API_URL}/hostgroups/`, { headers: getAuthHeaders() });
  return response.data;
};

export const getHostGroupById = async (id: number): Promise<HostGroup> => {
  const response = await axios.get(`${HOST_API_URL}/hostgroups/${id}/`, { headers: getAuthHeaders() });
  return response.data;
};

export const createHostGroup = async (data: HostGroupFormData): Promise<HostGroup> => {
  const response = await axios.post(`${HOST_API_URL}/hostgroups/`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updateHostGroup = async (id: number, data: HostGroupFormData): Promise<HostGroup> => {
  const response = await axios.put(`${HOST_API_URL}/hostgroups/${id}/`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteHostGroup = async (id: number): Promise<void> => {
  await axios.delete(`${HOST_API_URL}/hostgroups/${id}/`, { headers: getAuthHeaders() });
};

// ----- Host Service Functions -----
export const getHosts = async (groupId?: number): Promise<Host[]> => {
  const params = groupId ? { group_id: groupId } : {};
  const response = await axios.get(`${HOST_API_URL}/hosts/`, { headers: getAuthHeaders(), params });
  return response.data;
};

export const getHostById = async (id: number): Promise<Host> => {
  const response = await axios.get(`${HOST_API_URL}/hosts/${id}/`, { headers: getAuthHeaders() });
  return response.data;
};

export const createHost = async (data: HostFormData): Promise<Host> => {
  const payload = {
    ...data,
    variables: data.variables && data.variables.trim() !== '' ? JSON.parse(data.variables) : {},
  };
  const response = await axios.post(`${HOST_API_URL}/hosts/`, payload, { headers: getAuthHeaders() });
  return response.data;
};

export const updateHost = async (id: number, data: HostFormData): Promise<Host> => {
  const payload = {
    ...data,
    variables: data.variables && data.variables.trim() !== '' ? JSON.parse(data.variables) : {},
  };
  const response = await axios.put(`${HOST_API_URL}/hosts/${id}/`, payload, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteHost = async (id: number): Promise<void> => {
  await axios.delete(`${HOST_API_URL}/hosts/${id}/`, { headers: getAuthHeaders() });
};
