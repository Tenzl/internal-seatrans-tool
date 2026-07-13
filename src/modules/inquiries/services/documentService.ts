import axios, { type AxiosProgressEvent } from 'axios'
import { API_CONFIG } from '@/shared/config/api.config'
import { authService } from '@/modules/auth/services/authService'

const API_BASE_URL = API_CONFIG.API_URL

export type DocumentType = 'INVOICE' | 'QUOTATION' | 'PROFORMA_INVOICE' | 'DELIVERY_RECEIPT' | 'SPECIFICATION' | 'OTHER'

export interface InquiryDocument {
  id: number
  inquiryId: number
  documentType: DocumentType
  fileName: string
  originalFileName: string
  fileSize: number
  mimeType: string
  description: string | null
  uploadedAt: string
  uploadedByName: string
  uploadedByEmail: string
  version: number
  checksum: string
  isActive: boolean
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

const getAuthHeaders = () => {
  // Centralized auth header builder so we always send the bearer token
  return authService.getAuthHeader()
}

/**
 * Document service for inquiry attachments.
 * Includes standardized error handling, progress tracking, and validation.
 */
export const documentService = {
  /**
   * Upload a document for an inquiry.
   * @param inquiryId - Inquiry ID
   * @param serviceSlug - Service slug (shipping-agency, chartering, freight-forwarding, total-logistic, special-request)
   * @param documentType - Document type
   * @param file - PDF file to upload
   * @param description - Document description
   * @param onProgress - Upload progress callback
   */
  uploadDocument: async (
    inquiryId: number,
    serviceSlug: string,
    documentType: DocumentType,
    file: File,
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<InquiryDocument> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    formData.append('description', description || '')

    try {
      const headers = getAuthHeaders()
      if (!headers.Authorization) {
        throw new Error('Please log in to upload documents')
      }

      const response = await axios.post<ApiResponse<InquiryDocument>>(
        `${API_BASE_URL}${API_CONFIG.DOCUMENTS.ADMIN_UPLOAD(serviceSlug, inquiryId)}`,
        formData,
        {
          headers,
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              onProgress?.(progress)
            }
          },
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed')
      }

      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to upload document', { cause: error })
      }
      throw error
    }
  },

  /**
   * Get all documents for an inquiry.
   */
  getDocuments: async (inquiryId: number, serviceSlug: string): Promise<InquiryDocument[]> => {
    try {
      const response = await axios.get<ApiResponse<InquiryDocument[]>>(
        `${API_BASE_URL}${API_CONFIG.DOCUMENTS.LIST(serviceSlug, inquiryId)}`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch documents')
      }

      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch documents', { cause: error })
      }
      throw error
    }
  },

  /**
   * Get documents filtered by type.
   */
  getDocumentsByType: async (inquiryId: number, serviceSlug: string, documentType: DocumentType): Promise<InquiryDocument[]> => {
    try {
      const response = await axios.get<ApiResponse<InquiryDocument[]>>(
        `${API_BASE_URL}${API_CONFIG.DOCUMENTS.LIST_BY_TYPE(serviceSlug, inquiryId)}`,
        {
          params: { type: documentType },
          headers: getAuthHeaders(),
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch documents')
      }

      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch documents', { cause: error })
      }
      throw error
    }
  },

  /**
   * Get direct download URL
   */
  getDownloadUrl: (inquiryId: number, serviceSlug: string, documentId: number): string => {
    return `${API_BASE_URL}${API_CONFIG.DOCUMENTS.CONTENT(serviceSlug, inquiryId, documentId, 'attachment')}`
  },

  getPreviewUrl: (inquiryId: number, serviceSlug: string, documentId: number): string => {
    return `${API_BASE_URL}${API_CONFIG.DOCUMENTS.CONTENT(serviceSlug, inquiryId, documentId, 'inline')}`
  },

  /**
   * Download a document.
   */
  downloadDocument: async (inquiryId: number, serviceSlug: string, documentId: number): Promise<Blob> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${API_CONFIG.DOCUMENTS.CONTENT(serviceSlug, inquiryId, documentId, 'attachment')}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to download document', { cause: error })
      }
      throw error
    }
  },

  /**
   * Delete a document.
   */
  deleteDocument: async (inquiryId: number, serviceSlug: string, documentId: number): Promise<void> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}${API_CONFIG.DOCUMENTS.ADMIN_DELETE(serviceSlug, inquiryId, documentId)}`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete document')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to delete document', { cause: error })
      }
      throw error
    }
  },

  /**
   * Format file size (bytes -> human-readable)
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Validate file before upload
   */
  validateFile: (file: File): { valid: boolean; error?: string } => {
    // Check if file is PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'Only PDF files are allowed' }
    }

    // Check file size (10 MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than 10 MB (current: ${documentService.formatFileSize(file.size)})`,
      }
    }

    return { valid: true }
  },

  /**
   * Get document type display name
   */
  getDocumentTypeLabel: (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      INVOICE: 'Invoice',
      QUOTATION: 'Quotation',
      PROFORMA_INVOICE: 'Proforma Invoice',
      DELIVERY_RECEIPT: 'Delivery Receipt',
      SPECIFICATION: 'Specification',
      OTHER: 'Other',
    }
    return labels[type] || type
  },
}
