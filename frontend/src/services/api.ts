import axios from 'axios';
import { WhaleAlert, Contract } from '../types/api';

const API_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    getAlerts: async (): Promise<WhaleAlert[]> => {
        const response = await apiClient.get<WhaleAlert[]>('/alerts/');
        return response.data;
    },

    getContracts: async (): Promise<Contract[]> => {
        const response = await apiClient.get<Contract[]>('/contracts/');
        return response.data;
    },

    getContractDetail: async (id: number): Promise<Contract> => {
        const response = await apiClient.get<Contract>(`/contracts/${id}`);
        return response.data;
    },
};
