/**
 * Unit tests for Server & Client Validation Logic
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidName,
  isValidEmail,
  isValidPhone,
  isValidService,
  isValidLocation,
  isValidDetails,
  validateFileMetadata,
  validateContactSubmission,
  validateEnquirySubmission,
  sanitizeString,
} from '../server/validation.js'

test('isValidName validation', async (t) => {
  await t.test('accepts valid standard and international names', () => {
    assert.equal(isValidName('John Doe'), true)
    assert.equal(isValidName('Mary-Jane Watson'), true)
    assert.equal(isValidName("O'Connor"), true)
    assert.equal(isValidName('Tama Rātā'), true) // Māori macron
    assert.equal(isValidName('Dr. Sarah Smith'), true)
  })

  await t.test('rejects empty, short, or invalid names', () => {
    assert.equal(isValidName(''), false)
    assert.equal(isValidName(' '), false)
    assert.equal(isValidName('A'), false) // < 2 chars
    assert.equal(isValidName('12345'), false) // no letters
    assert.equal(isValidName('<script>'), false) // html tags
    assert.equal(isValidName('a'.repeat(101)), false) // > 100 chars
  })
})

test('isValidEmail validation', async (t) => {
  await t.test('accepts valid email addresses', () => {
    assert.equal(isValidEmail('user@example.com'), true)
    assert.equal(isValidEmail('user.name@domain.co.nz'), true)
    assert.equal(isValidEmail('contact+quotes@aucklandroofprofessionals.nz'), true)
  })

  await t.test('rejects invalid email formats', () => {
    assert.equal(isValidEmail(''), false)
    assert.equal(isValidEmail('invalid'), false)
    assert.equal(isValidEmail('invalid@'), false)
    assert.equal(isValidEmail('@domain.com'), false)
    assert.equal(isValidEmail('user@domain'), false) // missing TLD
    assert.equal(isValidEmail('user@domain.c'), false) // TLD too short (<2)
    assert.equal(isValidEmail('user@domain..com'), false)
    assert.equal(isValidEmail('a'.repeat(250) + '@example.com'), false) // > 254 chars
  })
})

test('isValidPhone validation', async (t) => {
  await t.test('accepts valid NZ and international phone numbers', () => {
    assert.equal(isValidPhone('021 123 4567'), true) // mobile
    assert.equal(isValidPhone('09 555 1234'), true) // landline
    assert.equal(isValidPhone('(09) 555-1234'), true)
    assert.equal(isValidPhone('0800 555 766'), true) // toll free
    assert.equal(isValidPhone('+64 21 123 4567'), true) // international format
    assert.equal(isValidPhone('+1 555 234 5678'), true)
  })

  await t.test('rejects invalid or dummy phone numbers', () => {
    assert.equal(isValidPhone(''), false)
    assert.equal(isValidPhone('12345'), false) // too short (< 7 digits)
    assert.equal(isValidPhone('phone-number'), false) // letters
    assert.equal(isValidPhone('00000000'), false) // repetitive dummy
    assert.equal(isValidPhone('111111111'), false) // repetitive dummy
    assert.equal(isValidPhone('12345678'), false) // sequential dummy
  })
})

test('isValidService validation', async (t) => {
  await t.test('accepts valid catalog services', () => {
    assert.equal(isValidService('Metal Roofs & Cladding'), true)
    assert.equal(isValidService('Membrane Roofing (Commercial)'), true)
    assert.equal(isValidService('Asphalt Shingles'), true)
    assert.equal(isValidService('Other / Not sure'), true)
  })

  await t.test('rejects unrecognised services', () => {
    assert.equal(isValidService(''), false)
    assert.equal(isValidService('Plumbing Services'), false)
    assert.equal(isValidService('Random Text'), false)
  })
})

test('isValidLocation validation', async (t) => {
  await t.test('accepts valid suburb / location', () => {
    assert.equal(isValidLocation('Takapuna, Auckland'), true)
    assert.equal(isValidLocation('59 Porana Rd, Glenfield'), true)
  })

  await t.test('rejects empty or malicious locations', () => {
    assert.equal(isValidLocation(''), false)
    assert.equal(isValidLocation('A'), false)
    assert.equal(isValidLocation('<script>alert(1)</script>'), false)
  })
})

test('isValidDetails validation', async (t) => {
  await t.test('accepts valid message lengths', () => {
    assert.equal(isValidDetails('Need assessment for roof leak after heavy rain.'), true)
  })

  await t.test('rejects too short or too long descriptions', () => {
    assert.equal(isValidDetails('Short'), false) // < 10 chars
    assert.equal(isValidDetails('a'.repeat(2001)), false) // > 2000 chars
  })
})

test('validateFileMetadata validation', async (t) => {
  await t.test('accepts valid images under 4MB', () => {
    const file = { name: 'roof-damage.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' }
    assert.equal(validateFileMetadata(file), null)
  })

  await t.test('rejects unsupported extensions or mime types', () => {
    const pdf = { name: 'contract.pdf', size: 1024, type: 'application/pdf' }
    const err = validateFileMetadata(pdf)
    assert.match(err, /unsupported format/)
  })

  await t.test('rejects files larger than 4MB', () => {
    const large = { name: 'large-photo.png', size: 5 * 1024 * 1024, type: 'image/png' }
    const err = validateFileMetadata(large)
    assert.match(err, /exceeds the 4 MB limit/)
  })
})

test('validateContactSubmission payload validation', async (t) => {
  await t.test('validates and sanitizes a complete valid submission', () => {
    const res = validateContactSubmission({
      fullName: '  Jane Doe  ',
      email: 'Jane.Doe@example.co.nz',
      phone: '021 555 7890',
      service: 'Metal Roofs & Cladding',
      message: 'Looking for a complete reroof quote for our commercial premises.',
    })

    assert.equal(res.isValid, true)
    assert.equal(res.sanitized.fullName, 'Jane Doe')
    assert.equal(res.sanitized.email, 'jane.doe@example.co.nz')
    assert.equal(res.sanitized.service, 'Metal Roofs & Cladding')
  })

  await t.test('catches missing and invalid fields simultaneously', () => {
    const res = validateContactSubmission({
      fullName: '1',
      email: 'not-an-email',
      phone: 'badphone',
      service: '',
      message: 'short',
    })

    assert.equal(res.isValid, false)
    assert.ok(res.errors.fullName)
    assert.ok(res.errors.email)
    assert.ok(res.errors.phone)
    assert.ok(res.errors.service)
    assert.ok(res.errors.message)
  })

  await t.test('identifies honeypot bots', () => {
    const res = validateContactSubmission({
      fullName: 'Bot User',
      email: 'bot@spam.com',
      service: 'Metal Roofs & Cladding',
      message: 'Buy cheap goods here...',
      _hp: 'gotcha',
    })

    assert.equal(res.isValid, false)
    assert.equal(res.isBot, true)
  })
})

test('validateEnquirySubmission payload validation', async (t) => {
  await t.test('validates a complete multi-step enquiry with files', () => {
    const res = validateEnquirySubmission(
      {
        property: 'home',
        service: 'Asphalt Shingles',
        location: 'Grey Lynn, Auckland',
        timeframe: 'As soon as possible',
        details: 'Replacing damaged asphalt shingles on second-storey roof.',
        name: 'David Miller',
        email: 'david@miller.co.nz',
        phone: '022 345 6789',
        contactMethod: 'Phone',
      },
      [
        { name: 'roof1.jpg', size: 1024 * 500, type: 'image/jpeg' },
        { name: 'roof2.png', size: 1024 * 800, type: 'image/png' },
      ]
    )

    assert.equal(res.isValid, true)
    assert.equal(res.sanitized.name, 'David Miller')
    assert.equal(res.sanitized.filesCount, 2)
  })

  await t.test('rejects if required fields are missing', () => {
    const res = validateEnquirySubmission({})
    assert.equal(res.isValid, false)
    assert.ok(res.errors.service)
    assert.ok(res.errors.location)
    assert.ok(res.errors.details)
    assert.ok(res.errors.name)
    assert.ok(res.errors.email)
    assert.ok(res.errors.phone)
  })
})

test('sanitizeString helper', async (t) => {
  await t.test('escapes HTML tags and removes dangerous characters', () => {
    const clean = sanitizeString('<script>alert("xss")</script>')
    assert.equal(clean, '&lt;script&gt;alert("xss")&lt;/script&gt;')
  })
})
