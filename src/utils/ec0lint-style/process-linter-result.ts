import { warningToDiagnostic } from './warning-to-diagnostic';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import { LintDiagnostics, InvalidOptionError } from './types';

/**
 * Processes the results of a ec0lint-style lint run.
 *
 * If ec0lint-style reported any warnings, they are converted to Diagnostics and
 * returned. If the lint results contain raw output in the `output` property, it
 * is also returned.
 *
 * Throws an `InvalidOptionError` for any invalid option warnings reported by
 * ec0lint-style.
 * @param ec0lintStyle The ec0lint-style instance that was used.
 * @param result The results returned by ec0lint-style.
 */
export function processLinterResult(
	ec0lintStyle: Ec0lintStyle.PublicApi,
	{ results, output }: Ec0lintStyle.LinterResult,
): LintDiagnostics {
	if (results.length === 0) {
		return { diagnostics: [] };
	}

	const [{ invalidOptionWarnings, warnings, ignored }] = results;

	if (ignored) {
		return { diagnostics: [] };
	}

	if (invalidOptionWarnings.length !== 0) {
		throw new InvalidOptionError(invalidOptionWarnings);
	}

	const ruleMetadata = new Proxy(
			{},
			{
				get: (_, key: string) => {
					return ec0lintStyle.rules?.[key]?.meta;
				},
			},
		);


	const diagnostics = warnings.map((warning) => warningToDiagnostic(warning, ruleMetadata));

	return output ? { output: output as string, diagnostics } : { diagnostics };
}
