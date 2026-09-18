
import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useApp } from '../App';

interface KatexFormulaProps {
    math: string;
    displayMode?: boolean;
    className?: string;
}

// Cleans LaTeX math strings: strips rogue [[MATH]] tags, normalizes escaped backslashes without mangling matrices
export const cleanMath = (math: string): string => {
    if (!math) return '';
    return math
        .replace(/\[\[\/?(?:MATH|math)\]\]/gi, '')
        .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
        .trim();
};

// Renders a single math formula via KaTeX
export const KatexFormula: React.FC<KatexFormulaProps> = ({ math, displayMode = false, className = '' }) => {
    const cleaned = useMemo(() => cleanMath(math), [math]);

    const renderedHtml = useMemo(() => {
        if (!cleaned) return '';
        try {
            return katex.renderToString(cleaned, {
                displayMode,
                throwOnError: false,
                strict: false,
            });
        } catch (e) {
            console.error("KaTeX rendering error:", e);
            return '';
        }
    }, [cleaned, displayMode]);

    if (renderedHtml) {
        return (
            <span
                className={`katex-wrapper ${displayMode ? 'block my-3 text-center overflow-x-auto py-1.5' : 'inline-block align-middle mx-0.5'} ${className}`}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
        );
    }

    // Fallback if KaTeX fails to render
    return (
        <span className={`font-mono text-sm ${displayMode ? 'block text-center my-2 text-indigo-700' : 'inline text-indigo-700'} ${className}`}>
            {cleaned}
        </span>
    );
};

// Regex to identify bare LaTeX commands and math expressions outside delimiters
const BARE_MATH_REGEX = /((?:[a-zA-Z0-9]+\s+)?\\(?:ge|le|Rightarrow|rightarrow|Leftarrow|leftarrow|Leftrightarrow|neq|approx|equiv|sim|propto)(?:\s+[a-zA-Z0-9]+)?|\\(?:sqrt|frac|vec|hat|overline|underline|sum|int|prod|mathbf|mathrm|mathit|text|sin|cos|tan|cot|log|ln|lim)(?:\{[^{}]*\}|\[[^\[\]]*\])*(?:\^[0-9a-zA-Z{}]+|_[0-9a-zA-Z{}]+)*|\\(?:alpha|beta|gamma|delta|Delta|pi|theta|pm|mp|times|cdot|in|notin|subset|supset|infty|partial|nabla|degree|angle|ldots|cdots)|\b[a-zA-Z]\^[0-9]+\b|\b[a-zA-Z]_[0-9]+\b)/g;

