import path from 'path';
import pathIsInside from 'path-is-inside';
import { URI } from 'vscode-uri';
import { findPackageRoot } from '../packages';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import type { RunnerOptions } from './types';

/**
 * Given a document URI, base options, and extension options, builds a ec0lint-style
 * options object. Runner options supersede base options.
 */
export async function buildEc0lintStyleOptions(
	uri: string,
	workspaceFolder?: string,
	baseOptions: Partial<Ec0lintStyle.LinterOptions> = {},
	{
		config,
		configFile,
		configBasedir,
		customSyntax,
		ignoreDisables,
		reportDescriptionlessDisables,
		reportNeedlessDisables,
		reportInvalidScopeDisables,
	}: RunnerOptions = {},
): Promise<Partial<Ec0lintStyle.LinterOptions>> {
	const options = {
		...baseOptions,

		config: config ?? baseOptions.config,

		configFile: configFile
			? workspaceFolder
				? configFile.replace(/\$\{workspaceFolder\}/gu, workspaceFolder)
				: configFile
			: baseOptions.configFile,

		configBasedir: configBasedir
			? path.isAbsolute(configBasedir)
				? configBasedir
				: path.join(workspaceFolder ?? '', configBasedir)
			: baseOptions.configBasedir,

		customSyntax: customSyntax
			? workspaceFolder
				? customSyntax.replace(/\$\{workspaceFolder\}/gu, workspaceFolder)
				: customSyntax
			: baseOptions.customSyntax,

		ignoreDisables: ignoreDisables ?? baseOptions.ignoreDisables,

		reportDescriptionlessDisables:
			reportDescriptionlessDisables ?? baseOptions.reportDescriptionlessDisables,

		reportNeedlessDisables: reportNeedlessDisables ?? baseOptions.reportNeedlessDisables,

		reportInvalidScopeDisables:
			reportInvalidScopeDisables ?? baseOptions.reportInvalidScopeDisables,
	};

	const documentPath = URI.parse(uri).fsPath;

	if (documentPath) {
		if (workspaceFolder && pathIsInside(documentPath, workspaceFolder)) {
			options.ignorePath = path.join(workspaceFolder, '.ec0lint-styleignore');
		}

		if (options.ignorePath === undefined) {
			options.ignorePath = path.join(
				(await findPackageRoot(documentPath)) || path.parse(documentPath).root,
				'.ec0lint-styleignore',
			);
		}
	}

	return options;
}
