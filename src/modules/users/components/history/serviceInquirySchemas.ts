/**
 * Schema configuration for inquiry detail fields per service type
 * Prevents displaying irrelevant fields (e.g., ETA for Special Request)
 */

import {
  formatPurposeOfCalling,
  formatPublicFrtTaxType,
} from '@/modules/inquiries/constants/shippingAgencyInquiryOptions'

export interface InquiryFieldSchema {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean'
  format?: (value: any) => string
}

/**
 * Format helper functions
 */
const formatDate = (value: any): string => {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

const formatNumber = (value: any): string => {
  if (value === undefined || value === null) return ''
  return String(value)
}

const formatText = (value: any): string => {
  if (!value) return ''
  return String(value)
}

const formatBoolean = (value: any): string => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (['yes', 'y', 'true', '1'].includes(normalized)) return 'Yes'
  if (['no', 'n', 'false', '0'].includes(normalized)) return 'No'
  return value ? String(value) : ''
}

/**
 * Service-specific field schemas
 * Order matters - fields will be displayed in this order
 */
export const SERVICE_SCHEMAS: Record<string, InquiryFieldSchema[]> = {
  'shipping-agency': [
    { key: 'toName', label: 'To (Shipowner / Principal)', type: 'text', format: formatText },
    { key: 'mv', label: 'M/V', type: 'text', format: formatText },
    { key: 'dwt', label: 'DWT (tons)', type: 'number', format: formatNumber },
    { key: 'grt', label: 'GRT (tons)', type: 'number', format: formatNumber },
    { key: 'loa', label: 'LOA (m)', type: 'number', format: formatNumber },
    { key: 'eta', label: 'ETA', type: 'date', format: (v) => v ? formatDate(v) : 'TBN' },
    { key: 'cargoType', label: 'Cargo Type', type: 'text', format: formatText },
    { key: 'cargoName', label: 'Cargo Name', type: 'text', format: formatText },
    { key: 'cargoNameOther', label: 'Cargo Name (other)', type: 'text', format: formatText },
    { key: 'cargoQuantity', label: 'Cargo Quantity (MT)', type: 'number', format: formatNumber },
    { key: 'portOfCall', label: 'Port of Call', type: 'text', format: formatText },
    { key: 'frtTaxType', label: 'Freight Tax', type: 'text', format: formatPublicFrtTaxType },
    { key: 'purposeOfCalling', label: 'Purpose of Calling', type: 'text', format: formatPurposeOfCalling },
    { key: 'dischargeLoadingLocation', label: 'Operation at', type: 'text', format: formatText },
    { key: 'transportLs', label: 'Transport L/S', type: 'text', format: formatText },
    { key: 'transportQuarantine', label: 'Transport (quarantine)', type: 'number', format: formatNumber },
    { key: 'boatHireAmount', label: 'Boat Hire Amount', type: 'number', format: formatNumber },
    { key: 'tallyFeeAmount', label: 'Tally Fee Amount', type: 'number', format: formatNumber },
    { key: 'berthHours', label: 'Berth Due (hours)', type: 'number', format: formatNumber },
    { key: 'anchorageHours', label: 'Anchorage Hours', type: 'number', format: formatNumber },
    { key: 'pilotage3rdMiles', label: 'Pilotage 3rd Miles', type: 'number', format: formatNumber },
    { key: 'notes', label: 'Notes', type: 'text', format: formatText },
  ],

  'chartering': [
    { key: 'loadingPort', label: 'Loading Port', type: 'text', format: formatText },
    { key: 'dischargingPort', label: 'Discharging Port', type: 'text', format: formatText },
    { key: 'mv', label: 'M/V', type: 'text', format: formatText },
    { key: 'dwt', label: 'DWT (tons)', type: 'number', format: formatNumber },
    { key: 'grt', label: 'GRT (tons)', type: 'number', format: formatNumber },
    { key: 'loa', label: 'LOA (m)', type: 'number', format: formatNumber },
    { key: 'laycanFrom', label: 'Laycan From', type: 'date', format: formatDate },
    { key: 'laycanTo', label: 'Laycan To', type: 'date', format: formatDate },
    { key: 'cargoType', label: 'Cargo Type', type: 'text', format: formatText },
    { key: 'cargoName', label: 'Cargo Name', type: 'text', format: formatText },
    { key: 'cargoQuantity', label: 'Cargo Quantity (MT)', type: 'number', format: formatNumber },
    // Note: NO ETA field for chartering
  ],

  'freight-forwarding': [
    { key: 'loadingPort', label: 'Loading Port', type: 'text', format: formatText },
    { key: 'dischargingPort', label: 'Discharging Port', type: 'text', format: formatText },
    { key: 'cargoName', label: 'Cargo Name', type: 'text', format: formatText },
    { key: 'cargoType', label: 'Cargo Type', type: 'text', format: formatText },
    { key: 'cargoQuantity', label: 'Cargo Quantity', type: 'number', format: formatNumber },
    { key: 'deliveryTerm', label: 'Delivery Term (Incoterms)', type: 'text', format: formatText },
    { key: 'container20ft', label: '20ft Containers', type: 'number', format: formatNumber },
    { key: 'container40ft', label: '40ft Containers', type: 'number', format: formatNumber },
    { key: 'shipmentFrom', label: 'Shipment From', type: 'text', format: formatText },
    { key: 'shipmentTo', label: 'Shipment To', type: 'text', format: formatText },
  ],

  'total-logistic': [
    { key: 'loadingPort', label: 'Loading Port', type: 'text', format: formatText },
    { key: 'dischargingPort', label: 'Discharging Port', type: 'text', format: formatText },
    { key: 'portOfCall', label: 'Port of Call', type: 'text', format: formatText },
    { key: 'cargoName', label: 'Cargo Name', type: 'text', format: formatText },
    { key: 'cargoType', label: 'Cargo Type', type: 'text', format: formatText },
    { key: 'cargoQuantity', label: 'Cargo Quantity', type: 'number', format: formatNumber },
    { key: 'deliveryTerm', label: 'Delivery Term (Incoterms)', type: 'text', format: formatText },
    { key: 'container20ft', label: '20ft Containers', type: 'number', format: formatNumber },
    { key: 'container40ft', label: '40ft Containers', type: 'number', format: formatNumber },
    { key: 'shipmentFrom', label: 'Shipment From', type: 'text', format: formatText },
    { key: 'shipmentTo', label: 'Shipment To', type: 'text', format: formatText },
  ],

  'special-request': [
    { key: 'subject', label: 'Subject', type: 'text', format: formatText },
    { key: 'message', label: 'Message', type: 'text', format: formatText },
    // Note: NO vessel fields (mv, dwt, etc.), NO ETA, NO ports
    // Just the subject and message
  ],
}

