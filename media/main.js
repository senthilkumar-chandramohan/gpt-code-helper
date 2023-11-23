//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    // const oldState = vscode.getState() || { colors: [] };

    // /** @type {Array<{ value: string }>} */
    // let colors = oldState.colors;

    function codeToHtml(codeString) {
        // Split the code string into an array of lines
        const codeLines = codeString.split('\n');
      
        // Convert each line of code to an HTML <code> element
        const htmlLines = codeLines.map(line => `<code>${line}</code>`);
      
        // Join the lines into a single string with <br> for line breaks
        const htmlSnippet = htmlLines.join('<br>');
      
        // Return the HTML code snippet
        return htmlSnippet;
      }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const suggestions = event.data; // The data that the extension sent
        
        const suggestionsBox = document.getElementById('suggestions-box');
        document.getElementById('suggestions').innerHTML = suggestions.map(suggestion => {
            const {
                message: {
                    content,
                }
            } = suggestion;

            return `<li>${codeToHtml(content)}</li>`;
        }).join('');

        suggestionsBox.classList.add('show');
        if (suggestions.length > 1) {
            suggestionsBox.setAttribute('data-show-slides', 'true');
            suggestionsBox.setAttribute('data-active-slide', '0');
            document.getElementById('prev-suggestion').setAttribute('disabled', 'false');
            suggestionsBox.setAttribute('data-max-slide', suggestions.length - 1);
        } else {
            suggestionsBox.setAttribute('data-show-slides', 'false');
        }
    });

    document.getElementById('prev-suggestion')?.addEventListener('click',  (e) => {
        const suggestionsBox = document.getElementById('suggestions-box');
        const activeSlide = parseInt(suggestionsBox.getAttribute('data-active-slide'));
        suggestionsBox.setAttribute('data-active-slide', activeSlide - 1);

        if (parseInt(suggestionsBox?.getAttribute('data-min-slide')) === activeSlide - 1) {
            e.target.setAttribute('disabled', 'true');
        }

        if (parseInt(suggestionsBox?.getAttribute('data-max-slide')) > activeSlide - 1) {
            document.getElementById('next-suggestion')?.removeAttribute('disabled');
        }
    });

    document.getElementById('next-suggestion')?.addEventListener('click',  (e) => {
        const suggestionsBox = document.getElementById('suggestions-box');
        const activeSlide = parseInt(suggestionsBox.getAttribute('data-active-slide'));
        suggestionsBox.setAttribute('data-active-slide', activeSlide + 1);

        if (parseInt(suggestionsBox?.getAttribute('data-min-slide')) < activeSlide + 1) {
            document.getElementById('prev-suggestion')?.removeAttribute('disabled');
        }

        if (parseInt(suggestionsBox?.getAttribute('data-max-slide')) === activeSlide + 1) {
            e.target.setAttribute('disabled', 'true');
        }
    });
}());
