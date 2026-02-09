/**
 * HttpRequest class for making HTTP requests using fetch
 */
export class HttpRequest {
  private baseUrl: string
  private options: any

  constructor(baseUrl: string, options: any = {}) {
    this.baseUrl = baseUrl
    this.options = options
  }

  private async makeRequest(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`
    
    const requestHeaders = new Headers({
      'Content-Type': 'application/json',
      ...headers,
    })

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(fullUrl, requestOptions)
      
      // Check if response is OK
      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type') || ''
        let errorMessage = `HTTP error! status: ${response.status}`
        
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage
          }
        } else {
          // If not JSON, read as text to see what we got
          try {
            const text = await response.text()
            if (text.length < 200) {
              errorMessage = `${errorMessage}, response: ${text.substring(0, 200)}`
            }
          } catch (e) {
            // Ignore text reading errors
          }
        }
        
        throw new Error(errorMessage)
      }
      
      // Handle response
      if (this.options.responseHandel) {
        // Check content type before parsing JSON
        const contentType = response.headers.get('content-type') || ''
        let data: any
        
        if (contentType.includes('application/json')) {
          try {
            data = await response.json()
          } catch (parseError: any) {
            throw new Error(`Failed to parse JSON response: ${parseError.message}. URL: ${fullUrl}`)
          }
        } else {
          // If not JSON, read as text
          const text = await response.text()
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}. URL: ${fullUrl}`)
        }
        
        return await this.options.responseHandel({ ...response, data })
      }

      // Default response handling
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}. URL: ${fullUrl}`)
      }

      return await response.json()
    } catch (error) {
      // Handle error
      if (this.options.errorHandel) {
        return await this.options.errorHandel(error)
      }
      throw error
    }
  }

  get(url: string, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest('GET', url, undefined, headers)
  }

  post(url: string, data?: any, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest('POST', url, data, headers)
  }

  put(url: string, data?: any, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest('PUT', url, data, headers)
  }

  delete(url: string, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest('DELETE', url, undefined, headers)
  }

  // Expose request method for direct access
  get request() {
    return {
      get: (url: string, headers?: Record<string, string>) => this.get(url, headers),
      post: (url: string, data?: any, headers?: Record<string, string>) => this.post(url, data, headers),
      put: (url: string, data?: any, headers?: Record<string, string>) => this.put(url, data, headers),
      delete: (url: string, headers?: Record<string, string>) => this.delete(url, headers),
    }
  }
}

/**
 * Create a lazy-initialized API client
 * @param getBaseUrl - Function to get API base URL
 * @param options - HttpRequest options
 * @returns Proxy object that lazily initializes API client
 */
export function createLazyApiClient(getBaseUrl: () => string, options?: any) {
  let instance: any = null

  function getInstance() {
    if (!instance) {
      const baseUrl = getBaseUrl()
      console.log('初始化 API 客户端:', baseUrl)
      instance = new HttpRequest(baseUrl, options || {}).request
    }
    return instance
  }

  // Return a Proxy, all method calls go through getInstance()
  return new Proxy({} as any, {
    get(target, prop) {
      const api = getInstance()
      return api[prop]
    },
  })
}
