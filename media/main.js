//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    function getHeadingForSuggestionType(suggestionType) {
        switch (suggestionType) {
            case 'explainCode' : return 'Code Explanation';
            case 'genUnitTestCode': return 'Unit Test Code';
            case 'genUnitTestCases': return 'Unit Test case(s)';
            case 'fixBugs': return 'Bug fix';
            case 'addDebugCode': return 'Add debuggers';
            case 'cleanCode': return 'Code cleaning / Tree-shaking';
            default: return '';
        }
    }

    function renderMenuSuggestions() {
        const menu = document.getElementById('menu');
        const suggestionsBox = document.getElementById('suggestions-box');
        const suggestionsUL = document.getElementById('suggestions');
        const suggestionTypeH2 = document.getElementById('suggestion-type');

        const suggestionsData = vscode.getState()?.suggestionsData;

        if (!suggestionsData) {
            menu?.classList.add('show');
            suggestionsBox?.setAttribute('data-show-slides', 'false');
            suggestionsBox.classList.remove('show');
            suggestionsUL.innerHTML = '';
            suggestionTypeH2.innerHTML = '';
            return;
        }

        const { suggestions, suggestionType } = suggestionsData;

        suggestionTypeH2.innerHTML = getHeadingForSuggestionType(suggestionType);
        suggestionsUL.innerHTML = suggestions.map(suggestion => {
            const {
                message: {
                    content,
                }
            } = suggestion;

            return `<li>${codeToHtml(content)}</li>`;
        }).join('');

        menu.classList.remove('show');
        suggestionsBox.classList.add('show');

        if (suggestions.length > 1) {
            suggestionsBox.setAttribute('data-show-slides', 'true');
            suggestionsBox.setAttribute('data-active-slide', '0');
            document.getElementById('prev-suggestion').setAttribute('disabled', 'false');
            suggestionsBox.setAttribute('data-max-slide', suggestions.length - 1);
        } else {
            suggestionsBox.setAttribute('data-show-slides', 'false');
        }
    }

    renderMenuSuggestions();

    function htmlToCode(htmlSnippet) {
        // Split the HTML string into an array of lines
        const lines = htmlSnippet.split('<br>');
      
        // Remove <code> tags and trim each line
        const codeLines = lines.map(line => line.replace(/<\/?code>/g, '').trim());
      
        // Return the array of code lines
        return codeLines;
      }

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
        vscode.setState( { suggestionsData: event.data });
        renderMenuSuggestions();
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

    document.getElementById('add-suggestion')?.addEventListener('click',  (e) => {
        const suggestionsBox = document.getElementById('suggestions-box');
        const showSlides = suggestionsBox.getAttribute('data-show-slides');

        const activeSlide = showSlides === "true" ? parseInt(suggestionsBox.getAttribute('data-active-slide')) : 0;
        
        const suggestionsUL = document.getElementById('suggestions');
        var listItem = suggestionsUL.children[activeSlide];
        var textToCopy = htmlToCode(listItem.innerHTML).join('\n');
        vscode.postMessage({ type: 'addSuggestion', value: textToCopy });
    });

    document.getElementById('clear-suggestion')?.addEventListener('click',  (e) => {
        vscode.setState({ suggestionsData: null });
        renderMenuSuggestions();
    });

    var elements = document.getElementsByClassName('tile');

        // Attach a click event to each element
        for (var i = 0; i < elements.length; i++) {
            elements[i].addEventListener('click', (e) => {
                const command = e.target.getAttribute('data-command');
                console.log(command);
                vscode.postMessage({ type: 'runCommand', command });
            });
        }
}());
