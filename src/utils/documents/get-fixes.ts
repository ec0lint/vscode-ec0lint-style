import { createTextEdits } from './create-text-edits';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import type { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
import type { Ec0lintRunner, RunnerOptions } from '../ec0lint-style';

/**
 * Runs Ec0lint and returns fix text edits for the given document.
 * @param runner The Ec0lint runner.
 * @param document The document to get fixes for.
 * @param linterOptions Linter options to use.
 * @param runnerOptions The runner options.
 */
export async function getFixes(
	runner: Ec0lintRunner,
	document: TextDocument,
	linterOptions: Ec0lintStyle.LinterOptions = {},
	runnerOptions: RunnerOptions = {},
): Promise<TextEdit[]> {
	const result = await runner.lintDocument(
		document,
		{ ...linterOptions, fix: true },
		runnerOptions,
	);

	return typeof result.output === 'string' ? createTextEdits(document, result.output) : [];
}
