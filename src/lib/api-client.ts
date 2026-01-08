import toast from 'react-hot-toast'

interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

interface ApiOptions {
  showSuccessToast?: boolean
  successMessage?: string
  showErrorToast?: boolean
}

const defaultOptions: ApiOptions = {
  showSuccessToast: false,
  showErrorToast: true,
}

/**
 * Generic API client with consistent error handling and toast notifications
 */
export async function apiClient<T>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const opts = { ...defaultOptions, ...apiOptions }

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error || getErrorMessage(response.status)
      if (opts.showErrorToast) {
        toast.error(errorMessage)
      }
      return { data: null, error: errorMessage, success: false }
    }

    if (opts.showSuccessToast && opts.successMessage) {
      toast.success(opts.successMessage)
    }

    return { data, error: null, success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.'
    if (opts.showErrorToast) {
      toast.error(errorMessage)
    }
    return { data: null, error: errorMessage, success: false }
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(url: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { method: 'GET' }, options)
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return apiClient<T>(
    url,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    options
  )
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  url: string,
  body: unknown,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return apiClient<T>(
    url,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
    options
  )
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(url: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { method: 'DELETE' }, options)
}

/**
 * Get user-friendly error message based on HTTP status code
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Please sign in to continue.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'The requested item was not found.'
    case 409:
      return 'This conflicts with existing data. Please try again.'
    case 422:
      return 'Unable to process your request. Please check your input.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Something went wrong on our end. Please try again later.'
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile(
  url: string,
  file: File,
  folder?: string,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<{ url: string }>> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) {
      formData.append('folder', folder)
    }

    // For now, we can't track progress with fetch, but this provides the structure
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error || 'Failed to upload file'
      toast.error(errorMessage)
      return { data: null, error: errorMessage, success: false }
    }

    return { data, error: null, success: true }
  } catch (error) {
    const errorMessage = 'Failed to upload file. Please try again.'
    toast.error(errorMessage)
    return { data: null, error: errorMessage, success: false }
  }
}
