import katex from "katex";

type LatexTextProps = {
  children: string | null | undefined;
  className?: string;
};

const LATEX_TOKEN = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g;

function renderMath(source: string, displayMode: boolean) {
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

export default function LatexText({ children, className }: LatexTextProps) {
  const text = children ?? "";
  const parts = text.split(LATEX_TOKEN);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        const isBlock =
          (part.startsWith("$$") && part.endsWith("$$")) ||
          (part.startsWith("\\[") && part.endsWith("\\]"));
        const isMath =
          isBlock ||
          (part.startsWith("$") && part.endsWith("$")) ||
          (part.startsWith("\\(") && part.endsWith("\\)"));

        if (!isMath) return <span key={index}>{part}</span>;

        const source = isBlock
          ? part.slice(2, -2)
          : part.startsWith("$")
            ? part.slice(1, -1)
            : part.slice(2, -2);
        const html = renderMath(source, isBlock);

        return html ? (
          <span
            key={index}
            className={isBlock ? "my-2 block overflow-x-auto" : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}
