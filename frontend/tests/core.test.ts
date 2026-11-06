/* Ядро интерфейса совпадает с сервером: те же 31 случай экспертизы и анализа промпта, что в
   backend/apps/virtual_labs/tests/test_core.py, и те же настройки весов критериев. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Evaluation } from '../src/virtual-labs/core/evaluation'
import { PromptEngine } from '../src/virtual-labs/core/promptEngine'
import { Registry } from '../src/virtual-labs/core/registry'
import '../src/virtual-labs/core/works'

const FIXTURES = join(__dirname, '../../backend/apps/virtual_labs/tests')
const read = (name: string) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'))
const cases = read('parity_cases.json')

describe('совпадение с сервером', () => {
  it('экспертиза ставит те же баллы', () => {
    for (const c of cases) {
      const got = Evaluation.evaluate(c.module, c.text, c.inputs)
      expect(got.total, c.module.id).toBe(c.expected.total)
      expect(got.criteria.map(x => x.score)).toEqual(c.expected.criteria.map((x: { score: number }) => x.score))
      expect(got.sections.map(x => x.status)).toEqual(c.expected.sections.map((x: { status: string }) => x.status))
    }
  })

  it('анализ промпта даёт ту же оценку и те же недостающие блоки', () => {
    for (const c of cases) {
      const got = PromptEngine.analyze(c.prompt)
      expect(got.score).toBe(c.expectedPrompt.score)
      expect(got.missing).toEqual(c.expectedPrompt.missing)
    }
  })

  it('веса и отключение критериев считаются так же, как на сервере', () => {
    for (const item of read('weighted_cases.json')) {
      const c = cases[item.case]
      const got = Evaluation.evaluate(c.module, c.text, c.inputs, item.config)
      expect(got.total, `case ${item.case}`).toBe(item.total)
      expect(got.criteria.map(x => x.key)).toEqual(item.criteria)
    }
  })
})

describe('реестр работ', () => {
  it('содержит 14 работ с уникальными кодами и обязательными разделами', () => {
    const list = Registry.list()
    expect(list).toHaveLength(14)
    expect(new Set(list.map(m => m.id)).size).toBe(14)
    for (const m of list) {
      expect(m.sections.length, m.id).toBeGreaterThan(1)
      expect(m.quiz.length, m.id).toBeGreaterThan(0)
    }
  })

  it('каталог сервера описывает те же работы', () => {
    const server = JSON.parse(readFileSync(join(__dirname, '../../backend/apps/virtual_labs/catalog/works.json'), 'utf8'))
    const codes = (Array.isArray(server) ? server : server.works).map((w: { id?: string; code?: string }) => w.code ?? w.id).sort()
    expect(codes).toEqual(Registry.list().map(m => m.id).sort())
  })
})
