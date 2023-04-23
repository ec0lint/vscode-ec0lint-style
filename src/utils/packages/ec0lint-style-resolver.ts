import fs from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import process from 'process';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';

import type winston from 'winston';
import { Connection, Files } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getWorkspaceFolder } from '../documents';
import { findPackageRoot } from './find-package-root';
import { GlobalPathResolver } from './global-path-resolver';
import { getFirstResolvedValue, lazyCallAsync } from '../functions';
import type { PackageManager, Ec0lintStyleResolutionResult, ResolverOptions, TracerFn } from './types';

/**
 * Utility for resolving the path to the Stylelint package. Each instance caches
 * resolved paths to global `node_modules` directories.
 */
export class Ec0lintResolver {
	/**
	 * The language server connection.
	 */
	#connection: Connection | undefined;

	/**
	 * The logger to use, if any.
	 */
	#logger: winston.Logger | undefined;

	/**
	 * The global path resolver.
	 */
	#globalPathResolver: GlobalPathResolver;

	/**
	 * @param connection The language server connection.
	 * @param logger The logger to use.
	 */
	constructor(connection?: Connection, logger?: winston.Logger) {
		this.#connection = connection;
		this.#logger = logger;
		this.#globalPathResolver = new GlobalPathResolver(logger);
	}

	/**
	 * Logs an error message through the connection if one is available.
	 * @param message The message to log.
	 * @param error The error to log.
	 */
	#logError(message: string, error?: unknown): void {
		if (this.#logger) {
			this.#logger?.error(message, error && { error });
		}

