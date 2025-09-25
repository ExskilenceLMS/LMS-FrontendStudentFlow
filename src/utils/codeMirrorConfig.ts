import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

export const getCodeMirrorExtensions = (fileType: string) => {
  let extensions: any[] = [];
  if (fileType === 'html') {
    extensions = [html()];
  } else if (fileType === 'css') {
    extensions = [css()];
  } else if (fileType === 'js') {
    extensions = [javascript()];
  }
  return extensions;
};

export const getCodeMirrorBasicSetup = () => ({
  history: true,
  lineNumbers: true,
  foldGutter: true,
  dropCursor: false,
  allowMultipleSelections: false,
  indentOnInput: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  highlightSelectionMatches: true
});

export const getCodeMirrorStyle = () => ({
  backgroundColor: 'white',
  overflow: 'auto'
});
