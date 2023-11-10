// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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

	vscode.commands.registerCommand('gpt-code-helper.getGptSuggestions', () => {
		const activeLine = vscode.window.activeTextEditor?.document.lineAt(vscode.window.activeTextEditor.selection.active.line);
		console.log(vscode.window.activeTextEditor?.document.languageId);
		console.log(activeLine);
	});

	// Create a new status bar item
	let statusBarItem: vscode.StatusBarItem;
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = `$(megaphone) Suggest Code`;
	statusBarItem.tooltip = 'Suggest Code';
	statusBarItem.command = 'gpt-code-helper.getGptSuggestions';
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}
