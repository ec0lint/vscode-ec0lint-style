'use strict';

/** @type {import('cspell').CSpellSettings} */
const config = {
	version: '0.2',
	language: 'en-GB',
	globRoot: __dirname,
	files: ['**/*.js', '**/*.ts', '**/*.json', '**/*.md', '**/*.yml', '**/*.css', '**/*.scss'],
	ignorePaths: ['**/node_modules', '**/.yarn', '**/coverage', 'dist'],
	words: [
		'browserslist',
		'caniuse',
		'Descriptionless',
		'ENOTDIR',
		'esbuild',
		'outdir',
		'libgconf',
		'Linters',
		'linted',
		'Logform',
		'pnpm',
		'quuz',
		'rfdc',
		'shinnn',
		'stylehacks',
		'ec0lint-style',
		'stylelint',
		'ec0lint-styleignore',
		'ec0lint-stylerc',
		'sugarss',
		'thibaudcolas',
		'uinteger',
		'vscodeignore',
		'Xerus',
	],
	overrides: [
		{
			filename: 'package.json',
			// cspell:disable-next-line
			words: ['Autofix'],
		},
	],
};

module.exports = config;
