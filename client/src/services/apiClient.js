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

const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true'

export const apiClient = useRealApi ? api : mockApi
