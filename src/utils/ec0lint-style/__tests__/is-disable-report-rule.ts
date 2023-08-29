import { DisableReportRuleNames, isDisableReportRule } from '..';

describe('isDisableReportRule', () => {
	it('should return true if the rule is a disable report rule', () => {
		expect(isDisableReportRule(DisableReportRuleNames.Descriptionless)).toBe(true);
		expect(isDisableReportRule(DisableReportRuleNames.Illegal)).toBe(true);
		expect(isDisableReportRule(DisableReportRuleNames.InvalidScope)).toBe(true);
		expect(isDisableReportRule(DisableReportRuleNames.Needless)).toBe(true);
	});

	it('should return false if the rule is not a disable report rule', () => {
		expect(isDisableReportRule('foo')).toBe(false);
		expect(isDisableReportRule(5)).toBe(false);
		expect(isDisableReportRule(undefined)).toBe(false);
	});
});
