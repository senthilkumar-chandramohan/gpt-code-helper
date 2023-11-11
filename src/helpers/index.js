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

const suggestCodeFromComment = (apiKey, language, comment, insertSuggestionAt) => {
    const query = `${language} code to ${comment} `;
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

    axios.post(url, data, { headers })
    .then(response => {
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
    })
    .catch(error => {
        console.error('Error:', error);
    });
};

export {
    suggestCodeFromComment,
};