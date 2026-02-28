"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRef, useState } from "react";

type EditorTone = "teal" | "cyan";

type MarkdownEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  tone: EditorTone;
  placeholder?: string;
  minRows?: number;
};

type MarkdownViewerProps = {
  value: string;
  emptyText?: string;
};

type ToolbarAction = {
  id: string;
  label: string;
  apply: (ctx: { value: string; start: number; end: number }) => { nextValue: string; nextStart: number; nextEnd: number };
};

const wrapSelection = (
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  fallbackText: string
) => {
  const selected = value.slice(start, end);
  const innerText = selected.length > 0 ? selected : fallbackText;
  const replacement = `${prefix}${innerText}${suffix}`;
  const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  const innerStart = start + prefix.length;
  const innerEnd = innerStart + innerText.length;
  return { nextValue, nextStart: innerStart, nextEnd: innerEnd };
};

const prefixLines = (value: string, start: number, end: number, prefix: string) => {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const block = value.slice(lineStart, lineEnd);
  const replaced = block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  const nextValue = `${value.slice(0, lineStart)}${replaced}${value.slice(lineEnd)}`;
  return { nextValue, nextStart: lineStart, nextEnd: lineStart + replaced.length };
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: "bold",
    label: "굵게",
    apply: ({ value, start, end }) => wrapSelection(value, start, end, "**", "**", "굵은 텍스트")
  },
  {
    id: "italic",
    label: "기울임",
    apply: ({ value, start, end }) => wrapSelection(value, start, end, "*", "*", "기울임 텍스트")
  },
  {
    id: "title",
    label: "제목",
    apply: ({ value, start, end }) => prefixLines(value, start, end, "## ")
  },
  {
    id: "bullet",
    label: "목록",
    apply: ({ value, start, end }) => prefixLines(value, start, end, "- ")
  },
  {
    id: "check",
    label: "체크",
    apply: ({ value, start, end }) => prefixLines(value, start, end, "- [ ] ")
  },
  {
    id: "quote",
    label: "인용",
    apply: ({ value, start, end }) => prefixLines(value, start, end, "> ")
  },
  {
    id: "code",
    label: "코드",
    apply: ({ value, start, end }) => wrapSelection(value, start, end, "```\n", "\n```", "코드")
  },
  {
    id: "link",
    label: "링크",
    apply: ({ value, start, end }) => wrapSelection(value, start, end, "[", "](https://)", "링크 텍스트")
  }
];

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold text-cyan-50">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 mt-3 text-sm font-semibold text-cyan-50">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-cyan-100">{children}</h3>,
  p: ({ children }) => <p className="mb-2 leading-relaxed text-cyan-50">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-cyan-50">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-cyan-50">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-cyan-300/45 pl-3 text-cyan-100/85">{children}</blockquote>
  ),
  code: ({ children, className }) => {
    const text = String(children ?? "");
    const isBlock = className?.includes("language-") || text.includes("\n");
    return isBlock ? (
      <code className="block overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-cyan-100">{children}</code>
    ) : (
      <code className="rounded bg-black/30 px-1 py-0.5 text-[0.85em] text-cyan-100">{children}</code>
    );
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-cyan-200 underline decoration-cyan-300/50 underline-offset-2">
      {children}
    </a>
  ),
  hr: () => <hr className="my-2 border-cyan-200/20" />
};

export function MarkdownViewer({ value, emptyText = "메모 없음" }: MarkdownViewerProps) {
  const normalized = value.trim();
  if (!normalized) {
    return <p className="break-words text-cyan-50">{emptyText}</p>;
  }

  return (
    <div className="max-h-56 overflow-auto rounded-lg border border-cyan-100/15 bg-black/20 p-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownEditor({ value, onChange, tone, placeholder = "메모를 Markdown으로 입력", minRows = 6 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const borderClass = tone === "teal" ? "border-teal-100/20 bg-teal-950/30" : "border-cyan-100/20 bg-cyan-950/30";
  const subTextClass = tone === "teal" ? "text-teal-100/65" : "text-cyan-100/65";

  const applyAction = (action: ToolbarAction) => {
    const target = textareaRef.current;
    if (!target) {
      return;
    }

    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = action.apply({ value, start, end });
    onChange(next.nextValue);

    requestAnimationFrame(() => {
      const focused = textareaRef.current;
      if (!focused) {
        return;
      }
      focused.focus();
      focused.setSelectionRange(next.nextStart, next.nextEnd);
    });
  };

  return (
    <div className={`space-y-2 rounded-lg border ${borderClass} p-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">메모 (Markdown)</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPreviewMode("edit")}
            className={`rounded px-2 py-1 text-[11px] ${previewMode === "edit" ? "bg-black/35 text-cyan-50" : `${subTextClass}`}`}
          >
            편집
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("preview")}
            className={`rounded px-2 py-1 text-[11px] ${previewMode === "preview" ? "bg-black/35 text-cyan-50" : `${subTextClass}`}`}
          >
            미리보기
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => applyAction(action)}
            className={`rounded border ${borderClass} px-2 py-1 text-[11px] ${subTextClass}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {previewMode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={minRows}
          className={`w-full resize-y rounded-lg border ${borderClass} px-3 py-2 text-sm`}
          placeholder={placeholder}
        />
      ) : (
        <MarkdownViewer value={value} emptyText="미리볼 메모가 없습니다." />
      )}

      <p className={`text-[11px] ${subTextClass}`}>지원: 제목, 목록, 체크리스트, 링크, 코드블록</p>
    </div>
  );
}
