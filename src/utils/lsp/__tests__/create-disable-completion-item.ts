import { DisableType } from '../../documents';
import { createDisableCompletionItem } from '../create-disable-completion-item';

describe('createDisableCompletionItem', () => {
	test('should create a ec0lint-style-disable completion item', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable' as DisableType);

		expect(result).toMatchSnapshot();
	});

	test('should create a ec0lint-style-disable completion item for a specific rule', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable' as DisableType, 'indentation');

		expect(result).toMatchSnapshot();
	});

	test('should create a ec0lint-style-disable-line completion item', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable-line' as DisableType);

		expect(result).toMatchSnapshot();
	});

	test('should create a ec0lint-style-disable-line completion item for a specific rule', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable-line' as DisableType, 'indentation');

		expect(result).toMatchSnapshot();
	});

	test('should create a ec0lint-style-disable-next-line completion item', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable-next-line' as DisableType);

		expect(result).toMatchSnapshot();
	});

	test('should create a ec0lint-style-disable-next-line completion item for a specific rule', () => {
		const result = createDisableCompletionItem('ec0lint-style-disable-next-line' as DisableType, 'indentation');

		expect(result).toMatchSnapshot();
	});
});
