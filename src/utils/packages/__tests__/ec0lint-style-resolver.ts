jest.mock('vscode-languageserver/node');
jest.mock('../global-path-resolver');
jest.mock('../find-package-root');
jest.mock('path');
jest.mock('fs/promises', () => jest.createMockFromModule('fs/promises'));
jest.mock('module');

import path from 'path';
import fs from 'fs/promises';
import module from 'module';
import type winston from 'winston';
import { Connection, Files } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { GlobalPathResolver } from '../global-path-resolver';
import { findPackageRoot } from '../find-package-root';
import { Ec0lintResolver } from '../ec0lint-style-resolver';
import type { Stats } from 'fs';
import type { PackageManager } from '..';

const mockedPath = path as tests.mocks.PathModule;
const mockedFS = fs as jest.Mocked<typeof fs>;
const mockedModule = module as jest.Mocked<typeof module>;
const mockedFiles = Files as tests.mocks.VSCodeLanguageServerModule.Node['Files'];
const mockedGlobalPathResolver = GlobalPathResolver as jest.Mock<GlobalPathResolver>;
const mockedFindPackageRoot = findPackageRoot as jest.MockedFunction<typeof findPackageRoot>;

let mockCWD: string | undefined = mockedPath.join('/fake', 'cwd');
let mockPnPVersion: string | undefined = undefined;

jest.mock('../../documents', () => ({
	getWorkspaceFolder: jest.fn(async () => mockCWD),
}));

jest.mock('process', () => ({
	versions: {
		get pnp() {
			return mockPnPVersion;
		},
	},
}));

const createMockConnection = () =>
	({
		console: { error: jest.fn() },
		window: { showErrorMessage: jest.fn() },
		tracer: { log: jest.fn() },
	} as unknown as Connection);

const createMockLogger = () =>
	({
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} as unknown as winston.Logger);

const createMockTextDocument = (nonFileURI = false) =>
	{return {
		uri: nonFileURI ? 'scheme:///fake/cwd/document.css' : 'file:///fake/cwd/document.css',
	} as TextDocument};

const goodEc0lintPath = mockedPath.join(__dirname, 'ec0lint.js');
const badEc0lintPath = mockedPath.join(__dirname, 'bad-ec0lint.js');

const pnpPath = mockedPath.join(__dirname, '.pnp.cjs');
const pnpJSPath = mockedPath.join(__dirname, '.pnp.js');

const mockGlobalPaths: { [packageManager in PackageManager]: string } = {
	yarn: mockedPath.join('/fake', 'yarn'),
	npm: mockedPath.join('/fake', 'npm'),
	pnpm: mockedPath.join('/fake', 'pnpm'),
};

