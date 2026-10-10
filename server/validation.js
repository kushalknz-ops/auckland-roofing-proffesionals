/**
 * Server-side Validation & Sanitization Engine
 * Auckland Roof Professionals
 */

// Recognised roofing services
export const VALID_SERVICES = [
  'Metal Roofs & Cladding',
  'Membrane Roofing (Commercial)',
  'Warm Roof Systems (Commercial)',
  'Roof Safety Systems',
  'Asset Maintenance',
  'Asphalt Shingles',
  'Metal Roofs (Residential)',
  'Membrane Roofing (Residential)',
  'Warm Roof Systems (Residential)',
  // Short titles without audience suffix
  'Membrane Roofing',
  'Warm Roof Systems',
  'Metal Roofs',
  'Other / Not sure',
]

export const VALID_PROPERTY_TYPES = ['home', 'business', 'portfolio', 'other']

export const VALID_TIMEFRAMES = [
  'Not sure yet',
  'As soon as possible',
  'Within 1–3 months',
  'Within 1-3 months',
  'Within 3–6 months',
  'Within 3-6 months',
  'Planning ahead',
]

export const VALID_CONTACT_METHODS = ['Email', 'Phone', 'Text message']

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
export const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
export const MAX_FILE_COUNT = 3

/**
 * Sanitizes input strings: trims, strips control characters, and escapes dangerous HTML characters
 */
export function sanitizeString(val) {
  if (typeof val !== 'string') return ''
  let clean = ''
  for (let i = 0; i < val.length; i++) {
    const code = val.charCodeAt(i)
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      clean += val[i]
    }
  }
  return clean
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Validates full name:
 * - Must be 2-100 characters
 * - Supports Unicode letters (including NZ Māori macrons: ā, ē, ī, ō, ū), spaces, apostrophes, hyphens, dots
 * - Must have at least 2 letter characters
 */
export function isValidName(name) {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 100) return false

  // Disallow angle brackets or script-like patterns
  if (/[<>{}[\]\\]/.test(trimmed)) return false

  // Regex matching letters, marks, spaces, hyphens, apostrophes, periods
  const nameRegex = /^[\p{L}\p{M}'’\s.-]+$/u
  if (!nameRegex.test(trimmed)) return false

  const letters = trimmed.match(/[\p{L}\p{M}]/gu) || []
  return letters.length >= 2
}

/**
 * Validates email address according to RFC 5322 standard constraints
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const trimmed = email.trim()
  if (!trimmed || trimmed.length > 254) return false

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(trimmed)) return false

  const parts = trimmed.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (local.length > 64) return false

  const domainParts = domain.split('.')
  const tld = domainParts[domainParts.length - 1]
  if (tld.length < 2 || /^\d+$/.test(tld)) return false

  return true
}

/**
 * Validates phone numbers (NZ landlines/mobiles/toll-free or international)
 * - Digits between 7 and 15
 * - Allows leading +, spaces, hyphens, parens
 * - Rejects dummy sequential/repetitive numbers
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false
  const trimmed = phone.trim()
  if (!trimmed) return false

  if (!/^\+?[0-9\s\-().]{7,20}$/.test(trimmed)) return false

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return false

  // Reject all identical digits (e.g. 00000000, 11111111)
  if (/^(\d)\1+$/.test(digits)) return false

  // Reject dummy sequential numbers
  if ('0123456789012345'.includes(digits) || '9876543210987654'.includes(digits)) {
    return false
  }

  return true
}

/**
 * Validates service selection against allowed options
 */
export function isValidService(service) {
  if (typeof service !== 'string') return false
  const trimmed = service.trim()
  if (!trimmed) return false
  return VALID_SERVICES.includes(trimmed)
}

/**
 * Validates suburb / location
 */
export function isValidLocation(location) {
  if (typeof location !== 'string') return false
  const trimmed = location.trim()
  if (trimmed.length < 2 || trimmed.length > 120) return false
  if (/[<>{}[\]\\]/.test(trimmed)) return false
  return true
}

/**
 * Validates project description or contact message
 */
export function isValidDetails(details, min = 10, max = 2000) {
  if (typeof details !== 'string') return false
  const trimmed = details.trim()
  if (trimmed.length < min || trimmed.length > max) return false
  return true
}

/**
 * Validates an uploaded file object or file metadata
 */
export function validateFileMetadata(file) {
  if (!file) return 'File data is missing.'
  const name = file.name || 'uploaded_file'
  const ext = (name.slice(name.lastIndexOf('.')) || '').toLowerCase()

  if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
    return `"${name}" has an unsupported format. Please upload JPG, PNG, or WebP images.`
  }
  if (ext && !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return `"${name}" has an unsupported extension (${ext}). Please upload JPG, PNG, or WebP images.`
  }
  if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return `"${name}" is ${sizeMb} MB (exceeds the 4 MB limit per photo).`
  }
  return null
}

/**
 * Validates contact form submission
 */
