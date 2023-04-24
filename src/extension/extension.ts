import { EventEmitter } from 'events';
import { LanguageClient, SettingMonitor, ExecuteCommandRequest } from 'vscode-languageclient/node';
import { workspace, commands, window } from 'vscode';
import { ApiEvent, PublicApi } from './types';
import {
	CommandId,
	DidRegisterDocumentFormattingEditProviderNotificationParams,
	Notification,
} from '../server';
import type vscode from 'vscode';

/**
 * Activates the extension.
 */
export function activate({ subscriptions }: vscode.ExtensionContext): PublicApi {
	const serverPath = require.resolve('./start-server');

	const api: PublicApi = Object.assign(new EventEmitter(), { codeActionReady: false });

	const client = new LanguageClient(
		'Ec0lintStyle',
		{
			run: {
				module: serverPath,
			},
			debug: {
				module: serverPath,
				options: {
					execArgv: ['--nolazy', '--inspect=6004'],
				},
			},
		},
		{
			documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
			diagnosticCollectionName: 'ec0lint-style',
			synchronize: {
				fileEvents: workspace.createFileSystemWatcher(
					'**/{.ec0lint-stylerc{,.js,.json,.yaml,.yml},ec0lint-style.config.js,.ec0lint-styleignore}',
				),
			},
		},
	);

	client
		.onReady()
		.then(() => {
			client.onNotification(Notification.DidRegisterCodeActionRequestHandler, () => {
				api.codeActionReady = true;
			});
			client.onNotification(
				Notification.DidRegisterDocumentFormattingEditProvider,
				(params: DidRegisterDocumentFormattingEditProviderNotificationParams) => {
					api.emit(ApiEvent.DidRegisterDocumentFormattingEditProvider, params);
				},
			);
			client.onNotification(Notification.DidResetConfiguration, () => {
				api.emit(ApiEvent.DidResetConfiguration);
			});
		})
		.catch(async (error) => {
			await window.showErrorMessage(
				`ec0lint-style: ${error instanceof Error ? error.message : String(error)}`,
			);
		});

	subscriptions.push(
		// cspell:disable-next-line
		commands.registerCommand('ec0lint-style.executeAutofix', async () => {
			const textEditor = window.activeTextEditor;

			if (!textEditor) {
				return;
			}

			const textDocument = {
				uri: textEditor.document.uri.toString(),
				version: textEditor.document.version,
			};
			const params = {
				command: CommandId.ApplyAutoFix,
				arguments: [textDocument],
			};

			await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
				await window.showErrorMessage(
					'Failed to apply ec0lint-style fixes to the document. Please consider opening an issue with steps to reproduce.',
				);
			});
		}),
	);

	subscriptions.push(new SettingMonitor(client, 'ec0lint-style.enable').start());

	return api;
}