// Parses inline formatting:
// 1. Display math: \[ ... \] or \\[ ... \\]
// 2. Inline math: \( ... \) or \\( ... \\)
// 3. Custom tags: [[MATH]] ... [[/MATH]]
// 4. Bold: **...**
// 5. Italic: *...*
// 6. Bare LaTeX formulas: \sqrt{a}, \sqrt{A^2}, \frac{a}{b}, A \ge 0, x \le 2, x \Rightarrow y, x^2
// 7. Regular educational text (e.g. "S + V(s/es)") remains pure plain text.
export const parseInlineFormatting = (text: string): React.ReactNode[] => {
    if (!text) return [];

    const primaryRegex = /(\\{1,2}\[[\s\S]*?\\{1,2}\]|\\{1,2}\([\s\S]*?\\{1,2}\)|\[\[(?:MATH|math)\]\][\s\S]*?\[\[\/(?:MATH|math)\]\]|\*\*.*?\*\*|\*.*?\*)/g;
    const parts = text.split(primaryRegex).filter(Boolean);

    return parts.map((part, index) => {
        // 1. Display math \[ ... \]
        if (/^\\{1,2}\[[\s\S]*?\\{1,2}\]$/.test(part)) {
            const innerMath = part.replace(/^\\{1,2}\[/, '').replace(/\\{1,2}\]$/, '').trim();
            return <KatexFormula key={index} math={innerMath} displayMode={true} />;
        }
        // 2. Inline math \( ... \)
        if (/^\\{1,2}\([\s\S]*?\\{1,2}\)$/.test(part)) {
            const innerMath = part.replace(/^\\{1,2}\(/, '').replace(/\\{1,2}\)$/, '').trim();
            return <KatexFormula key={index} math={innerMath} displayMode={false} />;
        }
        // 3. Custom tag [[MATH]]...[[/MATH]]
        if (/^\[\[(?:MATH|math)\]\][\s\S]*?\[\[\/(?:MATH|math)\]\]$/i.test(part)) {
            const innerMath = part
                .replace(/^\[\[(?:MATH|math)\]\]/i, '')
                .replace(/\[\[\/(?:MATH|math)\]\]$/i, '')
                .trim();
            return <KatexFormula key={index} math={innerMath} displayMode={innerMath.includes('\n')} />;
        }
        // 4. Bold text
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={index} className="font-bold text-slate-900">
                    {parseInlineFormatting(part.substring(2, part.length - 2))}
                </strong>
            );
        }
        // 5. Italic text
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
            return (
                <em key={index} className="italic text-slate-800">
                    {parseInlineFormatting(part.substring(1, part.length - 1))}
                </em>
            );
        }
        // 6. Plain text containing bare LaTeX commands (e.g. \sqrt{a}, A \ge 0, \frac{a}{b})
        if (part.includes('\\') || /\b[a-zA-Z][\^_][0-9]+\b/.test(part)) {
            const subTokens = part.split(BARE_MATH_REGEX).filter(Boolean);
            if (subTokens.length > 1 || (subTokens.length === 1 && subTokens[0] !== part)) {
                return (
                    <React.Fragment key={index}>
                        {subTokens.map((sub, sIdx) => {
                            BARE_MATH_REGEX.lastIndex = 0;
                            if (BARE_MATH_REGEX.test(sub)) {
                                return <KatexFormula key={`${index}-${sIdx}`} math={sub.trim()} displayMode={false} />;
                            }
                            return <React.Fragment key={`${index}-${sIdx}`}>{sub}</React.Fragment>;
                        })}
                    </React.Fragment>
                );
            }
        }
        // 7. Regular educational text (e.g. S + V(s/es))
        return <React.Fragment key={index}>{part}</React.Fragment>;
    });
};

// Helper component for general plain text containing math formulas
export const MathText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    if (!text) return null;
    return <span className={className}>{parseInlineFormatting(text)}</span>;
};

interface MarkdownRendererProps {
    markdown: string;
    placeholder: string;
    className?: string;
}

