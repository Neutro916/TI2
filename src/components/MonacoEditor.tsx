import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, EditorProps } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { FileData } from '../types';

interface MonacoEditorComponentProps {
  file: FileData | undefined;
  onChange: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
  language?: string;
  readOnly?: boolean;
  minimap?: boolean;
  fontSize?: number;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  lineNumbers?: 'on' | 'off' | 'relative' | ((lineNumber: number) => string);
  automaticLayout?: boolean;
}

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    R: 'r',
    lua: 'lua',
    perl: 'perl',
    pl: 'perl',
    pm: 'perl',
  };
  return langMap[ext || ''] || 'plaintext';
};

const MonacoEditorComponent: React.FC<MonacoEditorComponentProps> = ({
  file,
  onChange,
  onMount,
  theme = 'vs-dark',
  language,
  readOnly = false,
  minimap = true,
  fontSize = 14,
  wordWrap = 'on',
  lineNumbers = 'on',
  automaticLayout = true,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const detectedLanguage = language || (file ? getLanguageFromFileName(file.name) : 'plaintext');

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom theme for ANTICLAW-2 aesthetic
    monaco.editor.defineTheme('anticlaw-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'ffb000', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'ffffff' },
        { token: 'string', foreground: '4ade80' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'number', foreground: 'fb923c' },
        { token: 'type', foreground: '60a5fa', fontStyle: 'bold' },
        { token: 'class', foreground: 'f472b6', fontStyle: 'bold' },
        { token: 'function', foreground: 'a78bfa' },
        { token: 'variable', foreground: 'fbbf24' },
        { token: 'operator', foreground: 'fb7185' },
        { token: 'delimiter', foreground: 'fbbf24' },
        { token: 'tag', foreground: '60a5fa' },
        { token: 'attribute.name', foreground: 'f472b6' },
        { token: 'attribute.value', foreground: '4ade80' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#e5e5e5',
        'editor.lineHighlightBackground': '#ffb00010',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#ffb000',
        'editorCursor.foreground': '#ffb000',
        'editor.selectionBackground': '#ffb00030',
        'editor.findMatchBackground': '#ffb00040',
        'editor.findMatchHighlightBackground': '#ffb00020',
        'editor.hoverHighlightBackground': '#ffb00015',
        'editorIndentGuide.background': '#27272a',
        'editorIndentGuide.activeBackground': '#ffb00040',
        'editorRuler.foreground': '#27272a',
        'minimap.background': '#0a0a0f',
        'minimap.findMatchHighlight': '#ffb00040',
        'minimap.selectionHighlight': '#ffb00030',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#ffb00020',
        'scrollbarSlider.hoverBackground': '#ffb00040',
        'scrollbarSlider.activeBackground': '#ffb00060',
        'titleBar.activeBackground': '#0a0a0f',
        'titleBar.activeForeground': '#e5e5e5',
      }
    });

    // Set the custom theme
    monaco.editor.setTheme('anticlaw-dark');

    // Add custom IntelliSense for T2I/ANTICLAW commands
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'anticlaw',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'ANTICLAW-2',
            detail: 'ANTICLAW-2 Sovereign Command',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            }
          },
          {
            label: 'sovereign',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SOVEREIGN',
            detail: 'Sovereign Access Token',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            }
          },
          {
            label: 't2i',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 't2i:${1:command}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'T2I Command',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            }
          },
        ];

        return { suggestions };
      }
    });

    // Enable bracket pair colorization
    editor.updateOptions({
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        indentation: true,
        highlightActiveIndentation: true,
      },
      minimap: {
        enabled: minimap,
      },
      fontSize,
      wordWrap: wordWrap as any,
      lineNumbers: lineNumbers as any,
      readOnly,
      automaticLayout,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 8, bottom: 8 },
      renderWhitespace: 'selection',
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'full',
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
    });

    if (onMount) {
      onMount(editor);
    }
  };

  const handleChange = (value: string | undefined) => {
    if (value !== undefined && onChange) {
      onChange(value);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0f] text-zinc-500">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black tracking-[8px] opacity-20">NO FILE</div>
          <div className="text-sm uppercase tracking-widest opacity-40">Select a file to begin editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        height="100%"
        language={detectedLanguage}
        value={file.raw || ''}
        theme="anticlaw-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: minimap },
          fontSize,
          wordWrap,
          lineNumbers,
          readOnly,
          automaticLayout,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 8, bottom: 8 },
          renderWhitespace: 'selection',
          formatOnPaste: true,
          formatOnType: true,
          autoIndent: 'full',
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          bracketPairColorization: {
            enabled: true,
            independentColorPoolPerBracketType: true,
          },
          guides: {
            bracketPairs: true,
            bracketPairsHorizontal: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
