//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    // const oldState = vscode.getState() || { colors: [] };

    // /** @type {Array<{ value: string }>} */
    // let colors = oldState.colors;

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const suggestions = event.data; // The data that the extension sent
        
        document.getElementById('suggestions').innerHTML = suggestions.map(suggestion => {
            return `<div>${suggestion.text}</div>`;
        }).join('');
    });
}());