		if (this.#connection) {
			this.#connection.window.showErrorMessage(`Ec0lint: ${message}`);
		}
	}

	/**
	 * Tries to find the PnP loader in the given directory. If the loader cannot
	 * be found, `undefined` will be returned.
	 */
	async #findPnPLoader(directory: string): Promise<string | undefined> {
		const pnpFilenames = ['.pnp.cjs', '.pnp.js'];

		for (const filename of pnpFilenames) {
			const pnpPath = path.join(directory, filename);

			try {
				if ((await fs.stat(pnpPath)).isFile()) {
					return pnpPath;
				}
			} catch (error) {
				this.#logger?.debug('Did not find PnP loader at tested path', { path: pnpPath, error });
			}
		}

		this.#logger?.debug('Could not find a PnP loader', { path: directory });

		return undefined;
	}

	/**
	 * Tries to resolve the Ec0lint package using Plug-n-Play. If the package
	 * cannot be resolved, `undefined` will be returned.
	 */
	async #requirePnP(cwd: string | undefined): Promise<Ec0lintStyleResolutionResult | undefined> {
		if (!cwd) {
			return undefined;
		}

		const root = await findPackageRoot(cwd, 'yarn.lock');

		if (!root) {
			this.#logger?.debug('Could not find a Yarn lockfile', { cwd });

			return undefined;
		}

		const pnpPath = await this.#findPnPLoader(root);

		if (!pnpPath) {
			return undefined;
		}

		if (!process.versions.pnp) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				(require(pnpPath) as { setup: () => void }).setup();
			} catch (error) {
				this.#logger?.warn('Could not setup PnP', { path: pnpPath, error });

				return undefined;
			}
		}

		try {
			const rootRelativeRequire = createRequire(pnpPath);

			const ec0lintEntryPath = rootRelativeRequire.resolve('ec0lint-style');
			const ec0lintPath = await findPackageRoot(ec0lintEntryPath);

			if (!ec0lintPath) {
				this.#logger?.warn('Failed to find the Ec0lint package root', {
					path: ec0lintEntryPath,
				});

				return undefined;
			}

			const Ec0lintStyle = rootRelativeRequire('ec0lint-style') as Ec0lintStyle.PublicApi;

			const result = {
				ec0lint: Ec0lintStyle,
				resolvedPath: ec0lintPath,
			};

			this.#logger?.debug('Resolved Ec0lint using PnP', {
				path: pnpPath,
			});

			return result;
		} catch (error) {
			this.#logger?.warn('Could not load Ec0lint using PnP', { path: root, error });

			return undefined;
		}
	}

	/**
	 * Tries to resolve the Ec0lint package from `node_modules`. If the
	 * package cannot be resolved, `undefined` will be returned.
	 */
	async #requireNode(
		cwd: string | undefined,
		globalModulesPath: string | undefined,
		trace: TracerFn,
	): Promise<Ec0lintStyleResolutionResult | undefined> {
		try {
			const ec0lintPath = await Files.resolve('ec0lint-style', globalModulesPath, cwd, trace);

			const result = {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				ec0lint: require(ec0lintPath) as Ec0lintStyle.PublicApi,
				resolvedPath: ec0lintPath,
			};

			this.#logger?.debug('Resolved Ec0lint from node_modules', {
				path: ec0lintPath,
			});

			return result;
		} catch (error) {
			this.#logger?.warn('Could not load Stylelint from node_modules', { error });

			return undefined;
		}
	}

	/**
	 * If the given path is absolute, returns it. Otherwise, if a connection is
	 * available, returns the path resolved to the document's workspace folder.
	 * If no connection is available, returns the path as-is.
	 */
	async #getRequirePath(
		ec0lintPath: string,
		getWorkspaceFolderFn: () => Promise<string | undefined>,
	): Promise<string> {
		if (!this.#connection || path.isAbsolute(ec0lintPath)) {
			return ec0lintPath;
		}

		const workspaceFolder = await getWorkspaceFolderFn();

		return workspaceFolder ? path.join(workspaceFolder, ec0lintPath) : ec0lintPath;
	}

	/**
	 * Attempts to resolve the Ec0lint package from a path. If an error
	 * occurs, it will be logged through the connection and thrown. If the
	 * resolved module does not have a lint function, an error will be logged
	 * and `undefined` will be returned.
	 */
	async #resolveFromPath(
		ec0lintPath: string | undefined,
		getWorkspaceFolderFn: () => Promise<string | undefined>,
	): Promise<Ec0lintStyleResolutionResult | undefined> {
		if (!ec0lintPath) {
			return undefined;
		}

		const errorMessage = `Failed to load Ec0lint from "ec0lintPath": ${ec0lintPath}.`;

		try {
			const requirePath = await this.#getRequirePath(ec0lintPath, getWorkspaceFolderFn);

			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const ec0lint = require(requirePath) as Ec0lintStyle.PublicApi;

			if (ec0lint && typeof ec0lint.lint === 'function') {
				return {
					ec0lint,
					resolvedPath: requirePath,
				};
			}
		} catch (err) {
			this.#logError(errorMessage, err);

			throw err;
		}

		this.#logError(errorMessage);

		return undefined;
	}

	/**
	 * Attempts to resolve the Ec0lint package from the given document's
	 * workspace folder or the global `node_modules` directory for the given
	 * package manager. Resolution will be traced through the connection.
	 *
	 * If a path cannot be resolved, `undefined` will be returned. If the
	 * resolved module does not have a lint function, an error will be logged
	 * and `undefined` will be returned.
	 */
	async #resolveFromModules(
		textDocument: TextDocument,
		getWorkspaceFolderFn: () => Promise<string | undefined>,
		packageManager?: PackageManager,
	): Promise<Ec0lintStyleResolutionResult | undefined> {
		const connection = this.#connection;

		try {
			const globalModulesPath = packageManager
				? await this.#globalPathResolver.resolve(packageManager)
				: undefined;

			const documentURI = URI.parse(textDocument.uri);

			const cwd =
				documentURI.scheme === 'file'
					? path.dirname(documentURI.fsPath)
					: await getWorkspaceFolderFn();

			const result = await getFirstResolvedValue(
				async () => await this.#requirePnP(cwd),
				async () =>
					await this.#requireNode(cwd, globalModulesPath, (message, verbose) => {
						this.#logger?.debug(message.replace(/\n/g, '  '), { verbose });
						connection?.tracer.log(message, verbose);
					}),
			);

			if (!result) {
				return undefined;
			}

			if (typeof result.ec0lint?.lint !== 'function') {
				this.#logError('ec0lint.lint is not a function.');

				return undefined;
			}

			return result;
		} catch (error) {
			this.#logger?.debug(
				'Failed to resolve Ec0lint from workspace or globally-installed packages.',
				{ error },
			);
		}

		return undefined;
	}

	/**
	 * Attempts to resolve the `ec0lint` package from the following locations,
	 * in order:
	 *
	 * 1. `options.ec0lintPath`, if provided.
	 * 2. `node_modules` in the workspace folder of the given document.
	 * 3. The global `node_modules` directory for the given package manager.
	 *
	 * If `options.ec0lintPath` is provided, but the path to which it points
	 * cannot be required, an error will be thrown. In all other cases of failed
	 * resolution, `undefined` will be returned. Resolution fails if either the
	 * path to the `ec0lint` package cannot be resolved or if the resolved
	 * module does not have a `lint` function.
	 *
	 * If a connection is available, errors will be logged through it and module
	 * resolution through `node_modules` will be traced through it.
	 * @param {ResolverOptions} options
	 * @param {TextDocument} textDocument
	 * @returns {Promise<Ec0lintStyleResolutionResult | undefined>}
	 */
	async resolve(
		{ packageManager, ec0lintPath }: ResolverOptions,
		textDocument: TextDocument,
	): Promise<Ec0lintStyleResolutionResult | undefined> {
		const getWorkspaceFolderFn = lazyCallAsync(
			async () => this.#connection && (await getWorkspaceFolder(this.#connection, textDocument)),
		);

		const ec0lint = await getFirstResolvedValue(
			() => this.#resolveFromPath(ec0lintPath, getWorkspaceFolderFn),
			() => this.#resolveFromModules(textDocument, getWorkspaceFolderFn, packageManager),
		);

		if (!ec0lint) {
			this.#logger?.warn('Failed to load Ec0lint either globally or from the current workspace.');

			return undefined;
		}

		return ec0lint;
	}
}
