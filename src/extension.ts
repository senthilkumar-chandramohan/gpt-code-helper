// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import { suggestCodeFromComment, getSuggestions } from './helpers/index';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	class GPTWebViewProvider implements vscode.WebviewViewProvider {
		public static readonly viewType = 'gpt-code-helper.sideBarView';

		private _view?: vscode.WebviewView;

		constructor(
			private readonly _extensionUri: vscode.Uri,
		) { }

		public resolveWebviewView(
			webviewView: vscode.WebviewView,
			wvContext: vscode.WebviewViewResolveContext,
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
					case 'addSuggestion':
						{
							vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`${data.value}`));
							break;
						}
					case 'runCommand':
						{
							const codeLanguage = vscode.window.activeTextEditor?.document.languageId;

							if (!codeLanguage) {
								vscode.window.showInformationMessage('Language is not set, please select filetype on bottom-right of vscode and try again.');
								return;
							}

							// Get the API Key from the configuration setting
							const apiKey: string | undefined = context.globalState.get('gptApiKey');

							if (!apiKey) {
								vscode.window.showInformationMessage('GPT API Key is not set, please click on "GPT Code Helper" on status bar (bottom-right) to set it and try again.');
								return;
							}

							if (data.command === 'suggestCode') {
								const activeLine = vscode.window.activeTextEditor?.document.lineAt(vscode.window.activeTextEditor.selection.active.line);
								suggestCodeFromComment(gptWebViewProvider, statusBarItem, apiKey, codeLanguage, activeLine?.text, activeLine?.lineNumber);
							} else {
								getSuggestions(data.command, gptWebViewProvider, statusBarItem, apiKey, codeLanguage, 'Fetching suggestions from GPT...');
							}
						}
				}
			});
		}

		public showSuggestions(suggestionsData: Object) {
			if (this._view) {
				this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
				this._view.webview.postMessage(suggestionsData);
			}
		}

		private _getHtmlForWebview(webview: vscode.Webview) {
			// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
			const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

			// Do the same for the stylesheet.
			const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
			const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
			const styleBootStrapGridUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'bootstrap-grid.min.css'));
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
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

					<meta name="viewport" content="width=device-width, initial-scale=1.0">

					<link href="${styleResetUri}" rel="stylesheet">
					<link href="${styleVSCodeUri}" rel="stylesheet">
					<link href="${styleBootStrapGridUri}" rel="stylesheet">
					<link href="${styleMainUri}" rel="stylesheet">

					<title>GPT Code Helper</title>
				</head>
				<body>
					<div class="container">
						<div class="row">
							<div class="col-md-12">
								<div id="menu" class="menu">
									<div class="container">
										<div class="row">
											<div class="col-12">
												<h3>How can I help?</h3>
											</div>
										</div>
										<div class="row">
											<div class="col-4">
												<button class="tile code" data-command="suggestCode">Suggest code from comment</button>
											</div>
											<div class="col-4">
												<button class="tile explain" data-command="explainCode">Explain selected code</button>
											</div>
											<div class="col-4">
												<button class="tile clean" data-command="cleanCode">Clean/Tree-shake code</button>
											</div>
										</div>
										<div class="row">
											<div class="col-4">
												<button class="tile debug" data-command="addDebugCode">Add debuggers</button>
											</div>
											<div class="col-4">
												<button class="tile fixbugs" data-command="fixBugs">Fix bugs in selected code</button>
											</div>
											<div class="col-4">
												<button class="tile unit-test-code" data-command="genUnitTestCode">Generate Unit Test Code</button>
											</div>
										</div>
										<div class="row">
											<div class="col-4">
												<button class="tile unit-test-cases" data-command="genUnitTestCases">Suggest Unit Test Cases</button>
											</div>
											<div class="col-4">
											</div>
											<div class="col-4">
											</div>
										</div>
									</div>
								</div>
								<div id="suggestions-box" class="suggestions-box" data-show-slides="false" data-min-slide="0" data-max-slide="0">
									<div class="container">
										<div class="row">
											<div class="col-12">
												<h3 id="suggestion-type"></h3>
											</div>
										</div>
										<div class="row">
											<div class="col-3">
												<button id="prev-suggestion" class="prev-suggestion"><</button>
												<button id="next-suggestion" class="next-suggestion">></button>
											</div>
											<div class="col-3">
												<button id="clear-suggestion" class="clear-suggestion">Clear</button>
											</div>
											<div class="col-6">
												<button id="add-suggestion" class="add-suggestion">Copy to Editor  &rarr;</button>
											</div>
										</div>
									</div>
									<ul id="suggestions" class="suggestions"></ul>
								</div>
							</div>
						</div>
					</div>

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

	const gptWebViewProvider = new GPTWebViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(GPTWebViewProvider.viewType, gptWebViewProvider));

	vscode.commands.registerCommand('gpt-code-helper.manageGptApiKey', async () => {
		const quickPickItems = [
			{
				label: 'Set GPT API Key',
				detail: 'Set GPT API Key so you can start using the extension.',
				command: 'setGptApiKey'
			},
			{
				label: 'Delete GPT API Key',
				detail: 'Delete GPT API Key, so it can no longer be used to query GPT',
				command: 'deleteGptApiKey'
			}
		];

		const optionSelected = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'How can I help?',
			matchOnDetail: true
		});

		switch (optionSelected?.command) {
			case 'setGptApiKey': {
				const apiKey = await vscode.window.showInputBox({
					prompt: 'Please enter your GPT API Key',
					placeHolder: 'GPT API Key'
				});

				if (apiKey && apiKey.length) {
					context.globalState.update('gptApiKey', apiKey);
					vscode.window.showInformationMessage('GPT API Key set successfully');
				} else {
					vscode.window.showErrorMessage('Please enter a valid GPT API Key');
				}
				break;
			}
			case 'deleteGptApiKey': {
				const apiKey = context.globalState.get('gptApiKey');

				if (!apiKey) {
					vscode.window.showErrorMessage('GPT API Key is already not set.');
					return;
				}

				const choice = await vscode.window.showInformationMessage(
					'Are you sure you want to delete GPT API Key?',
					{ modal: true },
					'Yes',
					'No'
				);

				if (!choice || choice === 'No') {
					return;
				}

				try {
					context.globalState.update('gptApiKey', undefined);
					vscode.window.showInformationMessage('GPT API Key deleted successfully.');
				} catch {
					vscode.window.showErrorMessage('Error while deleting GPT API Key, please try again.');
				}
				break;
			}
		}
	});

	// Create a new status bar item
	let statusBarItem: vscode.StatusBarItem;
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = `$(code) GPT Code Helper`;
	statusBarItem.tooltip = 'Click and select from options above';
	statusBarItem.command = 'gpt-code-helper.manageGptApiKey';
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
	const panel = vscode.window.createWebviewPanel(
        'welcome', // Identifies the type of the webview. Used internally
        'Welcome to GPT Code Helper!', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in
        {
            enableScripts: false,
        }
    );

	// Get the path to the webview content on disk
    const onDiskPath = vscode.Uri.file(
        path.join(context.extensionPath, 'demo')
    );

    // Convert the on-disk path to a vscode-resource URI
    const webViewPath = panel.webview.asWebviewUri(onDiskPath);

	const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to GPT Code Helper</title>
        </head>
        <body>
			<h1>Welcome to GPT Code Helper</h1>
			<h2>VSCode Extension to help you to write code, powered by GPT from OpenAI.</h2>
			
			<h3>Features</h3>
			<ol>
				<li>Code suggestion from a given one-line comment</li>
				<li>Code explanation</li>
				<li>Code cleaning / Tree-shaking</li>
				<li>Adding Debugger code</li>
				<li>Bug fixing</li>
				<li>Unit tests generation</li>
				<li>Unit test cases generation</li>
			</ol>
			
			<h4>Samples:</h4>
			<img src="${webViewPath}/demo1.gif" style="width: 90%" />
			<img src="${webViewPath}/demo2.gif" style="width: 90%" />
			
			<h3>Requirements</h3>
			<p>Need GPT API Key from <a href="https://platform.openai.com/api-keys">https://platform.openai.com/api-keys</a></p>

			<h3>Getting Started</h3>
			<ol>
				<li>Click on '&lt;/&gt; GPT Code Helper' status bar item on bottom-right</li>
				<li>Click on 'Set GPT API Key' option</li>
				<li>Enter your GPT API Key copied from <a href="https://platform.openai.com/api-keys">https://platform.openai.com/api-keys</a></li>
				<li>Open 'GPT CODE HELPER' webview from Explorer side bar on the left</li>
				<li>Select from available options</li>
			</ol>
			<h3>Developer Info</h3>
			<p>&copy; Senthil Chandramohan</p>
			<a class="github" target="_blank" rel="noreferrer" href="https://github.com/senthilkumar-chandramohan">Github</a>
			<a class="linkedin" target="_blank" rel="noreferrer" href="https://www.linkedin.com/in/senthilkumar-chandramohan/">LinkedIn</a>
		</body>
        </html>
    `;

    // And load the welcome screen into the webview
    panel.webview.html = htmlContent;
}

// This method is called when your extension is deactivated
export function deactivate() {}
