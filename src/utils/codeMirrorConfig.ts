import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { placeholder } from '@codemirror/view';

export const getCodeMirrorExtensions = (fileType: string, placeholderText: string = 'Write your code here') => {
  let extensions: any[] = [];
  if (fileType === 'html') {
    extensions = [html(), placeholder(placeholderText)];
  } else if (fileType === 'css') {
    extensions = [css(), placeholder(placeholderText)];
  } else if (fileType === 'js') {
    extensions = [javascript(), placeholder(placeholderText)];
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
