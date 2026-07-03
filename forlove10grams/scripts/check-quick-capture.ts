import assert from 'node:assert/strict'
import {
  formatQuickCaptureTitle,
  isQuickCaptureMode,
  pageTypeForQuickCaptureMode,
} from '../lib/quick-capture.ts'

assert.equal(isQuickCaptureMode('photo'), true)
assert.equal(isQuickCaptureMode('video'), true)
assert.equal(isQuickCaptureMode('text'), true)
assert.equal(isQuickCaptureMode('audio'), false)
assert.equal(isQuickCaptureMode(undefined), false)

assert.equal(pageTypeForQuickCaptureMode('photo'), 'carousel')
assert.equal(pageTypeForQuickCaptureMode('video'), 'video')
assert.equal(pageTypeForQuickCaptureMode('text'), 'carousel')

assert.equal(
  formatQuickCaptureTitle(new Date('2026-06-19T06:30:00.000Z')),
  '快速記錄 2026/06/19 14:30',
)

console.log('quick capture helper checks passed')
