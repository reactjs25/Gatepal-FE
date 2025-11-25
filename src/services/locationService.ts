import axios from 'axios';
import { apiClient } from '../lib/api';
import { CountryCityOption } from '../types';

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string };
    return data?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export const fetchCountryCityOptions = async (): Promise<CountryCityOption[]> => {
  try {
    const response = await apiClient.get('/society/locations/country-cities');
    const payload = response.data?.data as CountryCityOption[] | undefined;
    if (!payload) {
      throw new Error('Locations data is missing in the server response.');
    }
    return payload;
  } catch (error) {
    const message = extractErrorMessage(error, 'Failed to load countries and cities.');
    throw new Error(message);
  }
};


