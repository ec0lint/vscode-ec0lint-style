import { EventEmitter } from 'events';
import { LanguageClient, SettingMonitor } from 'vscode-languageclient/node';
import { workspace, window } from 'vscode';
import { ApiEvent, PublicApi } from './types';
import {
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

	subscriptions.push(new SettingMonitor(client, 'ec0lint-style.enable').start());

	return api;
}
