import * as vscode from 'vscode';
import axios from 'axios';

const insertTextInActiveTextEditor = (text, position) => {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        editor.edit(editBuilder => {
            editBuilder.insert(position, text);
        });
        return true;
    } else {
        vscode.window.showErrorMessage('No active text editor found');
        return false;
    }
};

const suggestCodeFromComment = async (gptWebViewProvider, statusBarItem, apiKey, language, comment, insertSuggestionAt) => {
    if (comment.trim() === '') {
        vscode.window.showErrorMessage('Please move prompt to a comment and try again! ');
        return;
    }

    // Show loader in status bar
    statusBarItem.text = `$(sync~spin) GPT Code Helper`;

    // Show progress notification
    const showProgressNotification = () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Progress',
            cancellable: true
        }, async (progress, token) => {
            let showSuggestion = true;

            token.onCancellationRequested(() => {
                showSuggestion = false;
                statusBarItem.text = '$(code) GPT Code Helper';
				console.log("User canceled operation");
			});

            progress.report({ increment: 0 });
            setTimeout(() => {
                progress.report({ increment: 30, message: "Fetching code suggestion..." });
            }, 1000);

            setTimeout(() => {
                progress.report({ increment: 40, message: "Fetching code suggestion..." });
            }, 3000);

            try {
                const query = `suggest just code, no comments in ${language} to ${comment} `;
                const url = 'https://api.openai.com/v1/chat/completions';
                const data = {
                    model: 'gpt-3.5-turbo',
                    messages: [
                    {'role': 'user', 'content': query}
                    ],
                    temperature: 0.7
                };

                const headers = {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "Authorization": `Bearer ${apiKey}`,
                };

                const response = await axios.post(url, data, { headers });
                
                if (showSuggestion) {
                    const {
                        choices: [{
                            message: {
                                content,
                            }
                        }]
                    } = response.data;

                    const position = new vscode.Position(insertSuggestionAt + 1, 0);
                    const codeSuggestion = content + `\n`;
                    
                    insertTextInActiveTextEditor(codeSuggestion, position);
                }
            } catch (error) {
                console.error('Error:', error);
                if (showSuggestion) {
                    vscode.window.showInformationMessage('Error fetching code suggestion, please try again!');
                }
            } finally {
                if (showSuggestion) {
                    statusBarItem.text = '$(code) GPT Code Helper';
                }
            }
        });
    };

    showProgressNotification();
};

const getSuggestions = async (suggestionType, gptWebViewProvider, statusBarItem, apiKey, language, progressMessage) => {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    if (selection?.isEmpty) {
        vscode.window.showErrorMessage('Please select/highlight a block of code and try again! ');
        return;
    }

    const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
    const highlighted = editor.document.getText(selectionRange);

    // Show loader in status bar
    statusBarItem.text = `$(sync~spin) GPT Code Helper`;

    // Show progress notification
    const showProgressNotification = () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Progress',
            cancellable: true
        }, async (progress, token) => {
            let showSuggestion = true;

            token.onCancellationRequested(() => {
                showSuggestion = false;
                statusBarItem.text = '$(code) GPT Code Helper';
                console.log("User canceled operation");
            });

            progress.report({ increment: 0 });
            setTimeout(() => {
                progress.report({ increment: 30, message: progressMessage });
            }, 1000);

            setTimeout(() => {
                progress.report({ increment: 40, message: progressMessage });
            }, 3000);

            let query;

            switch (suggestionType) {
                case "explainCode" : query = `explain this ${language} code: ${highlighted}`; break;
                case "genUnitTestCode": query= `generate unit test code for ${language} code: ${highlighted}`; break;
                case "genUnitTestCases": query= `generate unit test cases for ${language} code: ${highlighted}`; break;
                case "fixBugs": query= `fix bugs in ${language} code: ${highlighted}`; break;
                case "addDebugCode": query= `add debugger lines in ${language} code: ${highlighted}`; break;
                case "cleanCode": query= `treeshake ${language} code: ${highlighted}`; break;
                default: 
            };

            try {
                const url = 'https://api.openai.com/v1/chat/completions';
                const data = {
                    model: 'gpt-3.5-turbo',
                    messages: [
                    {'role': 'user', 'content': query}
                    ],
                    temperature: 0.7
                };

                const headers = {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "Authorization": `Bearer ${apiKey}`,
                };

                const response = await axios.post(url, data, { headers });

                if (showSuggestion) {
                    const {
                        data: {
                            choices
                        }
                    } = response;

                    gptWebViewProvider.showSuggestions(suggestionType, choices);
                }
            } catch (error) {
                if (showSuggestion) {
                    vscode.window.showInformationMessage('Error fetching code suggestion, please try again!');
                }
            } finally {
                if (showSuggestion) {
                    statusBarItem.text = '$(code) GPT Code Helper';
                }
            }
        });
    };

    showProgressNotification();
};

export {
    suggestCodeFromComment,
    getSuggestions,
};
