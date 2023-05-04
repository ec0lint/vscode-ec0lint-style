import {
	CompletionItem,
	CompletionItemKind,
	InsertTextFormat,
	MarkupKind,
} from 'vscode-languageserver-types';
import type { DisableType } from '../documents';

/**
 * Creates a disable completion item for the given disable type. Uses the given rule if one is
 * provided, otherwise uses a placeholder.
 */
export function createDisableCompletionItem(disableType: DisableType, rule = ''): CompletionItem {
	const item = CompletionItem.create(disableType);

	item.kind = CompletionItemKind.Snippet;
	item.insertTextFormat = InsertTextFormat.Snippet;

	if (disableType === 'ec0lint-style-disable') {
		item.insertText = `/* ec0lint-style-disable \${0:${rule || 'rule'}} */\n/* ec0lint-style-enable \${0:${
			rule || 'rule'
		}} */`;
		item.detail =
			'Turn off all ec0lint-style or individual rules, after which you do not need to re-enable ec0lint-style. (ec0lint-style)';
		item.documentation = {
			kind: MarkupKind.Markdown,
			value: `\`\`\`css\n/* ec0lint-style-disable ${rule || 'rule'} */\n/* ec0lint-style-enable ${
				rule || 'rule'
			} */\n\`\`\``,
		};
	} else {
		item.insertText = `/* ${disableType} \${0:${rule || 'rule'}} */`;
		item.detail =
			disableType === 'ec0lint-style-disable-line'
				? 'Turn off ec0lint-style rules for individual lines only, after which you do not need to explicitly re-enable them. (ec0lint-style)'
				: 'Turn off ec0lint-style rules for the next line only, after which you do not need to explicitly re-enable them. (ec0lint-style)';
		item.documentation = {
			kind: MarkupKind.Markdown,
			value: `\`\`\`css\n/* ${disableType} ${rule || 'rule'} */\n\`\`\``,
		};
	}

	return item;
}