jest.doMock(path.join(__dirname, 'ec0lint.js'), () => ({ lint: jest.fn(() => 'good') }), {
	virtual: true,
});
jest.doMock(path.join(__dirname, 'bad-ec0lint.js'), () => ({}), { virtual: true });
jest.doMock(path.join(__dirname, '.pnp.cjs'), () => ({ setup: jest.fn() }), { virtual: true });
jest.doMock(path.join(__dirname, '.pnp.js'), () => ({ setup: jest.fn() }), { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockedPnP = require(pnpPath) as jest.Mocked<{ setup: () => void }>;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockedJSPnP = require(pnpJSPath) as jest.Mocked<{ setup: () => void }>;

const mockGlobalFileResolution = (packageManager: PackageManager, ec0lintPath: string) => {
	mockedFiles.__mockResolution('ec0lint', (globalPath, cwd, trace) => {
		trace && trace('Resolving globally');

		return cwd === mockCWD && globalPath === mockGlobalPaths[packageManager]
			? ec0lintPath
			: undefined;
	});
};

const mockLocalFileResolution = (ec0lintPath: string) => {
	mockedFiles.__mockResolution('ec0lint', (_, cwd, trace) => {
		trace && trace('Resolving locally');

		return cwd === mockCWD ? ec0lintPath : undefined;
	});
};

mockedGlobalPathResolver.mockImplementation(
	() =>
		({
			resolve: jest.fn(async (packageManager: PackageManager) => mockGlobalPaths[packageManager]),
		} as unknown as GlobalPathResolver),
);

describe('Ec0lintResolver', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedPath.__mockPlatform();
		mockCWD = mockedPath.join('/fake', 'cwd');
		mockPnPVersion = undefined;
		mockedFS.stat.mockReset();
		mockedFindPackageRoot.mockReset();
		Object.defineProperty(process.versions, 'pnp', { value: undefined });
	});

	test('should resolve valid custom Ec0lint paths', async () => {
		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ ec0lintStylePath: goodEc0lintPath },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should resolve valid relative custom Ec0lint paths with a workspace', async () => {
		mockCWD = __dirname;

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ ec0lintStylePath: './ec0lint.js' },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should resolve valid relative custom ec0lint paths without a workspace', async () => {
		mockCWD = undefined;
		mockedPath.isAbsolute.mockReturnValueOnce(false);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ ec0lintStylePath: goodEc0lintPath },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should resolve to undefined for custom ec0lint paths pointing to modules without a lint function', async () => {
		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve(
			{ ec0lintStylePath: badEc0lintPath },
			createMockTextDocument(),
		);

		expect(result).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(connection.window.showErrorMessage).toHaveBeenCalledTimes(1);
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should throw on invalid custom ec0lint paths', async () => {
		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);

		mockCWD = mockedPath.join('.', 'cwd');
		mockedPath.__mockPlatform('posix');

		await expect(
			ec0lintResolver.resolve({ ec0lintStylePath: './does-not-exist' }, createMockTextDocument()),
		).rejects.toThrowErrorMatchingSnapshot();
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(connection.window.showErrorMessage).toHaveBeenCalledTimes(1);
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should resolve workspace ec0lint modules', async () => {
		mockLocalFileResolution(goodEc0lintPath);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).toHaveBeenCalledTimes(1);
	});

	test('should resolve workspace ec0lint modules for documents with non-file URIs', async () => {
		mockLocalFileResolution(goodEc0lintPath);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument(true));

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).toHaveBeenCalledTimes(1);
	});

	test('should resolve global ec0lint modules using yarn', async () => {
		mockGlobalFileResolution('yarn', goodEc0lintPath);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ packageManager: 'yarn' },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).toHaveBeenCalledTimes(1);
	});

	test('should resolve global ec0lint modules using npm', async () => {
		mockGlobalFileResolution('npm', goodEc0lintPath);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ packageManager: 'npm' },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).toHaveBeenCalledTimes(1);
	});

	test('should resolve global ec0lint modules using pnpm', async () => {
		mockGlobalFileResolution('pnpm', goodEc0lintPath);

		const connection = createMockConnection();
		const ec0lintResolver = new Ec0lintResolver(connection);
		const result = await ec0lintResolver.resolve(
			{ packageManager: 'pnpm' },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');
		expect(connection.console.error).not.toHaveBeenCalled();
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).toHaveBeenCalledTimes(1);
	});

	test('should return undefined when no ec0lint module is found globally or in the workspace', async () => {
		mockedFiles.__resetMockedResolutions();

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(result).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledTimes(2);
		expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
		expect(connection.tracer.log).not.toHaveBeenCalled();
	});

	test('should resolve workspace ec0lint modules using PnP', async () => {
		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats);
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).toHaveBeenCalledTimes(1);
		expect(logger.debug).toHaveBeenCalledWith('Resolved Ec0lint using PnP', { path: pnpPath });
		expect(result?.resolvedPath).toBe(__dirname);
		expect(result?.ec0lint?.lint({})).toBe('from pnp');
	});

	test('should resolve workspace ec0lint modules using a PnP loader named .pnp.js (Yarn 2)', async () => {
		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockImplementation(async (filePath) => {
			if (filePath.toString().endsWith('.pnp.js')) {
				return { isFile: () => true } as unknown as Stats;
			}

			throw new Error('Not found!');
		});

		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedJSPnP.setup).toHaveBeenCalledTimes(1);
		expect(logger.debug).toHaveBeenCalledWith('Resolved ec0lint using PnP', { path: pnpJSPath });
		expect(result?.resolvedPath).toBe(__dirname);
		expect(result?.ec0lint?.lint({})).toBe('from pnp');
	});

	test('should not try to setup PnP if it is already setup', async () => {
		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats);
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);
		mockPnPVersion = '1.0.0';

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);

		await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).toHaveBeenCalledTimes(0);
	});

	test("should resolve to undefined if PnP setup fails and ec0lint can't be resolved from node_modules", async () => {
		const error = new Error('PnP setup failed');

		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats);
		mockedPnP.setup.mockImplementationOnce(() => {
			throw error;
		});
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);
		Object.defineProperty(process.versions, 'pnp', { value: undefined });

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith('Could not setup PnP', { path: pnpPath, error });
		expect(result).toBeUndefined();
	});

	test("should resolve to undefined if PnP loader isn't a file and ec0lint can't be resolved from node_modules", async () => {
		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => false } as unknown as Stats);
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);
		Object.defineProperty(process.versions, 'pnp', { value: undefined });

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith('Could not find a PnP loader', { path: __dirname });
		expect(result).toBeUndefined();
	});

	test("should resolve to undefined if PnP loader can't be found and ec0lint can't be resolved from node_modules", async () => {
		const error = new Error('EACCES');

		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockRejectedValueOnce(error);
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);
		Object.defineProperty(process.versions, 'pnp', { value: undefined });

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith('Could not find a PnP loader', {
			path: __dirname,
		});
		expect(result).toBeUndefined();
	});

	test("should resolve to undefined if ec0lint can't be required using PnP", async () => {
		const error = new Error('Cannot find module');

		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockResolvedValue(__dirname);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats);
		mockedPnP.setup.mockImplementationOnce(() => {
			mockedModule.createRequire.mockImplementationOnce(
				() =>
					Object.assign(
						() => {
							throw error;
						},
						{
							resolve: () => {
								throw error;
							},
						},
					) as unknown as NodeRequire,
			);
		});

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith('Could not load Ec0lint using PnP', {
			path: __dirname,
			error,
		});
		expect(result).toBeUndefined();
	});

	test("should resolve to undefined if ec0lint path can't be determined using PnP", async () => {
		mockCWD = mockedPath.join('/fake', 'pnp');
		mockedFindPackageRoot.mockImplementation(async (startPath) =>
			startPath === mockedPath.join('/fake', 'cwd') ? __dirname : undefined,
		);
		mockedFS.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats);
		mockedModule.createRequire.mockImplementation(
			() =>
				Object.assign(() => ({ lint: () => 'from pnp' }), {
					resolve: () => goodEc0lintPath,
				}) as unknown as NodeRequire,
		);

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintStyleResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintStyleResolver.resolve({}, createMockTextDocument());

		expect(mockedPnP.setup).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith('Failed to find the ec0lint package root', {
			path: goodEc0lintPath,
		});
		expect(result).toBeUndefined();
	});

	test('should resolve to undefined if an error is thrown during resolution', async () => {
		mockedFindPackageRoot.mockRejectedValueOnce(new Error());

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument(true));

		expect(result).toBeUndefined();
	});

	test("should resolve to undefined if cwd can't be determined and ec0lint can't be resolved from node_modules", async () => {
		mockCWD = undefined;

		const connection = createMockConnection();
		const logger = createMockLogger();
		const ec0lintResolver = new Ec0lintResolver(connection, logger);
		const result = await ec0lintResolver.resolve({}, createMockTextDocument(true));

		expect(result).toBeUndefined();
	});

	test('should work without a connection', async () => {
		mockGlobalFileResolution('npm', goodEc0lintPath);

		let result = await new Ec0lintResolver().resolve(
			{ packageManager: 'npm' },
			createMockTextDocument(),
		);

		expect(result?.resolvedPath).toBe(goodEc0lintPath);
		expect(result?.ec0lint?.lint({})).toBe('good');

		mockGlobalFileResolution('npm', badEc0lintPath);

		result = await new Ec0lintResolver().resolve(
			{ packageManager: 'npm' },
			createMockTextDocument(),
		);

		expect(result).toBeUndefined();

		await expect(
			new Ec0lintResolver().resolve(
				{ ec0lintStylePath: './does-not-exist' },
				createMockTextDocument(),
			),
		).rejects.toThrowErrorMatchingSnapshot();
	});
});