// Primary Markdown & Math Renderer
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, placeholder, className }) => {
    const { t } = useApp();

    // Pre-process markdown while protecting LaTeX math blocks from newline/tab corruption
    const processedMarkdown = useMemo(() => {
        if (!markdown) return '';

        // Tách trường hợp ý con tự luận dính sát sau thẻ đóng math: [[/MATH]].b)[[MATH]] hoặc [[/MATH]] b)[[MATH]]
        // Chỉ áp dụng với chữ thường có dấu ngoặc đơn: a), b), c), d) - TUYỆT ĐỐI không ảnh hưởng trắc nghiệm A., B., C., D.
        let preprocessed = markdown.replace(
            /(\[\[\/(?:MATH|math)\]\])\s*\.?\s*([a-d]\))\s*(\[\[(?:MATH|math)\]\])/gi,
            '$1\n\n$2 $3'
        );

        // Protect math blocks: \[...\], \(...\), [[MATH]]...[[/MATH]]
        const mathPattern = /(\\{1,2}\[[\s\S]*?\\{1,2}\]|\\{1,2}\([\s\S]*?\\{1,2}\)|\[\[(?:MATH|math)\]\][\s\S]*?\[\[\/(?:MATH|math)\]\])/g;
        const parts = preprocessed.split(mathPattern);
        return parts.map(part => {
            if (/^(?:\\{1,2}\[|\\{1,2}\(|\[\[(?:MATH|math)\]\])/i.test(part)) {
                return part;
            }
            // In non-math text, normalize newlines only if not followed by letters (protects \neq, \times, \nabla, etc.)
            return part
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/\\n(?![a-zA-Z])/g, '\n')
                .replace(/\\t(?![a-zA-Z])/g, '\t');
        }).join('');
    }, [markdown]);

    if (!processedMarkdown) {
        return <div className="flex items-center justify-center h-full text-slate-500 text-center p-4">{placeholder}</div>;
    }

    const renderSingleLine = (line: string, key: string | number) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('# ')) {
            return (
                <h1 key={key} className="text-2xl sm:text-3xl font-bold mt-6 mb-4 text-indigo-700 border-b border-indigo-200 pb-2">
                    {parseInlineFormatting(trimmedLine.substring(2))}
                </h1>
            );
        }
        if (trimmedLine.startsWith('## ')) {
            return (
                <h2 key={key} className="text-xl sm:text-2xl font-semibold mt-5 mb-3 text-sky-700">
                    {parseInlineFormatting(trimmedLine.substring(3))}
                </h2>
            );
        }
        if (trimmedLine.startsWith('### ')) {
            return (
                <h3 key={key} className="text-lg sm:text-xl font-bold mt-7 mb-3 bg-slate-100 p-3 rounded-lg border-l-4 border-indigo-500 text-slate-800">
                    {parseInlineFormatting(trimmedLine.substring(4))}
                </h3>
            );
        }
        if (trimmedLine.startsWith('- ')) {
            return (
                <li key={key} className="ml-6 text-slate-700 list-disc my-1">
                    {parseInlineFormatting(trimmedLine.substring(2))}
                </li>
            );
        }
        if (/^\s*\*{0,2}\s*\d+\.\s/.test(trimmedLine)) {
            const cleanLine = trimmedLine.replace(/^\s*\*{0,2}\s*/, '');
            return (
                <p key={key} className="font-semibold text-slate-800 mt-5 mb-2">
                    {parseInlineFormatting(cleanLine)}
                </p>
            );
        }

        // Định dạng các lựa chọn trắc nghiệm A. B. C. D.
        if (/^[A-Z]\.\s/.test(trimmedLine)) {
            return (
                <p key={key} className="ml-8 text-slate-700 my-1">
                    {parseInlineFormatting(trimmedLine)}
                </p>
            );
        }

        // Định dạng các ý tự luận a), b), c), d)
        if (/^[a-d]\)\s*/.test(trimmedLine)) {
            return (
                <p key={key} className="ml-4 font-semibold text-slate-800 mt-3 mb-1">
                    {parseInlineFormatting(trimmedLine)}
                </p>
            );
        }

        if (trimmedLine.startsWith('[VISUAL:')) { 
            const description = trimmedLine.replace('[VISUAL:', '').replace(']', '').trim();
            return (
                <div key={key} className="my-3 p-3.5 border border-dashed border-sky-400/80 bg-sky-50/90 rounded-xl text-sky-900 text-sm italic flex items-start gap-3 shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-sky-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <span className="leading-relaxed">{`Gợi ý hình ảnh/minh họa: ${description}`}</span>
                </div>
            );
        }
        if (trimmedLine === '---') {
            return <hr key={key} className="my-6 border-slate-300" />;
        }
        if (trimmedLine === '') {
            return <div key={key} className="h-2"></div>;
        }
        
        return (
            <div key={key} className="text-slate-700 my-1.5 leading-relaxed">
                {parseInlineFormatting(trimmedLine)}
            </div>
        );
    };

    // Render blocks: Handles multiline display math \[...\], [[MATH]]...[[/MATH]], and regular markdown lines
    const renderContent = () => {
        const lines = processedMarkdown.split('\n');
        const elements: React.ReactNode[] = [];
        let inDisplayMath = false;
        let displayMathType: 'bracket' | 'tag' = 'bracket';
        let mathBuffer: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (inDisplayMath) {
                const isClose = displayMathType === 'bracket' 
                    ? /\\{1,2}\]/.test(line) 
                    : /\[\[\/(?:MATH|math)\]\]/i.test(line);

                if (isClose) {
                    let beforeClose = line;
                    let afterClose = '';
                    if (displayMathType === 'bracket') {
                        const m = line.match(/\\{1,2}\]/);
                        if (m && m.index !== undefined) {
                            beforeClose = line.substring(0, m.index);
                            afterClose = line.substring(m.index + m[0].length).trim();
                        }
                    } else {
                        const m = line.match(/\[\[\/(?:MATH|math)\]\]/i);
                        if (m && m.index !== undefined) {
                            beforeClose = line.substring(0, m.index);
                            afterClose = line.substring(m.index + m[0].length).trim();
                        }
                    }
                    if (beforeClose.trim()) mathBuffer.push(beforeClose);
                    
                    const fullMath = mathBuffer.join('\n').trim();
                    elements.push(
                        <div key={`display-math-${i}`} className="my-2 text-center overflow-x-auto">
                            <KatexFormula math={fullMath} displayMode={true} />
                        </div>
                    );
                    inDisplayMath = false;
                    mathBuffer = [];

                    if (afterClose) {
                        elements.push(renderSingleLine(afterClose, `after-math-${i}`));
                    }
                } else {
                    mathBuffer.push(line);
                }
                continue;
            }

            // Check if line is a single-line display math: \[ ... \] or [[MATH]]...[[/MATH]]
            if (/^\s*\\{1,2}\[[\s\S]*?\\{1,2}\]\s*$/.test(trimmed)) {
                const math = trimmed.replace(/^\s*\\{1,2}\[/, '').replace(/\\{1,2}\]\s*$/, '').trim();
                elements.push(
                    <div key={`display-math-${i}`} className="my-2 text-center overflow-x-auto">
                        <KatexFormula math={math} displayMode={true} />
                    </div>
                );
                continue;
            }
            
            // Check if line is a single-line display math [[MATH]]...[[/MATH]]:
            // Chỉ coi là display math đơn lẻ nếu bên trong KHÔNG chứa thêm thẻ [[/MATH]] hoặc [[MATH]] nào khác!
            const singleTagMatch = trimmed.match(/^\s*\[\[(?:MATH|math)\]\]([\s\S]*?)\[\[\/(?:MATH|math)\]\]\s*$/i);
            if (singleTagMatch) {
                const inner = singleTagMatch[1];
                if (!/\[\[\/?(?:MATH|math)\]\]/i.test(inner)) {
                    elements.push(
                        <div key={`display-math-${i}`} className="my-2 text-center overflow-x-auto">
                            <KatexFormula math={inner.trim()} displayMode={true} />
                        </div>
                    );
                    continue;
                }
            }

            // Check if line STARTS a multiline display math block:
            // Chỉ mở multiline block khi dòng đó CHƯA có thẻ đóng!
            if (/^\s*\\{1,2}\[/.test(trimmed) && !/\\{1,2}\]/.test(trimmed)) {
                inDisplayMath = true;
                displayMathType = 'bracket';
                const afterStart = line.replace(/^\s*\\{1,2}\[/, '');
                if (afterStart.trim()) mathBuffer.push(afterStart);
                continue;
            }
            if (/^\s*\[\[(?:MATH|math)\]\]/i.test(trimmed) && !/\[\[\/(?:MATH|math)\]\]/i.test(trimmed)) {
                inDisplayMath = true;
                displayMathType = 'tag';
                const afterStart = line.replace(/^\s*\[\[(?:MATH|math)\]\]/i, '');
                if (afterStart.trim()) mathBuffer.push(afterStart);
                continue;
            }

            // Normal markdown line
            elements.push(renderSingleLine(line, `line-${i}`));
        }

        if (inDisplayMath && mathBuffer.length > 0) {
            elements.push(
                <div key="display-math-unclosed" className="my-2 text-center overflow-x-auto">
                    <KatexFormula math={mathBuffer.join('\n').trim()} displayMode={true} />
                </div>
            );
        }

        return elements;
    };

    return (
        <>
            <style>{`
                .katex-display {
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding: 0.4em 0;
                    margin: 0.4em 0;
                    text-align: center;
                    max-width: 100%;
                }
                .katex-display > .katex {
                    white-space: normal;
                    text-align: center;
                }
                .katex {
                    font-size: 1.1em;
                    line-height: 1.4;
                }
                .katex-html {
                    overflow-wrap: break-word;
                }
            `}</style>
            <div className={`prose prose-sm sm:prose-base max-w-none space-y-1 ${className !== undefined ? className : 'h-full p-4 sm:p-6'}`}>
                {renderContent()}
            </div>
        </>
    );
};

export default MarkdownRenderer;

