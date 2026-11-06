/* Встраивание в Practice Engine AI edu: одна строка в src/practice/registry.ts регистрирует работы как практики. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRACTICE_WORKS, practiceType, registerVirtualLabPractices } from '../src/virtual-labs/practice/register'

describe('registerVirtualLabPractices', () => {
  it('регистрирует по одной практике на работу с редактором и проверкой AI edu', () => {
    const plugins: { type: string; version: string; StudentRuntime: unknown; ConfigEditor: unknown; validateConfig: unknown; initialConfig: unknown }[] = []
    const ConfigEditor = () => null
    const initialConfig = () => ({ instructions: '' })
    const validateConfig = () => null
    const n = registerVirtualLabPractices({ registerPractice: p => { plugins.push(p) }, ConfigEditor, initialConfig, validateConfig })
    expect(n).toBe(PRACTICE_WORKS.length)
    expect(plugins.map(p => p.type)).toEqual(PRACTICE_WORKS.map(practiceType))
    expect(new Set(plugins.map(p => p.type)).size).toBe(plugins.length)
    for (const p of plugins) {
      expect(p.ConfigEditor).toBe(ConfigEditor)
      expect(p.initialConfig).toBe(initialConfig)
      expect(p.validateConfig).toBe(validateConfig)
      expect(typeof p.StudentRuntime).toBe('function')
    }
  })

  it('типы практик совпадают с теми, что регистрирует сервер', () => {
    const conf = readFileSync(join(__dirname, '../../backend/apps/virtual_labs/lab_settings.py'), 'utf8')
    const line = /'PRACTICE_WORKS':\s*\(([^)]*)\)/.exec(conf)
    expect(line).not.toBeNull()
    expect([...line![1].matchAll(/'(vw\d+)'/g)].map(m => m[1])).toEqual(PRACTICE_WORKS)
    expect(readFileSync(join(__dirname, '../../backend/apps/virtual_labs/practice.py'), 'utf8')).toContain("f'virtual_lab_{code}'")
  })
})
