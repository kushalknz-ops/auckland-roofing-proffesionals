/**
 * Client-side Form Validation Engine
 * Auckland Roof Professionals
 */

import { SERVICE_OPTION_GROUPS, OTHER_OPTION } from '../data/service-options'

// Flatten valid service list from definitions
export const ALL_VALID_SERVICES: string[] = [
  ...SERVICE_OPTION_GROUPS.flatMap((g) => g.options),
  OTHER_OPTION,
  'Membrane Roofing',
  'Warm Roof Systems',
  'Metal Roofs',
]

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB
export const MAX_FILES_ALLOWED = 3

export interface ContactFormData {
  fullName: string
  email: string
  phone: string
  service: string
  message: string
  _hp?: string
}

export type ContactFormErrors = Partial<Record<keyof ContactFormData | '_form', string>>

export interface RoofingEnquiryData {
  property: string
  service: string
  location: string
  timeframe: string
  details: string
  name: string
  email: string
  phone: string
  contactMethod: string
  files: File[]
  _hp?: string
}

export type RoofingEnquiryErrors = Partial<
  Record<
    | 'property'
    | 'service'
    | 'location'
    | 'timeframe'
    | 'details'
    | 'name'
    | 'email'
    | 'phone'
    | 'contactMethod'
    | 'files'
    | '_form',
    string
  >
>

/**
 * Validates a full name or contact name
 */
export function validateName(name: string, label = 'Full name'): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return `Please enter your ${label.toLowerCase()}.`
  }
  if (trimmed.length < 2) {
    return `${label} must be at least 2 characters.`
  }
  if (trimmed.length > 100) {
    return `${label} must not exceed 100 characters.`
  }
  // Allow letters (including Māori macrons), spaces, hyphens, apostrophes, periods
  const nameRegex = /^[\p{L}\p{M}'’\s.-]+$/u
  if (!nameRegex.test(trimmed)) {
    return `${label} can only contain letters, spaces, hyphens, and apostrophes.`
  }
  const letters = trimmed.match(/[\p{L}\p{M}]/gu) || []
  if (letters.length < 2) {
    return `${label} must include at least 2 letters.`
  }
  return null
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) {
    return 'Please enter your email address.'
  }
  if (trimmed.length > 254) {
    return 'Email address is too long (maximum 254 characters).'
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@example.co.nz).'
  }
  const parts = trimmed.split('@')
  if (parts.length !== 2) return 'Please enter a valid email address.'
  const domainParts = parts[1].split('.')
  const tld = domainParts[domainParts.length - 1]
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return 'Please enter an email with a valid domain (e.g. .co.nz or .com).'
  }
  return null
}

/**
 * Validates a phone number (NZ standard formats, mobiles, landlines, 0800, or international)
 */
export function validatePhone(phone: string, required = false): string | null {
  const trimmed = phone.trim()
  if (!trimmed) {
    return required ? 'Please enter your contact phone number.' : null
  }
  if (!/^\+?[0-9\s\-().]{7,20}$/.test(trimmed)) {
    return 'Please enter a valid phone number (e.g. 021 123 4567 or 09 555 1234).'
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) {
    return 'Phone number must be between 7 and 15 digits.'
  }
  if (/^(\d)\1+$/.test(digits)) {
    return 'Please enter a genuine phone number.'
  }
  if ('0123456789012345'.includes(digits) || '9876543210987654'.includes(digits)) {
    return 'Please enter a genuine phone number.'
  }
  return null
}

/**
 * Validates service selection
 */
export function validateService(service: string): string | null {
  const trimmed = service.trim()
  if (!trimmed) {
    return 'Please select a roofing service.'
  }
  if (!ALL_VALID_SERVICES.includes(trimmed)) {
    return 'Please select a valid service from the list.'
  }
  return null
}

/**
 * Validates Auckland suburb or address location
 */
