/* Казахский и английский интерфейс: словари полные, подстановки {…} совпадают, составные тексты переводятся. */
import { describe, expect, it } from 'vitest'
import kz from '../src/virtual-labs/locales/kz.json'
import en from '../src/virtual-labs/locales/en.json'
import { workStrings } from '../src/virtual-labs/core/strings-export'
import { format, normalizeLocale, translate, type T } from '../src/virtual-labs/i18n'
import { localize } from '../src/virtual-labs/localize'

const dicts: Record<string, Record<string, string>> = { kz, en }
const placeholders = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join()
const makeT = (locale: 'ru' | 'kz' | 'en'): T => {
  const t = ((key: string, values?: Record<string, string | number>) => format(translate(locale, key), values)) as T
  t.locale = locale
  return t
}

describe('словари kz и en', () => {
  it('описания всех 14 работ переведены', () => {
    for (const lang of ['kz', 'en']) {
      const missing = workStrings().filter(s => !dicts[lang][s])
      expect(missing, lang).toEqual([])
    }
  })

  it('подстановки {…} в переводе те же, что в ключе', () => {
    for (const lang of ['kz', 'en']) {
      const bad = Object.entries(dicts[lang]).filter(([k, v]) => placeholders(k) !== placeholders(v)).map(([k]) => k)
      expect(bad, lang).toEqual([])
    }
  })

  it('словари не содержат пустых переводов', () => {
    for (const lang of ['kz', 'en']) expect(Object.entries(dicts[lang]).filter(([, v]) => !String(v).trim()), lang).toEqual([])
  })

  it('язык платформы AI edu понимается в обоих написаниях', () => {
    expect(normalizeLocale('kk')).toBe('kz')
    expect(normalizeLocale('kz')).toBe('kz')
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale(undefined)).toBe('ru')
  })

  it('без перевода строка ищется в словаре платформы, затем остаётся русской', () => {
    expect(translate('en', 'Строка, которой нет', key => key === 'Строка, которой нет' ? 'From host' : key)).toBe('From host')
    expect(translate('en', 'Строка, которой нет')).toBe('Строка, которой нет')
    expect(translate('kz', 'Портфолио')).toBe(kz['Портфолио'])
  })
})

describe('перевод комментариев экспертизы и рекомендаций', () => {
  it('шаблон с числами', () => {
    expect(localize(makeT('en'), 'Объём: 501 слов (ожидается от 600).')).toBe('Length: 501 words (at least 600 expected).')
    expect(localize(makeT('kz'), 'Средняя длина предложения: 10.9 слов.')).toBe('Сөйлемнің орташа ұзындығы: 10.9 сөз.')
  })

  it('шаблон со списком переводит каждый элемент', () => {
    expect(localize(makeT('en'), 'Отсутствуют разделы: План, Выводы.')).toBe('Missing sections: Plan, Conclusions.')
    expect(localize(makeT('en'), 'Есть: вопросы, задания, примеры.')).toBe('Present: questions, tasks, examples.')
  })

  it('по-русски текст не меняется, неизвестный текст возвращается как есть', () => {
    expect(localize(makeT('ru'), 'Объём: 501 слов (ожидается от 600).')).toBe('Объём: 501 слов (ожидается от 600).')
    expect(localize(makeT('en'), 'Совсем новый текст сервера')).toBe('Совсем новый текст сервера')
  })

  it('ошибки сервера переводятся', () => {
    expect(translate('kz', 'Файл не найден')).toBe('Файл табылмады')
    expect(localize(makeT('en'), 'Файл больше 20 МБ.')).toBe('The file is larger than 20 MB.')
  })
})
