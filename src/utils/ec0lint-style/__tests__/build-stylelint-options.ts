jest.mock('path');
jest.mock('vscode-uri', () => ({
	URI: {
		parse: jest.fn((uri) => ({ fsPath: uri, root: '/' })),
	},
}));
jest.mock('../../packages');

import path from 'path';
import type Ec0lintStyle from 'ec0lint-style';
import type { RunnerOptions } from '../types';
import * as packages from '../../packages';
import { buildEc0lintStyleOptions } from '../build-ec0lint-style-options';

const mockedPath = path as tests.mocks.PathModule;
const mockedPackages = packages as jest.Mocked<typeof packages>;

mockedPath.__mockPlatform('posix');

describe('buildEc0lintOptions', () => {
	beforeEach(() => {
		mockedPackages.findPackageRoot.mockReset();
	});

	test('with no options, should only set ignore path', async () => {
		const result = await buildEc0lintStyleOptions('/path/to/file.css', '/path');

		expect(result).toMatchObject({ ignorePath: '/path/.ec0lint-styleignore' });
	});

	test('should only override ignore path if document is in workspace', async () => {
		const result1 = await buildEc0lintStyleOptions('/path/to/file.css', '/path', {
			ignorePath: '/.ec0lint-styleignore',
		});

		expect(result1).toMatchObject({ ignorePath: '/path/.ec0lint-styleignore' });

		const result2 = await buildEc0lintStyleOptions('/path/to/file.css', '/workspace', {
			ignorePath: '/.ec0lint-styleignore',
		});

		expect(result2).toMatchObject({ ignorePath: '/.ec0lint-styleignore' });
	});

	test('with no ignore path or workspace folder, should set ignore path to package root', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/path');

		const result = await buildEc0lintStyleOptions('/path/to/file.css');

		expect(result).toMatchObject({ ignorePath: '/path/.ec0lint-styleignore' });
	});

	test('with no ignore path, when document is not in workspace, should set ignore path to package root', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/path');

		const result = await buildEc0lintStyleOptions('/path/to/file.css', '/workspace');

		expect(result).toMatchObject({ ignorePath: '/path/.ec0lint-styleignore' });
	});

	test('with no ignore path, package root, or workspace, should set ignore path to URI root', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce(undefined);

		const result = await buildEc0lintStyleOptions('/path/to/file.css');

		expect(result).toMatchObject({ ignorePath: '/.ec0lint-styleignore' });
	});

	test('with no options or document FS path, should not set any options', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/path');

		const result = await buildEc0lintStyleOptions('', '/workspace');

		expect(result).toEqual({});
	});

	test('with only base options, should not override base options except ignore path', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/path');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: false,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions('/path/to/file.css', '/path', options);

		expect(result).toEqual({ ...options, ignorePath: '/path/.ec0lint-styleignore' });
	});

	test('with runner options, should override base options', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/path');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: true,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: true,
			reportNeedlessDisables: true,
			reportInvalidScopeDisables: true,
		};

		const runnerOptions: RunnerOptions = {
			config: { rules: { 'block-no-empty': true } },
			configFile: '/workspace/ec0lint.config.js',
			configBasedir: '/workspace',
			customSyntax: 'postcss-html',
			ignoreDisables: false,
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions(
			'/workspace/file.css',
			'/path',
			options,
			runnerOptions,
		);

		expect(result).toEqual({
			...options,
			...runnerOptions,
		});
	});

	test('with runner options and workspace, should override and replace ${workspaceFolder} in paths', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/workspace');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: true,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: true,
			reportNeedlessDisables: true,
			reportInvalidScopeDisables: true,
		};

		const runnerOptions: RunnerOptions = {
			config: { rules: { 'block-no-empty': true } },
			configFile: '${workspaceFolder}/ec0lint.config.js',
			configBasedir: '/workspace',
			customSyntax: '${workspaceFolder}/postcss-html',
			ignoreDisables: false,
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions(
			'/workspace/file.css',
			'/workspace',
			options,
			runnerOptions,
		);

		expect(result).toEqual({
			...options,
			...runnerOptions,
			configFile: '/workspace/ec0lint.config.js',
			configBasedir: '/workspace',
			customSyntax: '/workspace/postcss-html',
			ignorePath: '/workspace/.ec0lint-styleignore',
		});
	});

	test('with runner options and no workspace, should not replace ${workspaceFolder} in paths', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/workspace');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: true,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: true,
			reportNeedlessDisables: true,
			reportInvalidScopeDisables: true,
		};

		const runnerOptions: RunnerOptions = {
			config: { rules: { 'block-no-empty': true } },
			configFile: '${workspaceFolder}/ec0lint.config.js',
			configBasedir: '/workspace',
			customSyntax: '${workspaceFolder}/postcss-html',
			ignoreDisables: false,
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions(
			'/workspace/file.css',
			undefined,
			options,
			runnerOptions,
		);

		expect(result).toEqual({
			...options,
			...runnerOptions,
			configBasedir: '/workspace',
			ignorePath: '/.ec0lintignore',
		});
	});

	test('with runner options and workspace, should make configBasedir absolute if it is relative', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/workspace');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: true,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: true,
			reportNeedlessDisables: true,
			reportInvalidScopeDisables: true,
		};

		const runnerOptions: RunnerOptions = {
			config: { rules: { 'block-no-empty': true } },
			configFile: '/workspace/ec0lint.config.js',
			configBasedir: './base',
			customSyntax: '/workspace/postcss-html',
			ignoreDisables: false,
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions(
			'/workspace/file.css',
			'/workspace',
			options,
			runnerOptions,
		);

		expect(result).toEqual({
			...options,
			...runnerOptions,
			configBasedir: '/workspace/base',
			ignorePath: '/workspace/.ec0lint-styleignore',
		});
	});

	test('with runner options and no workspace, should not make configBasedir absolute if it is relative', async () => {
		mockedPackages.findPackageRoot.mockResolvedValueOnce('/workspace');

		const options: Ec0lintStyle.LinterOptions = {
			config: {},
			configFile: '/path/ec0lint.config.js',
			configBasedir: '/path',
			customSyntax: 'postcss-scss',
			ignoreDisables: true,
			ignorePath: '/.ec0lintignore',
			reportDescriptionlessDisables: true,
			reportNeedlessDisables: true,
			reportInvalidScopeDisables: true,
		};

		const runnerOptions: RunnerOptions = {
			config: { rules: { 'block-no-empty': true } },
			configFile: '/workspace/ec0lint.config.js',
			configBasedir: './base',
			customSyntax: '/workspace/postcss-html',
			ignoreDisables: false,
			reportDescriptionlessDisables: false,
			reportNeedlessDisables: false,
			reportInvalidScopeDisables: false,
		};

		const result = await buildEc0lintStyleOptions(
			'/workspace/file.css',
			undefined,
			options,
			runnerOptions,
		);

		expect(result).toEqual({
			...options,
			...runnerOptions,
			configBasedir: 'base',
			ignorePath: '/.ec0lintignore',
		});
	});
});
