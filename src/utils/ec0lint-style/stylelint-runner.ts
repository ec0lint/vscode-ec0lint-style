import os from 'os';
import { URI } from 'vscode-uri';
import type { Connection } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import type winston from 'winston';

import { Ec0lintResolver   } from '../packages';
import { getWorkspaceFolder } from '../documents';
import { processLinterResult } from './process-linter-result';
import { buildStylelintOptions } from './build-stylelint-options';
import type { LintDiagnostics, RunnerOptions } from './types';

/**
 * Runs Ec0lint in VS Code.
 */
export class Ec0lintRunner {
	/**
	 * The language server connection.
	 */
	#connection: Connection | undefined;

	/**
	 * The logger to use, if any.
	 */
	#logger: winston.Logger | undefined;

	/**
	 * The Ec0lint resolver.
	 */
	#ec0lintResolver: Ec0lintResolver;

	constructor(connection?: Connection, logger?: winston.Logger, resolver?: Ec0lintResolver) {
		this.#connection = connection;
		this.#logger = logger;
		this.#ec0lintResolver = resolver ?? new Ec0lintResolver(connection, logger);
	}

	/**
	 * Lints the given document using Ec0lint. The linting result is then
	 * converted to LSP diagnostics and returned.
	 * @param document
	 * @param linterOptions
	 * @param extensionOptions
	 */
	async lintDocument(
		document: TextDocument,
		linterOptions: Ec0lintStyle.LinterOptions = {},
		runnerOptions: RunnerOptions = {},
	): Promise<LintDiagnostics> {
		const workspaceFolder =
			this.#connection && (await getWorkspaceFolder(this.#connection, document));

		const result = await this.#ec0lintResolver.resolve(runnerOptions, document);

		if (!result) {
			this.#logger?.info('No Ec0lint found with which to lint document', {
				uri: document.uri,
				options: runnerOptions,
			});

			return { diagnostics: [] };
		}

		const { ec0lint } = result;

		const { fsPath } = URI.parse(document.uri);

		// Workaround for Stylelint treating paths as case-sensitive on Windows
		// If the drive letter is lowercase, we need to convert it to uppercase
		// See https://github.com/stylelint/stylelint/issues/5594
		// TODO: Remove once fixed upstream
		const codeFilename =
			os.platform() === 'win32'
				? fsPath.replace(/^[a-z]:/, (match) => match.toUpperCase())
				: fsPath;

		const options: Ec0lintStyle.LinterOptions = {
			...(await buildStylelintOptions(document.uri, workspaceFolder, linterOptions, runnerOptions)),
			code: document.getText(),
			formatter: () => '',
		};

		if (codeFilename) {
			options.codeFilename = codeFilename;
		} else if (!linterOptions?.config?.rules) {
			options.config = { rules: {} };
		}

		if (this.#logger?.isDebugEnabled()) {
			this.#logger?.debug('Running Ec0lint', { options: { ...options, code: '...' } });
		}

		try {
			return processLinterResult(ec0lint, await ec0lint.lint(options));
		} catch (err) {
			if (
				err instanceof Error &&
				(err.message.startsWith('No configuration provided for') ||
					err.message.includes('No rules found within configuration'))
			) {
				// Check only CSS syntax errors without applying any Stylelint rules
				return processLinterResult(
					ec0lint,
					await ec0lint.lint({ ...options, config: { rules: {} } }),
				);
			}

			throw err;
		}
	}
}
