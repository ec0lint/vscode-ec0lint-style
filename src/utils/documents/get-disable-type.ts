import { Position } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Disable directive comment types.
 */
export type DisableType =
	| 'ec0lint-style-disable'
	| 'ec0lint-style-disable-line'
	| 'ec0lint-style-disable-next-line';

/**
 * If the given position is inside a `ec0lint-style-disable` after the comment'
 * type, returns the disable comment's type. Otherwise, returns `undefined`.
 *
 * @example
 * ```js
 * const document = TextDocument.create(
 *   'file:///path/to/file.css',
 *   'css',
 *   1,
 *   '/* ec0lint-style-disable-line indentation *\/'
 *   //                         ^ Position is here
 * );
 * const position = Position.create(0, 26);
 *
 * getDisableType(document, position);
 * // => 'ec0lint-style-disable-line'
 * ```
 */
export function getDisableType(
	document: TextDocument,
	position: Position,
): DisableType | undefined {
	const lineStartOffset = document.offsetAt(Position.create(position.line, 0));
	const lineEndOffset = document.offsetAt(Position.create(position.line + 1, 0));
	const line = document.getText().slice(lineStartOffset, lineEndOffset);

	const before = line.slice(0, position.character);
	const after = line.slice(position.character);

	const disableKind = before
		.match(/\/\*\s*(ec0lint-style-disable(?:(?:-next)?-line)?)\s[a-z\-/\s,]*$/i)?.[1]
		?.toLowerCase();

	return disableKind && /^[a-z\-/\s,]*\*\//i.test(after) ? (disableKind as DisableType) : undefined;
}