export function validateLocation(location: string): string | null {
  const trimmed = location.trim()
  if (!trimmed) {
    return 'Please enter the property suburb or location.'
  }
  if (trimmed.length < 2) {
    return 'Location must be at least 2 characters.'
  }
  if (trimmed.length > 120) {
    return 'Location must not exceed 120 characters.'
  }
  if (/[<>{}[\]\\]/.test(trimmed)) {
    return 'Location contains invalid characters.'
  }
  return null
}

/**
 * Validates message or project details
 */
export function validateDetails(
  details: string,
  min = 10,
  max = 2000,
  label = 'Message'
): string | null {
  const trimmed = details.trim()
  if (!trimmed) {
    return `Please enter your ${label.toLowerCase()}.`
  }
  if (trimmed.length < min) {
    return `${label} must be at least ${min} characters. Please provide a little more detail.`
  }
  if (trimmed.length > max) {
    return `${label} must not exceed ${max.toLocaleString()} characters.`
  }
  return null
}

/**
 * Validates a single file before upload
 */
export function validateSingleFile(file: File): string | null {
  if (!file) return 'File not found.'

  const ext = (file.name.slice(file.name.lastIndexOf('.')) || '').toLowerCase()
  const isTypeAllowed = file.type ? ALLOWED_FILE_TYPES.includes(file.type) : false
  const isExtAllowed = ALLOWED_FILE_EXTENSIONS.includes(ext)

  if (!isTypeAllowed && !isExtAllowed) {
    return `"${file.name}" has an unsupported format. Please upload JPG, PNG, or WebP only.`
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return `"${file.name}" is ${sizeMb} MB (exceeds the 4 MB limit).`
  }

  return null
}

/**
 * Validates an array of selected files
 */
export function validateFileList(
  files: File[],
  maxCount = MAX_FILES_ALLOWED
): { valid: File[]; error: string | null } {
  if (files.length > maxCount) {
    return {
      valid: files.slice(0, maxCount),
      error: `You can upload up to ${maxCount} photos only. Additional photos were excluded.`,
    }
  }

  for (const f of files) {
    const err = validateSingleFile(f)
    if (err) {
      return { valid: files, error: err }
    }
  }

  return { valid: files, error: null }
}

/**
 * Full validator for the Contact Page form
 */
export function validateContactForm(data: ContactFormData): {
  isValid: boolean
  errors: ContactFormErrors
} {
  const errors: ContactFormErrors = {}

  const nameError = validateName(data.fullName, 'Full name')
  if (nameError) errors.fullName = nameError

  const emailError = validateEmail(data.email)
  if (emailError) errors.email = emailError

  const phoneError = validatePhone(data.phone, false)
  if (phoneError) errors.phone = phoneError

  const serviceError = validateService(data.service)
  if (serviceError) errors.service = serviceError

  const messageError = validateDetails(data.message, 10, 2000, 'Your message')
  if (messageError) errors.message = messageError

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validator for Step 2 of the Roofing Enquiry multi-step form
 */
export function validateEnquiryStep2(data: {
  service: string
  location: string
  details: string
}): {
  isValid: boolean
  errors: Partial<Record<'service' | 'location' | 'details', string>>
} {
  const errors: Partial<Record<'service' | 'location' | 'details', string>> = {}

  const serviceError = validateService(data.service)
  if (serviceError) errors.service = serviceError

  const locationError = validateLocation(data.location)
  if (locationError) errors.location = locationError

  const detailsError = validateDetails(data.details, 10, 2000, 'Work details')
  if (detailsError) errors.details = detailsError

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validator for Step 3 of the Roofing Enquiry multi-step form
 */
export function validateEnquiryStep3(data: {
  name: string
  email: string
  phone: string
}): {
  isValid: boolean
  errors: Partial<Record<'name' | 'email' | 'phone', string>>
} {
  const errors: Partial<Record<'name' | 'email' | 'phone', string>> = {}

  const nameError = validateName(data.name, 'Name')
  if (nameError) errors.name = nameError

  const emailError = validateEmail(data.email)
  if (emailError) errors.email = emailError

  const phoneError = validatePhone(data.phone, true)
  if (phoneError) errors.phone = phoneError

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
