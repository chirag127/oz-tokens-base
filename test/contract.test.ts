import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { declaredNames, declaredProps, readCss, ruleBody } from './parse'

const SRC = join(__dirname, '..', 'src')
const contract = readCss(join(SRC, 'contract.css'))

// The 7 semantic color roles the --oz-* base contract ships (see contract.css).
const COLOR_ROLES = [
	'--oz-bg',
	'--oz-fg',
	'--oz-surface',
	'--oz-muted',
	'--oz-border',
	'--oz-accent',
	'--oz-accent-fg',
] as const

const FONT_SLOTS = [
	'--oz-font-display',
	'--oz-font-body',
	'--oz-font-mono',
] as const

// Non-color primitives: identical across every consuming site, never overridden.
const SPACE = [
	'--oz-space-1',
	'--oz-space-2',
	'--oz-space-3',
	'--oz-space-4',
	'--oz-space-6',
	'--oz-space-8',
	'--oz-space-12',
	'--oz-space-16',
] as const
const RADII = [
	'--oz-radius-s',
	'--oz-radius-m',
	'--oz-radius-l',
	'--oz-radius-full',
] as const
const MOTION = ['--oz-dur-fast', '--oz-dur-base', '--oz-dur-slow'] as const
const EASING = ['--oz-ease-out', '--oz-ease-in-out'] as const

const HEX = /^#[0-9a-f]{3,8}$/i

describe('contract.css — :root defaults', () => {
	const light = declaredProps(ruleBody(contract, ':root {'))

	it('declares every documented custom property, and nothing extra', () => {
		const expected = new Set<string>([
			...COLOR_ROLES,
			...FONT_SLOTS,
			...SPACE,
			...RADII,
			...MOTION,
			...EASING,
		])
		expect(new Set(Object.keys(light))).toEqual(expected)
	})

	it('color roles are valid hex', () => {
		for (const role of COLOR_ROLES) expect(light[role]).toMatch(HEX)
	})

	it('font slots are non-empty family lists', () => {
		for (const slot of FONT_SLOTS) {
			expect(light[slot]).toBeTruthy()
			expect(light[slot]).toMatch(/(serif|sans-serif|monospace|system-ui)/)
		}
	})

	it('ships the 4px space scale', () => {
		expect(light['--oz-space-1']).toBe('0.25rem')
		expect(light['--oz-space-4']).toBe('1rem')
		expect(light['--oz-space-16']).toBe('4rem')
	})

	it('ships radii incl. the pill radius', () => {
		expect(light['--oz-radius-s']).toBe('0.25rem')
		expect(light['--oz-radius-full']).toBe('999px')
	})

	it('ships motion durations in ms and cubic-bezier easings', () => {
		for (const d of MOTION) expect(light[d]).toMatch(/^\d+ms$/)
		for (const e of EASING) expect(light[e]).toMatch(/^cubic-bezier\(/)
	})

	it('opts into light dark via color-scheme', () => {
		expect(ruleBody(contract, ':root {')).toMatch(/color-scheme:\s*light dark/)
	})
})

describe('contract.css — dark overrides', () => {
	const light = declaredProps(ruleBody(contract, ':root {'))
	const dark = declaredProps(
		ruleBody(contract, '@media (prefers-color-scheme: dark)'),
	)
	const darkNames = new Set(Object.keys(dark))

	it('overrides every color role with a different valid hex', () => {
		for (const role of COLOR_ROLES) {
			expect(darkNames.has(role)).toBe(true)
			expect(dark[role]).toMatch(HEX)
			expect(dark[role]).not.toBe(light[role])
		}
	})

	it('overrides only the color roles — never a primitive or font slot', () => {
		const allowed = new Set<string>(COLOR_ROLES)
		for (const name of darkNames) expect(allowed.has(name)).toBe(true)
		for (const name of [...FONT_SLOTS, ...SPACE, ...RADII, ...MOTION, ...EASING])
			expect(darkNames.has(name)).toBe(false)
	})
})

describe('base.css — element defaults consume the contract', () => {
	const base = readCss(join(SRC, 'base.css'))

	it('references contract props it relies on, never redeclaring them', () => {
		for (const v of ['--oz-bg', '--oz-fg', '--oz-font-body', '--oz-accent'])
			expect(base).toContain(`var(${v})`)
		// base.css consumes the contract; it must not declare --oz-* itself.
		expect(declaredNames(base).size).toBe(0)
	})

	it('ships the a11y focus-visible ring', () => {
		expect(base).toMatch(/:focus-visible\s*{[^}]*outline:/)
	})
})

describe('index.css — entry point', () => {
	const index = readCss(join(SRC, 'index.css'))

	it('imports contract then base, in that order', () => {
		const c = index.indexOf('./contract.css')
		const b = index.indexOf('./base.css')
		expect(c).toBeGreaterThan(-1)
		expect(b).toBeGreaterThan(c)
	})
})