export function validateContactSubmission(body) {
  const errors = {}

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: { _form: 'Invalid request payload.' },
      sanitized: null,
    }
  }

  // Honeypot check: bots fill hidden fields
  if (body._hp || body.website) {
    return {
      isValid: false,
      isBot: true,
      errors: {},
      sanitized: null,
    }
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const service = typeof body.service === 'string' ? body.service.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  // Full Name
  if (!fullName) {
    errors.fullName = 'Please enter your full name.'
  } else if (!isValidName(fullName)) {
    errors.fullName = 'Please enter a valid full name (letters, spaces, and hyphens only, 2-100 characters).'
  }

  // Email
  if (!email) {
    errors.email = 'Please enter your email address.'
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address (e.g. name@example.co.nz).'
  }

  // Phone (optional on contact page, but if provided must be valid)
  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone number (minimum 7 digits, e.g. 021 123 4567 or 09 555 1234).'
  }

  // Service
  if (!service) {
    errors.service = 'Please select a roofing service.'
  } else if (!isValidService(service)) {
    errors.service = 'Please select a valid service from the options provided.'
  }

  // Message
  if (!message) {
    errors.message = 'Please enter your message.'
  } else if (message.length < 10) {
    errors.message = 'Please provide a little more detail in your message (at least 10 characters).'
  } else if (message.length > 2000) {
    errors.message = 'Message must not exceed 2,000 characters.'
  }

  const isValid = Object.keys(errors).length === 0
  const sanitized = isValid
    ? {
        fullName: sanitizeString(fullName),
        email: email.toLowerCase(),
        phone: phone ? sanitizeString(phone) : '',
        service: sanitizeString(service),
        message: sanitizeString(message),
      }
    : null

  return { isValid, errors, sanitized }
}

/**
 * Validates roofing enquiry submission (from Quote modal & multi-step wizard)
 */
export function validateEnquirySubmission(body, files = []) {
  const errors = {}

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: { _form: 'Invalid request payload.' },
      sanitized: null,
    }
  }

  // Honeypot check
  if (body._hp || body.website) {
    return {
      isValid: false,
      isBot: true,
      errors: {},
      sanitized: null,
    }
  }

  const property = typeof body.property === 'string' ? body.property.trim() : ''
  const service = typeof body.service === 'string' ? body.service.trim() : ''
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  const timeframe = typeof body.timeframe === 'string' ? body.timeframe.trim() : ''
  const details = typeof body.details === 'string' ? body.details.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const contactMethod = typeof body.contactMethod === 'string' ? body.contactMethod.trim() : 'Email'

  // Property
  if (property && !VALID_PROPERTY_TYPES.includes(property)) {
    errors.property = 'Please choose a valid property type.'
  }

  // Service
  if (!service) {
    errors.service = 'Choose the work you need help with.'
  } else if (!isValidService(service)) {
    errors.service = 'Please select a valid roofing service.'
  }

  // Location
  if (!location) {
    errors.location = 'Enter the property suburb or location in Auckland.'
  } else if (!isValidLocation(location)) {
    errors.location = 'Please enter a valid suburb or address (between 2 and 120 characters).'
  }

  // Timeframe
  if (timeframe && !VALID_TIMEFRAMES.includes(timeframe)) {
    errors.timeframe = 'Please select a valid timeframe.'
  }

  // Details
  if (!details) {
    errors.details = 'Add a short description of the work.'
  } else if (details.length < 10) {
    errors.details = 'Add a short description of the work (at least 10 characters).'
  } else if (details.length > 2000) {
    errors.details = 'Project details must not exceed 2,000 characters.'
  }

  // Name
  if (!name) {
    errors.name = 'Enter your name.'
  } else if (!isValidName(name)) {
    errors.name = 'Please enter a valid name (at least 2 letters).'
  }

  // Email
  if (!email) {
    errors.email = 'Enter a valid email address.'
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address (e.g. name@example.co.nz).'
  }

  // Phone (required in enquiry form)
  if (!phone) {
    errors.phone = 'Enter your phone number.'
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone number (e.g. 021 000 0000 or 09 555 1234).'
  }

  // Contact Method
  if (contactMethod && !VALID_CONTACT_METHODS.includes(contactMethod)) {
    errors.contactMethod = 'Please choose a valid contact method.'
  }

  // Files validation
  const safeFiles = Array.isArray(files) ? files : []
  if (safeFiles.length > MAX_FILE_COUNT) {
    errors.files = `You can upload up to ${MAX_FILE_COUNT} photos only.`
  } else {
    for (const f of safeFiles) {
      const fileErr = validateFileMetadata(f)
      if (fileErr) {
        errors.files = fileErr
        break
      }
    }
  }

  const isValid = Object.keys(errors).length === 0
  const sanitized = isValid
    ? {
        property: property || 'home',
        service: sanitizeString(service),
        location: sanitizeString(location),
        timeframe: timeframe || 'Not sure yet',
        details: sanitizeString(details),
        name: sanitizeString(name),
        email: email.toLowerCase(),
        phone: sanitizeString(phone),
        contactMethod: contactMethod || 'Email',
        filesCount: safeFiles.length,
      }
    : null

  return { isValid, errors, sanitized }
}
