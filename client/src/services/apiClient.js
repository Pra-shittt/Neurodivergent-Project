/**
 * apiClient.js — API service selector
 * 
 * Set VITE_USE_REAL_API=true in client/.env to connect to the Express backend.
 * Leave unset (or false) to use the mock API (no backend needed).
 * 
 * This pattern means zero component rewrites when switching.
 */

import { mockApi } from './mockApi.js'
import { api } from './api.js'

const rawUseRealApi = import.meta.env.VITE_USE_REAL_API

// In development, default to mock unless VITE_USE_REAL_API === 'true'
// In production or when VITE_API_URL is configured, use real API unless explicitly set to 'false'
const useRealApi = rawUseRealApi !== undefined
  ? rawUseRealApi === 'true'
  : (import.meta.env.PROD || Boolean(import.meta.env.VITE_API_URL))

export const apiClient = useRealApi ? api : mockApi
