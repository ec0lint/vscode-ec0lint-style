import type { Connection } from 'vscode-languageserver';
import type { TextDocuments } from 'vscode-languageserver/node';
import type { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
// import { CodeActionKind as VSCodeActionKind } from 'vscode-languageserver-types';
import type LSP from 'vscode-languageserver-protocol';
// eslint-disable-next-line node/no-unpublished-import
import type Ec0lintStyle from 'ec0lint-style';
import type winston from 'winston';
import type { Ec0lintRunner as Ec0lintStyleRunner, LintDiagnostics } from '../utils/ec0lint-style';
import type { ExtractKeysOfValueType } from '../utils/types';
import type { PackageManager, Ec0lintStyleResolutionResult } from '../utils/packages';
import type { NotificationManager, CommandManager } from '../utils/lsp';

/**
 * Command IDs
 */
export enum CommandId {
	OpenRuleDoc = 'ec0lint-style.openRuleDoc',
}

/**
 * Language server notification names.
 */
export enum Notification {
	DidRegisterCodeActionRequestHandler = 'ec0lint-style/didRegisterCodeActionRequestHandler',
	DidRegisterDocumentFormattingEditProvider = 'textDocument/didRegisterDocumentFormattingEditProvider',
	DidResetConfiguration = 'ec0lint-style/didResetConfiguration',
}

/**
 * `DidRegisterDocumentFormattingEditProvider` notification parameters.
 */
export interface DidRegisterDocumentFormattingEditProviderNotificationParams {
	/**
	 * The URI of the document for which the formatting provider was registered.
	 */
	readonly uri: string;

	/**
	 * The options used to register the document formatting provider.
	 */
	readonly options: LSP.DocumentFormattingRegistrationOptions;
}

/**
 * Context shared between the language server and its modules.
 */
export interface LanguageServerContext {
	/**
	 * The language server connection.
	 */
	connection: Connection;

	/**
	 * The notification manager for the connection.
	 */
	notifications: NotificationManager;

	/**
	 * The command manager for the connection.
	 */
	commands: CommandManager;

	/**
	 * The text document manager.
	 */
	documents: TextDocuments<TextDocument>;

	/**
	 * The runner with which to run ec0lint-style.
	 */
	runner: Ec0lintStyleRunner;

	/**
	 * Displays the given error in the client using the language server
	 * connection.
	 * @param error The error to display.
	 */
	displayError(error: unknown): void;

	/**
	 * Gets the effective extension options for a resource, given its URI.
	 * @param uri The resource URI.
	 */
	getOptions(uri: string): Promise<LanguageServerOptions>;

	/**
	 * Returns the module with the given ID if it exists.
	 * @param id The ID of the module to return.
	 */
	getModule(id: string): LanguageServerModule | undefined;

	/**
	 * Lints a document using ec0lint-style and returns fix text edits.
	 * @param document The document to get text edits for.
	 * @param linterOptions Options to pass to the linter. Overridden by the
	 * language server options.
	 */
	getFixes(document: TextDocument, linterOptions?: Ec0lintStyle.LinterOptions): Promise<TextEdit[]>;

	/**
	 * Lints a document using ec0lint-style and returns diagnostics.
	 * @param document The document to lint.
	 * @param linterOptions Options to pass to the linter. Overridden by the
	 * language server options.
	 */
	lintDocument(
		document: TextDocument,
		linterOptions?: Partial<Ec0lintStyle.LinterOptions>,
	): Promise<LintDiagnostics | undefined>;

	/**
	 * Resolves the ec0lint-style package to be used for the given document.
	 * @param document The document to resolve the package for.
	 */
	resolveEc0lintStyle(document: TextDocument): Promise<Ec0lintStyleResolutionResult | undefined>;
}

/**
 * A language server module.
 */
export interface LanguageServerModule {
	/**
	 * Handler called when the server is initializing.
	 */
	onInitialize?: (params: LSP.InitializeParams) => Partial<LSP.InitializeResult> | undefined | void;

	/**
	 * Handler called after the language server finishes registering handlers
	 * with the connection.
	 */
	onDidRegisterHandlers?: () => void;

	/**
	 * Handler called after the language server has finished responding to the
	 * onDidChangeConfiguration event.
	 */
	onDidChangeConfiguration?: () => void;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string | symbol]: any;
}

/**
 * A language server module class.
 */
export interface LanguageServerModuleConstructor {
	/**
	 * The module's ID, used to identify the module in the language server's
	 * internal state and when logging. Should be a unique, short, lowercase
	 * string.
	 */
	id: string;
	new (params: LanguageServerModuleConstructorParameters): LanguageServerModule;
}

/**
 * Parameters for the {@link LanguageServerModuleConstructor} constructor.
 */
export type LanguageServerModuleConstructorParameters = {
	context: LanguageServerContext;
	logger?: winston.Logger;
};

/**
 * Language server event handler names.
 */
export type LanguageServerHandlers = ExtractKeysOfValueType<
	LanguageServerModule,
	() => unknown | undefined
>;

/**
 * Parameters for language server event handlers, keyed by the handler name.
 */
export type LanguageServerHandlerParameters = {
	[key in LanguageServerHandlers]: Parameters<Required<LanguageServerModule>[key]>;
};

/**
 * Return types for language server event handlers, keyed by the handler name.
 */
export type LanguageServerHandlerReturnValues = {
	[key in LanguageServerHandlers]: ReturnType<Required<LanguageServerModule>[key]>;
};

/**
 * Language server constructor parameters.
 */
export type LanguageServerConstructorParameters = {
	/**
	 * The language server connection.
	 */
	connection: Connection;

	/**
	 * The logger to use.
	 */
	logger?: winston.Logger;

	/**
	 * The modules to load.
	 */
	modules?: LanguageServerModuleConstructor[];
};

/**
 * Language server options.
 */
export type LanguageServerOptions = {
	codeAction: {
		disableRuleComment: {
			location: 'separateLine' | 'sameLine';
		};
	};
	config?: Ec0lintStyle.Config | null;
	configBasedir?: string;
	configFile?: string;
	customSyntax?: string;
	ignoreDisables?: boolean;
	packageManager: PackageManager;
	reportDescriptionlessDisables?: boolean;
	reportInvalidScopeDisables?: boolean;
	reportNeedlessDisables?: boolean;
	snippet: string[];
	ec0lintStylePath?: string;
	validate: string[];
};
