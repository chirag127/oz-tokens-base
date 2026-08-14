import { defineConfig } from 'vitest/config'

// Package-local config stops Vitest walking up to any parent workspace root.
export default defineConfig({
	test: {
		root: __dirname,
		environment: 'node',
		include: ['test/**/*.test.ts'],
	},
})
