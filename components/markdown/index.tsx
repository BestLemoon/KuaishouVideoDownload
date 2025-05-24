"use client";

import "highlight.js/styles/atom-one-dark.min.css";
import "./markdown.css";

import MarkdownIt from "markdown-it";
import React from "react";
import hljs from "highlight.js";

// Define isSpace function if it doesn't exist to prevent markdown-it errors
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).isSpace === 'undefined') {
  (globalThis as any).isSpace = function(code: number): boolean {
    return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0B || code === 0x0C || code === 0x0D;
  };
}

export default function Markdown({ content }: { content: string }) {
  const md: MarkdownIt = React.useMemo(() => {
    return new MarkdownIt({
      highlight: function (str: string, lang: string) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs"><code>${
              hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
            }</code></pre>`;
          } catch (_) {}
        }

        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      },
    });
  }, []);

  const renderedMarkdown = React.useMemo(() => {
    try {
      return md.render(content);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return `<p>Error rendering markdown content</p>`;
    }
  }, [content, md]);

  return (
    <div
      className="max-w-full overflow-x-auto markdown"
      dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
    />
  );
}
