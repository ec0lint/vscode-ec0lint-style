// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';

/**
 * Package manager identifiers.
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Options for resolving the Stylelint package.
 */
export type ResolverOptions = {
	packageManager?: PackageManager;
	stylelintPath?: string;
};

/**
 * Stylelint package resolution result.
 */
export type StylelintResolutionResult = {
	stylelint: Ec0lintStyle.PublicApi;
	resolvedPath: string;
};

/**
 * A tracer function that can be used to log messages.
 */
export type TracerFn = (message: string, verbose?: string) => void;
