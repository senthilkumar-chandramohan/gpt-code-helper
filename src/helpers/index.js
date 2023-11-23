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
                    response.data.choices.push({
                        index: 1,
                        finish_reason: 'stop',
                        message: {
                            role: 'assistant',
                            content: response.data.choices[0].message.content.toUpperCase(),
                        }
                    });

                    console.log("======================+++++++++");
                    console.log(response.data);

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

const explainCode = async (gptWebViewProvider, statusBarItem, apiKey, language, progressMessage) => {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    if (selection?.isEmpty) {
        vscode.window.showErrorMessage('Please select/highlight a block of code and try again! ');
        return;
    }

    const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
    const highlighted = editor.document.getText(selectionRange);
    // const insertSuggestionAt = selection.end.line;
    // console.log(highlighted);

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

            try {
                const query = `explain this ${language} code: ${highlighted}`;
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
                    response.data.choices.push({
                        index: 1,
                        finish_reason: 'stop',
                        message: {
                            role: 'assistant',
                            content: response.data.choices[0].message.content.toUpperCase(),
                        }
                    });

                    response.data.choices.push({
                        index: 1,
                        finish_reason: 'stop',
                        message: {
                            role: 'assistant',
                            content: response.data.choices[0].message.content.toLowerCase(),
                        }
                    });

                    console.log("======================+++++++++");
                    console.log(response.data);
                    const {
                        data: {
                            choices
                        }
                    } = response;

                    gptWebViewProvider.showSuggestions(choices);

                    // const position = new vscode.Position(insertSuggestionAt + 1, 0);
                    // const codeSuggestion = content + `\n`;
                    // insertTextInActiveTextEditor(codeSuggestion, position);
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
    explainCode,
};