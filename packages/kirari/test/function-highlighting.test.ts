import { expect, test } from 'bun:test'
import { tokenize } from '../src/index.js'
import { javascript } from '../src/languages/javascript.js'
import { jsx } from '../src/languages/jsx.js'
import { typescript } from '../src/languages/typescript.js'
import { tsx } from '../src/languages/tsx.js'
import { createTokenStream } from '../src/stream.js'

const cases = [
  ['function declaration', 'function target() {}'],
  ['async declaration', 'async function target() {}'],
  ['generator declaration', 'function* target() {}'],
  ['async generator', 'async function* target() {}'],
  ['comment before parameters', 'function target /* note */ () {}'],
  ['generic declaration', 'function target<T>(value: T): T { return value }'],
  ['anonymous expression binding', 'const target = function () {}'],
  ['named expression binding', 'const target = function inner() {}'],
  ['named expression', 'const value = function target() {}'],
  ['async expression binding', 'const target = async function () {}'],
  ['generator expression binding', 'const target = function* () {}'],
  ['parenthesized expression binding', 'const target = (function () {})'],
  ['empty arrow', 'const target = () => null'],
  ['single-parameter arrow', 'const target = value => value'],
  ['async arrow', 'const target = async (value) => value'],
  ['destructured arrow', 'const target = ({ value }, ...rest) => value'],
  ['nested default arrow', 'const target = (value = make()) => value'],
  ['string default arrow', 'const target = (value = "text") => value'],
  ['regex default arrow', 'const target = (value = /[)]/) => value'],
  ['template default arrow', 'const target = (value = `text ${make()}`) => value'],
  ['multiline arrow', 'const target = (\n value\n) => value'],
  ['commented arrow', 'const target /* name */ = /* init */ (value) /* arrow */ => value'],
  ['typed arrow parameters', 'const target = (value: string) => value'],
  ['arrow return annotation', 'const target = (value: string): string => value'],
  ['generic arrow', 'const target = <T,>(value: T): T => value'],
  ['annotated binding', 'const target: Handler = () => null'],
  ['parenthesized arrow', 'const target = (() => null)'],
  ['object method', 'const obj = { target() {} }'],
  ['object arrow property', 'const obj = { target: () => null }'],
  ['object expression property', 'const obj = { target: function () {} }'],
  ['object generator method', 'const obj = { *target() {} }'],
  ['object generic method', 'const obj = { target<T>(value: T) { return value } }'],
  ['class method', 'class C { target() {} }'],
  ['class generic method', 'class C { target<T>(value: T) { return value } }'],
  ['class async generator', 'class C { async *target() {} }'],
  ['class arrow field', 'class C { target = () => null }'],
  ['class function field', 'class C { target = function () {} }'],
  ['getter', 'class C { get target() { return 1 } }'],
  ['setter', 'class C { set target(value) {} }'],
  ['interface method', 'interface C { target(value: string): void }'],
  ['generic interface method', 'interface C { target<T>(value: T): T }'],
  ['overload signature', 'function target(value: string): string;'],
  ['typed function expression', 'const target = function (): { value: number } { return { value: 1 } }'],
  ['typed class field', 'class C { target: Handler = () => null }'],
  ['typed class field after semicolon', 'class C { value: T; target: Handler = () => null }'],
  ['optional interface method', 'interface C { target?<T>(value: T): T }'],
] as const
const typedOnly = new Set(['generic declaration', 'typed arrow parameters', 'arrow return annotation', 'generic arrow', 'annotated binding', 'object generic method', 'class generic method', 'interface method', 'generic interface method', 'overload signature', 'typed function expression', 'typed class field', 'typed class field after semicolon', 'optional interface method'])
const negatives = [
  ['ordinary value', 'const target = true', 'variable'],
  ['function alias', 'const target = existingFunction', 'variable'],
  ['wrapper result', 'const target = memo(() => null)', 'variable'],
  ['parenthesized value', 'const target = (value)', 'variable'],
  ['arrow IIFE result', 'const target = (() => null)()', 'variable'],
  ['function IIFE result', 'const target = function () {}()', 'variable'],
  ['arrow-looking string', 'const target = "() => null"', 'variable'],
  ['arrow-looking string in grouping', 'const target = ("fake) =>")', 'variable'],
  ['member invocation', 'object.target()', 'property'],
  ['member assignment', 'object.target = () => null', 'property'],
  ['ordinary property', 'const object = { target: value }', 'property'],
  ['comparison', 'target < limit > floor', 'variable'],
  ['ternary branch', 'const value = ready ? target : () => null', 'variable'],
] as const


for (const language of [javascript, jsx, typescript, tsx]) {
  const forms = language === javascript || language === jsx ? cases.filter(([label]) => !typedOnly.has(label)) : cases
  test(`${language.name} recognizes function declarations, expressions, arrows and methods`, () => {
    for (const [label, source] of forms) {
      expect(tokenize(source, language).find(t => t.value === 'target')?.type, label).toBe('function')
    }
  })
  test(`${language.name} preserves value, member and control-flow classifications`, () => {
    for (const [label, source, expected] of negatives) {
      expect(tokenize(source, language).find(t => t.value === 'target')?.type, label).toBe(expected)
    }
    for (const source of ['if (ready) {}', 'while (ready) {}', 'for (;;) {}', 'switch (value) {}', 'function fn() { return (value) }', 'const fn = function () { return (value) }']) {
      expect(tokenize(source, language).filter(t => /^(if|while|for|switch|return)$/.test(t.value)).every(t => t.type === 'keyword')).toBe(true)
    }
    expect(tokenize('const fn = async (value) => value', language).find(t => t.value === 'async')?.type).toBe('keyword')
  })
  test(`${language.name} classifies legal contextual and keyword function names`, () => {
    for (const [source, name] of [
      ['function async() {}', 'async'], ['const obj = { get() {} }', 'get'],
      ['const obj = { return() {} }', 'return'], ['class C { static() {} }', 'static'],
      ['const obj = { true() {} }', 'true'], ['const obj = { if(value) {} }', 'if'],
    ]) {
      expect(tokenize(source!, language).find(t => t.value === name)?.type, source).toBe('function')
    }
  })
  test(`${language.name} keeps function classifications and offsets consistent while streaming`, () => {
    for (const [, source] of [...forms, ...negatives]) {
      const stream = createTokenStream(language)
      let assembled: ReturnType<typeof tokenize> = []
      for (let end = 1; end <= source.length; end++) {
        const patch = stream.write(source[end - 1]!)
        assembled = [...assembled.filter(t => t.start < patch.from), ...patch.tokens]
        expect(assembled, `${source}: prefix ${end}`).toEqual(tokenize(source.slice(0, end), language))
        let position = 0
        for (const token of assembled) {
          expect(token.start).toBe(position)
          expect(token.value).toBe(source.slice(token.start, token.end))
          position = token.end
        }
        expect(position).toBe(end)
      }
    }
  })
}
