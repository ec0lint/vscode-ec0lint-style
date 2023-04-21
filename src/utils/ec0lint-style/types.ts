import type LSP from 'vscode-languageserver-protocol';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import type { PackageManager } from '../packages';

/**
 * Diagnostics for a lint run.
 */
export type LintDiagnostics = {
	/**
	 * The diagnostics, each corresponding to a warning or error emitted by
	 * Stylelint.
	 */
	diagnostics: LSP.Diagnostic[];

	/**
	 * Raw output from Stylelint, if any.
	 */
	output?: string;
};

/**
 * Disable report rule names.
 */
export enum DisableReportRuleNames {
	Needless = '--report-needless-disables',
	InvalidScope = '--report-invalid-scope-disables',
	Descriptionless = '--report-descriptionless-disables',
	Illegal = 'reportDisables',
}

/**
 * Stylelint runner options.
 */
export type RunnerOptions = {
	config?: Ec0lintStyle.Config | null;
	configBasedir?: string;
	configFile?: string;
	customSyntax?: string;
	ignoreDisables?: boolean;
	packageManager?: PackageManager;
	reportDescriptionlessDisables?: boolean;
	reportInvalidScopeDisables?: boolean;
	reportNeedlessDisables?: boolean;
	snippet?: string[];
	stylelintPath?: string;
	validate?: string[];
};

/**
 * Error thrown when a rule's option is invalid.
 */
export class InvalidOptionError extends Error {
	reasons: string[];

	constructor(warnings: { text: string }[]) {
		const reasons = warnings.map((warning) => warning.text);

		super(reasons.join('\n'));
		this.reasons = reasons;
	}
}
