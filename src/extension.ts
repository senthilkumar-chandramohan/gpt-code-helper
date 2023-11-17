// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { suggestCodeFromComment, explainCode } from './helpers/index.js';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const gptWebViewProvider = new GPTWebViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(GPTWebViewProvider.viewType, gptWebViewProvider));
	
	// Bito: Register command for setting GPT API Key
	vscode.commands.registerCommand('gpt-code-helper.setGptApiKey', () => {
		// The code you place here will be executed every time the command is executed
		// Ask the user for the GPT API Key
		vscode.window.showInputBox({
			prompt: 'Please enter your GPT API Key',
			placeHolder: 'GPT API Key'
		}).then((apiKey) => {
			if (apiKey && apiKey.length) {
				console.log("API KEY1: ", apiKey);
				// Save the API Key in a configuration setting
				// vscode.workspace.getConfiguration().update('gpt-code-helper.gptApiKey', apiKey, vscode.ConfigurationTarget.Global);
				context.globalState.update('gptApiKey', apiKey);

				// Display a success message to the user
				vscode.window.showInformationMessage('GPT API Key set successfully');
			} else {
				vscode.window.showErrorMessage('Please enter a valid GPT API Key');
			}
		});
	});

	// Bito: Register command to show GPT API Key set already
	vscode.commands.registerCommand('gpt-code-helper.getGptApiKey', () => {
		// Get the API Key from the configuration setting
		const apiKey = context.globalState.get('gptApiKey');
		// Check if the API Key is set
		if (apiKey) {
			// Display the API Key to the user
			vscode.window.showInformationMessage(`GPT API Key: ${apiKey}`);
		} else {
			// Display a message if the API Key is not set
			vscode.window.showErrorMessage('GPT API Key is not set');
		}
	});

	vscode.commands.registerCommand('gpt-code-helper.getGptSuggestions', async () => {
		const activeLine = vscode.window.activeTextEditor?.document.lineAt(vscode.window.activeTextEditor.selection.active.line);
		const codeLanguage = vscode.window.activeTextEditor?.document.languageId;

		const quickPickItems = [
			{
				label: 'Suggest Code from Comment',
				detail: 'Get GPT Code Suggestion from a single line comment',
				command: 'suggestCode'
			},
			{
				label: 'Explain Code',
				detail: 'Explain selected/highlighted code',
				command: 'explainCode'
			}
		];

		const optionSelected = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'How can I help?',
			matchOnDetail: true
		});

		// Get the API Key from the configuration setting
		const apiKey = context.globalState.get('gptApiKey');

		switch (optionSelected?.command) {
			case 'suggestCode': {
				suggestCodeFromComment(gptWebViewProvider, statusBarItem, apiKey, codeLanguage, activeLine?.text, activeLine?.lineNumber);
				break;
			}
			
			case 'explainCode': {
				explainCode(gptWebViewProvider, statusBarItem, apiKey, codeLanguage, 'Fetching code explanation...');
				break;
			}
			
			default: {

			}
		}
	});

	// Create a new status bar item
	let statusBarItem: vscode.StatusBarItem;
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = `$(code) GPT Code Helper`;
	statusBarItem.tooltip = 'Click and select from options above';
	statusBarItem.command = 'gpt-code-helper.getGptSuggestions';
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
}

class GPTWebViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'gpt-code-helper.sideBarView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public showSuggestions(suggestions:Array<Object>) {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage(suggestions);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>GPT Code Helper</title>
			</head>
			<body>
				<p>Suggestions go here...</p>
				<div id="suggestions"></div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
