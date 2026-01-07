import { apiClient, apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import toast from 'react-hot-toast'

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('apiClient', () => {
    it('returns data on successful request', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      })

      const result = await apiClient('/api/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('returns error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })

      const result = await apiClient('/api/test')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('Not found')
    })

    it('shows error toast by default on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await apiClient('/api/test')

      expect(toast.error).toHaveBeenCalled()
    })

    it('does not show error toast when disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await apiClient('/api/test', {}, { showErrorToast: false })

      expect(toast.error).not.toHaveBeenCalled()
    })

    it('shows success toast when enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await apiClient('/api/test', {}, { showSuccessToast: true, successMessage: 'Done!' })

      expect(toast.success).toHaveBeenCalledWith('Done!')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await apiClient('/api/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('provides user-friendly error messages for common status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })

      const result = await apiClient('/api/test')

      expect(result.error).toBe('Please sign in to continue.')
    })
  })

  describe('apiGet', () => {
    it('makes GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })

      await apiGet('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('apiPost', () => {
    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      await apiPost('/api/test', { name: 'Test' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      )
    })
  })

  describe('apiPatch', () => {
    it('makes PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      await apiPatch('/api/test/1', { name: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        })
      )
    })
  })

  describe('apiDelete', () => {
    it('makes DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await apiDelete('/api/test/1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
