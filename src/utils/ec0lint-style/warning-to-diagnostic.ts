import { Diagnostic, DiagnosticSeverity, Position, Range } from 'vscode-languageserver-types';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';

/**
 * Converts a ec0lint-style warning to an LSP Diagnostic.
 *
 * @example
 * ```js
 * const [result] = await ec0lint-style.lint({
 *   code: 'a { color: red; }',
 *   config: { rules: { 'color-named': 'never' } }
 * });
 *
 * const [warning] = result.warnings;
 * // {
 * //   rule: 'color-named',
 * //   text: 'Unexpected named color "red" (color-named)',
 * //   severity: 'error',
 * //   line: 1,
 * //   column: 12
 * // }
 *
 * const diagnostic = warningToDiagnostic(warning);
 * // {
 * //   message: 'Unexpected named color "red" (color-named)',
 * //   severity: 1,
 * //   source: 'ec0lint-style',
 * //   range: {
 * //     start: {
 * //       line: 0,
 * //       character: 11
 * //     },
 * //     end: {
 * //       line: 0,
 * //       character: 11
 * //     }
 * //   }
 * // }
 * ```
 * @param warning The warning to convert.
 * @param rules Available ec0lint-style rules.
 */
export function warningToDiagnostic(
	warning: Ec0lintStyle.Warning,
	ruleMetadata?: any,
): Diagnostic {
	const start = Position.create(warning.line - 1, warning.column - 1);
	const end = Position.create(warning.line - 1, warning.column);

	const ruleDocUrl = ruleMetadata?.[warning.rule]?.url;

	const diagnostic = Diagnostic.create(
		Range.create(start, end),
		warning.text,
		DiagnosticSeverity[warning.severity === 'warning' ? 'Warning' : 'Error'],
		warning.rule,
		'ec0lint-style',
	);

	if (ruleDocUrl) {
		diagnostic.codeDescription = { href: ruleDocUrl };
	}

	return diagnostic;
}
