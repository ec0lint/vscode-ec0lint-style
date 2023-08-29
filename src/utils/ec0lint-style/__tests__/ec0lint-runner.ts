jest.mock('os');
jest.mock('path');
jest.mock('vscode-uri', () => ({
	URI: {
		parse: jest.fn((str: string) => ({ fsPath: str })),
	},
}));
jest.mock('../../packages/ec0lint-style-resolver');
jest.mock('../../documents');

import os from 'os';
import path from 'path';
import ec0lint from 'ec0lint-style';
import type winston from 'winston';
import type { Connection } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Ec0lintResolver, ResolverOptions } from '../../packages';
import { getWorkspaceFolder } from '../../documents';
import { Ec0lintRunner as Ec0lintStyleRunner } from '../ec0lint-style-runner';

const mockedOS = os as tests.mocks.OSModule;
const mockedPath = path as tests.mocks.PathModule;
const mockedResolver = Ec0lintResolver as jest.Mock<Ec0lintResolver>;
const mockedGetWorkspaceFolder = getWorkspaceFolder as jest.MockedFunction<
	typeof getWorkspaceFolder
>;

type FakeLintFunction = (
	options: ec0lint.LinterOptions,
) => Promise<Partial<ec0lint.LinterResult>>;

type FakeResolveFunction = (
	serverOptions: ResolverOptions,
	document: TextDocument,
) => Promise<{ ec0lint: { lint: FakeLintFunction } }>;

const createMockResolver =
	(lint?: FakeLintFunction, resolve?: FakeResolveFunction): (() => Ec0lintResolver) =>
	() =>
		({
			resolve: resolve ?? (async () => (lint ? { ec0lint: { lint } } : undefined)),
		} as unknown as Ec0lintResolver);

const createMockDocument = (code: string, uri = '/path/to/file.css'): TextDocument =>
	({
		getText: () => code,
		uri,
	} as TextDocument);

const mockConnection = {} as unknown as Connection;

describe('Ec0lintRunner', () => {
	beforeEach(() => {
		mockedOS.__mockPlatform('linux');
		mockedPath.__mockPlatform('posix');
	});

	test('should return no diagnostics if ec0lint cannot be resolved', async () => {
		mockedResolver.mockImplementation(createMockResolver());

		const results = await new Ec0lintStyleRunner(mockConnection).lintDocument(createMockDocument(''));

		expect(results).toEqual({ diagnostics: [] });
	});

	// TODO: Remove once fixed upstream
	test('should upper-case drive letters on Windows (Stylelint bug #5594)', async () => {
		expect.assertions(2);

		mockedOS.__mockPlatform('win32');
		mockedResolver.mockImplementation(
			createMockResolver(async (options) => {
				expect(options.codeFilename).toBe('C:\\path\\to\\file.css');

				return { results: [] };
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('', 'c:\\path\\to\\file.css'),
		);

		mockedOS.__mockPlatform('linux');
		mockedResolver.mockImplementation(
			createMockResolver(async (options) => {
				expect(options.codeFilename).toBe('c:/path/to/file.css');

				return { results: [] };
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('', 'c:/path/to/file.css'),
		);
	});

	test('should call ec0lint.lint with the document path and given options', async () => {
		expect.assertions(2);

		mockedResolver.mockImplementation(
			createMockResolver(async (options) => {
				expect(options).toMatchSnapshot();

				expect((options.formatter as ec0lint.Formatter)?.([], {} as never)).toBe('');

				return { results: [] };
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('a {}', '/path/to/file.scss'),
			{
				config: {
					customSyntax: 'postcss-scss',
				},
				fix: true,
			},
		);
	});

	test("should pass empty rules if the document's path cannot be determined and rules aren't set", async () => {
		expect.assertions(1);

		mockedResolver.mockImplementation(
			createMockResolver(async (options) => {
				expect(options.config).toEqual({
					rules: {},
				});

				return { results: [] };
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(createMockDocument('a {}', ''));
	});

	test("should not change set rules if the document's path cannot be determined", async () => {
		expect.assertions(1);

		mockedResolver.mockImplementation(
			createMockResolver(async (options) => {
				expect(options.config).toEqual({
					rules: { 'no-empty-source': true },
				});

				return { results: [] };
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(createMockDocument('a {}', ''), {
			config: { rules: { 'no-empty-source': true } },
		});
	});

	test('should call the resolver with the server options and the document', async () => {
		expect.assertions(3);

		mockedResolver.mockImplementation(
			createMockResolver(undefined, async (serverOptions, document) => {
				expect(serverOptions).toEqual({
					packageManager: 'pnpm',
				});

				expect(document).toEqual({
					getText: expect.any(Function),
					uri: '/path/to/file.css',
				});

				expect(document.getText()).toBe('a {}');

				return {
					ec0lint: { lint: async () => ({ results: [] }) },
				};
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('a {}', '/path/to/file.css'),
			undefined,
			{ packageManager: 'pnpm' },
		);
	});

	test('with ec0lintStylePath, should call the resolver with the path', async () => {
		expect.assertions(1);

		mockedGetWorkspaceFolder.mockResolvedValueOnce('/workspace');

		mockedResolver.mockImplementation(
			createMockResolver(undefined, async (serverOptions) => {
				expect(serverOptions).toEqual({
					ec0lintStylePath: '/path/to/ec0lint-style',
				});

				return {
					ec0lint: { lint: async () => ({ results: [] }) },
				};
			}),
		);

		await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('a {}', '/path/to/file.css'),
			undefined,
			{ ec0lintStylePath: '/path/to/ec0lint-style' },
		);
	});

	test('should return processed lint results from Stylelint without configured rules', async () => {
		expect.assertions(1);

		mockedPath.__mockPlatform();

		mockedResolver.mockImplementation(createMockResolver(undefined, async () => ({ ec0lint })));

		const results = await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('table {', '/path/to/file.css'),
		);

		expect(results).toMatchSnapshot();
	});

	test('should return processed lint results from Stylelint with configured rules', async () => {
		expect.assertions(1);

		mockedPath.__mockPlatform();

		mockedResolver.mockImplementation(createMockResolver(undefined, async () => ({ ec0lint })));

		const results = await new Ec0lintStyleRunner(mockConnection).lintDocument(
			createMockDocument('a {}', '/path/to/file.css'),
			{ config: { rules: { 'block-no-empty': true } } },
		);

		expect(results).toMatchSnapshot();
	});

	test('should throw errors thrown by Stylelint', async () => {
		expect.assertions(1);

		mockedPath.__mockPlatform();

		mockedResolver.mockImplementation(createMockResolver(undefined, async () => ({ ec0lint })));

		await expect(
			new Ec0lintStyleRunner(mockConnection).lintDocument(
				createMockDocument('a {}', '/path/to/file.css'),
				{
					config: { rules: {} },
					files: ['/path/to/file.css'],
				},
			),
		).rejects.toThrowErrorMatchingSnapshot();
	});

	test('should log if a logger is provided', async () => {
		expect.assertions(2);

		const mockLogger = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			isDebugEnabled: jest.fn(() => true),
		} as unknown as winston.Logger;

		mockedPath.__mockPlatform();

		mockedResolver.mockImplementation(createMockResolver(undefined, async () => ({ ec0lint })));

		await new Ec0lintStyleRunner(mockConnection, mockLogger).lintDocument(
			createMockDocument('a {}', '/path/to/file.css'),
			{ config: { rules: { 'block-no-empty': true } } },
		);

		expect(mockLogger.debug).toHaveBeenCalledTimes(1);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringMatching(/^Running Ec0lint/),
			expect.any(Object),
		);
	});
});
