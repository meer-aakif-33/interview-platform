"use client";

import Editor from "@monaco-editor/react";

interface Props {
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditorPanel({ code, onChange }: Props) {
  return (
    <Editor
      height="100%"
      language="javascript"
      theme="vs-dark"
      value={code}
      onChange={(value) => onChange(value || "")}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true
      }}
    />
  );
}
