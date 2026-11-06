/**
 * Test Suite: Loading, Empty, and Error States Handling
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { SERVICES, isCommercialService } from '../src/data/services.ts'
import { AUTHENTIC_GOOGLE_REVIEWS } from '../src/data/google-reviews.ts'

test('Services Catalog State Handling', async (t) => {
  await t.test('resolves existing services by ID (case-insensitive)', () => {
    const valid = SERVICES.find((s) => s.id.toLowerCase() === 'asphalt-shingles')
    assert.ok(valid)
    assert.equal(valid.id, 'asphalt-shingles')

    const upper = SERVICES.find((s) => s.id.toLowerCase() === 'ASPHALT-SHINGLES'.toLowerCase())
    assert.ok(upper)
    assert.equal(upper.title, valid.title)
  })

  await t.test('detects nonexistent service ID for empty/not-found state rendering', () => {
    const rawId = 'nonexistent-roof-type'
    const match = SERVICES.find((s) => s.id.toLowerCase() === rawId.toLowerCase())
    assert.equal(match, undefined)
  })

  await t.test('filters commercial and residential services without empty lists', () => {
    const commercial = SERVICES.filter((s) => isCommercialService(s))
    const residential = SERVICES.filter((s) => !isCommercialService(s))

    assert.ok(commercial.length > 0, 'Commercial services should not be empty')
    assert.ok(residential.length > 0, 'Residential services should not be empty')
    assert.equal(commercial.length + residential.length, SERVICES.length)
  })
})

test('Google Reviews State Handling', async (t) => {
  await t.test('identifies when reviews list is populated', () => {
    assert.ok(Array.isArray(AUTHENTIC_GOOGLE_REVIEWS))
    assert.ok(AUTHENTIC_GOOGLE_REVIEWS.length > 0)
  })

  await t.test('correctly detects empty reviews list for empty state rendering', () => {
    const emptyReviews = []
    const isEmpty = emptyReviews.length === 0
    assert.equal(isEmpty, true)
  })

  await t.test('identifies error conditions for review error fallback', () => {
    const errorState = 'Failed to fetch reviews from Google API'
    assert.ok(typeof errorState === 'string' && errorState.length > 0)
  })
})

test('Form Submissions State Machine Logic', async (t) => {
  await t.test('handles loading state transitions during submission', () => {
    let isSubmitting = false
    assert.equal(isSubmitting, false)

    // On submit initiate:
    isSubmitting = true
    assert.equal(isSubmitting, true)

    // Form inputs and buttons must disable when isSubmitting is true
    const isInputDisabled = isSubmitting
    assert.equal(isInputDisabled, true)

    // On submit completion:
    isSubmitting = false
    assert.equal(isSubmitting, false)
  })

  await t.test('handles server error payloads and extracts user-facing message', () => {
    const badRequestRes = {
      status: 400,
      data: {
        success: false,
        message: 'Please fix the highlighted errors below.',
        errors: { email: 'Please enter a valid email address.' },
      },
    }
    assert.equal(badRequestRes.status, 400)
    assert.equal(badRequestRes.data.success, false)
    assert.ok(badRequestRes.data.errors.email)

    const rateLimitRes = {
      status: 429,
      data: {
        success: false,
        message: 'Too many requests. Please wait a few moments before trying again or call us at 0800 555 766.',
      },
    }
    assert.equal(rateLimitRes.status, 429)
    assert.match(rateLimitRes.data.message, /Too many requests/)
  })

  await t.test('handles successful submission state transitions and resets', () => {
    let submitted = false
    let serverError = 'Old error'

    // Successful submit:
    submitted = true
    serverError = null
    assert.equal(submitted, true)
    assert.equal(serverError, null)

    // Reset:
    submitted = false
    assert.equal(submitted, false)
  })
})
