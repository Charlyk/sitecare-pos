// Tests for i18n bilingual completeness — U8 (AUTH-01)
// Verifies all login_ keys in 'ro' also exist in 'en', and count >= 35.

import { I18N } from '../i18n.jsx'

describe('U8 — i18n bilingual completeness for login_ keys (AUTH-01)', () => {
  test('all login_ keys present in ro also exist in en (no missing translations)', () => {
    const roLoginKeys = Object.keys(I18N.ro).filter((k) => k.startsWith('login_'))
    const enKeys = Object.keys(I18N.en)

    const missingInEn = roLoginKeys.filter((k) => !enKeys.includes(k))
    expect(missingInEn).toEqual([])
  })

  test('all login_ keys present in en also exist in ro (no extra en-only keys)', () => {
    const enLoginKeys = Object.keys(I18N.en).filter((k) => k.startsWith('login_'))
    const roKeys = Object.keys(I18N.ro)

    const missingInRo = enLoginKeys.filter((k) => !roKeys.includes(k))
    expect(missingInRo).toEqual([])
  })

  test('login_ key count in ro is >= 35', () => {
    const roLoginKeys = Object.keys(I18N.ro).filter((k) => k.startsWith('login_'))
    expect(roLoginKeys.length).toBeGreaterThanOrEqual(35)
  })

  test('login_ key count in en is >= 35', () => {
    const enLoginKeys = Object.keys(I18N.en).filter((k) => k.startsWith('login_'))
    expect(enLoginKeys.length).toBeGreaterThanOrEqual(35)
  })

  test('critical login_ keys have non-empty string values in both languages', () => {
    const criticalKeys = [
      'login_title',
      'login_email_label',
      'login_pass_label',
      'login_btn_idle',
      'login_btn_busy',
      'login_err_creds',
      'login_err_email',
      'login_sso',
      'login_remember',
      'login_forgot',
    ]

    for (const key of criticalKeys) {
      expect(typeof I18N.ro[key]).toBe('string')
      expect(I18N.ro[key].length).toBeGreaterThan(0)
      expect(typeof I18N.en[key]).toBe('string')
      expect(I18N.en[key].length).toBeGreaterThan(0)
    }
  })
})

// ── U13: offline_ i18n keys (OFF-01) ────────────────────────────────────────

describe('U13 — i18n bilingual completeness for offline_ keys (OFF-01)', () => {
  test('all offline_ keys in ro also exist in en', () => {
    const roOfflineKeys = Object.keys(I18N.ro).filter((k) => k.startsWith('offline_'))
    const enKeys = Object.keys(I18N.en)
    const missingInEn = roOfflineKeys.filter((k) => !enKeys.includes(k))
    expect(missingInEn).toEqual([])
  })

  test('all offline_ keys in en also exist in ro', () => {
    const enOfflineKeys = Object.keys(I18N.en).filter((k) => k.startsWith('offline_'))
    const roKeys = Object.keys(I18N.ro)
    const missingInRo = enOfflineKeys.filter((k) => !roKeys.includes(k))
    expect(missingInRo).toEqual([])
  })

  test('offline_banner_title has non-empty string in ro and en', () => {
    expect(typeof I18N.ro.offline_banner_title).toBe('string')
    expect(I18N.ro.offline_banner_title.length).toBeGreaterThan(0)
    expect(typeof I18N.en.offline_banner_title).toBe('string')
    expect(I18N.en.offline_banner_title.length).toBeGreaterThan(0)
  })

  test('offline_banner_sub has non-empty string in ro and en', () => {
    expect(typeof I18N.ro.offline_banner_sub).toBe('string')
    expect(I18N.ro.offline_banner_sub.length).toBeGreaterThan(0)
    expect(typeof I18N.en.offline_banner_sub).toBe('string')
    expect(I18N.en.offline_banner_sub.length).toBeGreaterThan(0)
  })
})
