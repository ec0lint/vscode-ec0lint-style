'use strict';

/** @type {import('ec0lint-style').Linter.Config} */
const config = {
	rules: {
		'no-console': 'off',
		'no-process-exit': 'off',
		'node/no-unpublished-require': 'off',
		'node/no-unpublished-import': 'off',
	},
};

module.exports = config;
