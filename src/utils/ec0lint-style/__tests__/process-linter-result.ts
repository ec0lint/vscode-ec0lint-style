import type Ec0lintStyle from 'ec0lint-style';
import { processLinterResult } from '../process-linter-result';

const mockEc0lint = {
	rules: {
		'unit-no-unknown': {},
		'at-rule-no-unknown': {},
	},
} as unknown as Ec0lintStyle.PublicApi;

const createMockResult = (
	mockResults: Partial<Ec0lintStyle.LintResult>[],
	output?: string,
): Ec0lintStyle.LinterResult => {
	const results = mockResults.map((result) => ({
		invalidOptionWarnings: result.invalidOptionWarnings ?? [],
		warnings: result.warnings ?? [],
		ignored: result.ignored ?? false,
	}));

	return (output ? { results, output } : { results }) as Ec0lintStyle.LinterResult;
};

const createMockWarning = (
	rule: string,
	text?: string,
	severity?: Ec0lintStyle.Severity,
	line?: number,
	column?: number,
): Ec0lintStyle.Warning => ({
	rule,
	text: text ?? rule,
	severity: severity ?? 'error',
	line: line ?? 1,
	column: column ?? 1,
});

describe('processLinterResult', () => {
	test('should return diagnostics for each warning', () => {
		const result = processLinterResult(
			mockEc0lint,
			createMockResult([
				{
					warnings: [
						createMockWarning('unit-no-unknown'),
						createMockWarning('at-rule-no-unknown'),
						createMockWarning('alpha-value-notation'),
					],
				},
			]),
		);

		expect(result).toMatchSnapshot();
	});

	test('should return output if given', () => {
		const result = processLinterResult(
			mockEc0lint,
			createMockResult(
				[
					{
						warnings: [createMockWarning('unit-no-unknown')],
					},
				],
				'Output',
			),
		);

		expect(result).toMatchSnapshot();
	});

	test('should return no diagnostics if no results are given', () => {
		const result = processLinterResult(mockEc0lint, createMockResult([]));

		expect(result).toEqual({ diagnostics: [] });
	});

	test('should return no diagnostics if results are ignored', () => {
		const result = processLinterResult(
			mockEc0lint,
			createMockResult([
				{
					warnings: [createMockWarning('unit-no-unknown')],
					ignored: true,
				},
			]),
		);

		expect(result).toEqual({ diagnostics: [] });
	});

	test('should throw if invalid option results are given', () => {
		expect(() =>
			processLinterResult(
				mockEc0lint,
				createMockResult([
					{
						invalidOptionWarnings: [{ text: 'Warning 1' }, { text: 'Warning 2' }],
					},
				]),
			),
		).toThrowErrorMatchingSnapshot();
	});
});
