// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';

/**
 * Package manager identifiers.
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Options for resolving the ec0lint-style package.
 */
export type ResolverOptions = {
	packageManager?: PackageManager;
	ec0lintStylePath?: string;
};

/**
 * Ec0lint package resolution result.
 */
export type Ec0lintStyleResolutionResult = {
	ec0lint: Ec0lintStyle.PublicApi;
	resolvedPath: string;
};

/**
 * A tracer function that can be used to log messages.
 */
export type TracerFn = (message: string, verbose?: string) => void;