/**
 * Get schema for a service type slug
 * Falls back to empty array if service type not found
 */
export const getSchemaForService = (serviceSlug: string): InquiryFieldSchema[] => {
  return SERVICE_SCHEMAS[serviceSlug] || []
}

/**
 * Helper to get service slug from inquiry object
 */
export const getServiceSlugFromInquiry = (inquiry: { 
  serviceType?: { name?: string; displayName?: string } 
}): string | undefined => {
  const serviceName = inquiry.serviceType?.name?.toLowerCase() || ''
  
  if (serviceName.includes('shipping') || serviceName.includes('agency')) return 'shipping-agency'
  if (serviceName.includes('charter')) return 'chartering'
  if (serviceName.includes('freight')) return 'freight-forwarding'
  if (serviceName.includes('logistic')) return 'total-logistic'
  if (serviceName.includes('special')) return 'special-request'
  
  return undefined // No default fallback
}

/**
 * Extract field value from inquiry object using dot notation key
 */
export const getFieldValue = (inquiry: any, key: string): any => {
  if (!inquiry) return undefined
  
  if (key === 'cargoQuantity') {
    const qty = inquiry.cargoQuantity ?? inquiry.quantityTons
    if (qty !== undefined && qty !== null && qty !== '') return qty
  }

  // Simple property access
  if (key in inquiry) {
    return inquiry[key]
  }
  
  // Check in details JSON if exists
  if (inquiry.details) {
    try {
      const details = typeof inquiry.details === 'string' 
        ? JSON.parse(inquiry.details) 
        : inquiry.details
      
      if (key in details) {
        return details[key]
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
  
  return undefined
}
