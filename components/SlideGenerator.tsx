
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Type, Part } from "@google/genai";
import { useApp } from '../App';
import { LibraryItemType, UserRole } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { ai, getFriendlyErrorMessage } from '../api';

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return; // Success, exit
    } catch (err) {
        // This can happen if the document is not focused. Proceed to fallback.
    }

    // Fallback method using execCommand
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('Fallback: Unable to copy content.');
        }
    } catch (err) {
        throw new Error(`Fallback: Copying failed with error: ${err}`);
    } finally {
        document.body.removeChild(textArea);
    }
};

const SlideContentRenderer: React.FC<{ markdown: string, placeholder: string }> = ({ markdown, placeholder }) => {
    return <MarkdownRenderer markdown={markdown} placeholder={placeholder} className="p-1 sm:p-2 space-y-2" />;
};


const SlideGenerator: React.FC = () => {
    const { t, language, handleViolation } = useApp();
    const [topic, setTopic] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [markdownContent, setMarkdownContent] = useState('');
    const [wordContent, setWordContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyAsTextButtonText, setCopyAsTextButtonText] = useState(t('copy_as_text'));
    const [copyForWordButtonText, setCopyForWordButtonText] = useState(t('copy_for_word'));
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [copiedCurrentSlide, setCopiedCurrentSlide] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCopyAsTextButtonText(t('copy_as_text'));
        setCopyForWordButtonText(t('copy_for_word'));
    }, [markdownContent, t]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        } else {
            setFile(null);
            setFileName('');
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim() && !file) return;
        setIsLoading(true);
        setMarkdownContent('');
        setWordContent('');
        setError(null);
        setCurrentSlideIndex(0);

        try {
            const parts: Part[] = [];
            let isImage = false;

            if (file) {
                 const base64EncodedDataPromise = new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                });
                parts.push({
                    inlineData: {
                        data: await base64EncodedDataPromise,
                        mimeType: file.type,
                    },
                });
                isImage = file.type.startsWith('image/');
            }

            const safetyInstruction = isImage 
                ? `**STRICT IMAGE SAFETY:** 
                   - The user has uploaded an IMAGE.
                   - If this image depicts violence, gore, self-harm, weapons, illegal acts, or school violence (physical/mental abuse):
                   - **IMMEDIATELY RETURN** {"markdownContent": "VIOLATION_DETECTED_SAFETY", "wordContent": "VIOLATION_DETECTED_SAFETY"}.
                   - **DO NOT** apply any educational or preventive context exceptions for images.`
                : `**SAFETY CHECK (Contextual):**
                   - If the topic or file content promotes bullying, physical/mental abuse in schools or illegal acts:
                   - **CHECK CONTEXT:** Is it educational/preventive?
                   - **YES:** Proceed.
                   - **NO (Promotional):** **RETURN** {"markdownContent": "VIOLATION_DETECTED_SAFETY", "wordContent": "VIOLATION_DETECTED_SAFETY"}.`;

             const prompt = `
                Act as an expert presentation designer. Create a detailed outline for a slide presentation about: "${topic}".
                ${file ? 'Use the provided file as reference material.' : ''}
                
                **CRITICAL LANGUAGE RULE (MUST FOLLOW):**
                The user has explicitly selected **${language}** as their interface language.
                - The entire presentation content, including headers, bullet points, and visual descriptions, **MUST be in ${language}**.
                - **Do not output English unless ${language} is explicitly English.**
                
                **STRICT SAFETY, LEGAL & RESPONSIBILITY CHECK:**
                1. **Legal/Commitment Violations**: Generating passwords, credentials, cheating tools, or illegal acts -> RETURN {"markdownContent": "VIOLATION_DETECTED_POLICY", "wordContent": "VIOLATION_DETECTED_POLICY"}.
                2. **Safety & School Violence**:
                   ${safetyInstruction}

                **Structure:**
                -   Slide 1: Title Slide
                -   Slide 2: Introduction / Agenda
                -   Slide 3-7: Core Content (Key points, explanations)
                -   Slide 8: Conclusion / Summary
                
                **Formatting per Slide:**
                -   Start each slide with \`# Slide X: Title\`
                -   Use \`##\` for section headers within a slide.
                -   Use \`-\` for bullet points. Giữ mỗi ý súc tích, cô đọng (1-2 câu), phân bổ khoảng 3-5 ý chính cho một slide để bài giảng trực quan, vừa vặn trang chiếu, không nhồi nhét quá nhiều chữ.
                -   Include a visual suggestion for each slide using the format: \`[VISUAL: specific description of image/chart]\`.
                -   **CRITICAL:** Separate slides with \`---\` on a new line.

                **QUY TẮC RENDER NỘI DUNG (BẮT BUỘC TUÂN THỦ):**
                1. VĂN BẢN THÔNG THƯỜNG:
                   - Không sử dụng LaTeX cho văn bản thông thường.
                   - Không dùng dấu $ để bao quanh nội dung.
                   - Các cấu trúc ngữ pháp tiếng Anh phải được viết dạng plain text (Ví dụ: S + V(s/es), S + do/does + not + V, Do/Does + S + V?). Tuyệt đối không viết $S + V(s/es)$.
                2. CÔNG THỨC TOÁN HỌC:
                   - Công thức toán PHẢI được đặt giữa:
                     [[MATH]]
                     ...
                     [[/MATH]]
                   - Nội dung bên trong [[MATH]] sử dụng LaTeX chuẩn (Ví dụ: [[MATH]]E = mc^2[[/MATH]], [[MATH]]\frac{a+b}{c}[[/MATH]]).
                3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
                4. Khi nội dung có cả tiếng Anh và Toán: Tiếng Anh, cấu trúc câu → plain text; Công thức Toán → [[MATH]]...[[/MATH]].
                5. **DOUBLE BACKSLASH RULE:** When outputting JSON, you **MUST** use double backslashes for all LaTeX commands inside [[MATH]] (e.g., \`\\\\frac\`, \`\\\\alpha\`, \`\\\\rightarrow\`).

                **CRITICAL OUTPUT FORMAT:**
                Your entire response MUST be a single, valid JSON object.
                This object MUST have two keys:
                1.  \`markdownContent\`: The presentation formatted with Markdown and [[MATH]] for web display.
                2.  \`wordContent\`: The same presentation, but with math converted to Microsoft Word's native Equation format (UnicodeMath) for direct copy-pasting.
            `;
            
            parts.push({ text: prompt });

             const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    markdownContent: { type: Type.STRING },
                    wordContent: { type: Type.STRING }
                },
                required: ['markdownContent', 'wordContent']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: { parts },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                },
            });

            const result = JSON.parse(response.text || '{}');
            
            if (result.markdownContent === 'VIOLATION_DETECTED_POLICY') {
                handleViolation('violation_reason_policy');
                setError(t('unsafe_content_error'));
                return;
            }
            if (result.markdownContent === 'VIOLATION_DETECTED_SAFETY') {
                handleViolation('violation_reason_safety');
                setError(t('unsafe_content_error'));
                return;
            }
            // Legacy check
            if (result.markdownContent === 'VIOLATION_DETECTED') {
                handleViolation('violation_reason_policy');
                return;
            }

            setMarkdownContent(result.markdownContent || '');
            setWordContent(result.wordContent || '');

        } catch (e: any) {
            console.error("Error generating slides:", e);
            let errorMsg = getFriendlyErrorMessage(e, language);
            if (e.message?.includes('safety') || e.message?.includes('blocked') || e.toString().includes('SAFETY')) {
                errorMsg = t('unsafe_content_error');
                handleViolation('violation_reason_safety');
            }
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyAsText = () => {
        if (!markdownContent) return;
        
        const plainText = markdownContent
             .replace(/# Slide \d+: /g, '\n\n')
             .replace(/## /g, '\n')
             .replace(/\[VISUAL:.*?\]/g, '')
             .replace(/\$\$(.*?)\$\$/g, '$1')
             .replace(/\$(.*?)\$/g, '$1')
             .trim();

        copyToClipboard(plainText)
            .then(() => {
                setCopyAsTextButtonText(t('copied'));
                setTimeout(() => setCopyAsTextButtonText(t('copy_as_text')), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                alert('Could not copy text.');
            });
    };

    const handleCopyToWord = () => {
        if (!wordContent) return;
        copyToClipboard(wordContent)
            .then(() => {
                setCopyForWordButtonText(t('copied'));
                setTimeout(() => setCopyForWordButtonText(t('copy_for_word')), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text for Word:', err);
                alert('Failed to copy content for Word.');
            });
    };

    const isSafetyError = error === t('unsafe_content_error');

    // Split markdown content into slides using the separator
    const slides = useMemo(() => {
        if (!markdownContent) return [];
        // Split by "---" but also filter out empty strings resulting from leading/trailing separators
        return markdownContent.split(/\n\s*---\s*\n/).filter(s => s.trim().length > 0);
    }, [markdownContent]);

    // Keyboard navigation for slides
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            if (slides.length <= 1) return;
            if (e.key === 'ArrowLeft') {
                setCurrentSlideIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length]);

    // Ensure valid index if slides change
    useEffect(() => {
        if (currentSlideIndex >= slides.length && slides.length > 0) {
            setCurrentSlideIndex(0);
        }
    }, [slides.length, currentSlideIndex]);

    const currentSlideContent = slides.length > 0 ? slides[currentSlideIndex] : '';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-6 rounded-2xl">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">{t('slide_generator')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">{t('presentation_topic')}</label>
                        <input 
                            type="text" 
                            value={topic} 
                            onChange={(e) => setTopic(e.target.value)} 
                            placeholder={t('topic_placeholder')}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">{t('upload_template')}</label>
                        <div className="flex items-center gap-3">
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*,.pdf,.txt" 
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                            >
                                {t('choose_file')}
                            </button>
                            <span className="text-sm text-slate-500 truncate flex-1">
                                {fileName || t('no_file_chosen')}
                            </span>
                        </div>
                    </div>
                    
                    <button onClick={handleGenerate} disabled={isLoading || (!topic.trim() && !file)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105">
                        {isLoading ? t('generating') : t('generate_slides')}
                    </button>
                     <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                        {markdownContent && !isLoading && (
                             <>
                                <button 
                                    onClick={handleCopyAsText} 
                                    className="flex-1 w-full text-sm bg-slate-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-600 transition-all duration-300 transform hover:scale-105">
                                    {copyAsTextButtonText}
                                </button>
                                <button 
                                    onClick={handleCopyToWord} 
                                    className="flex-1 w-full text-sm bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-300 transform hover:scale-105">
                                    {copyForWordButtonText}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {/* Output Section */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-3 sm:p-4 rounded-2xl min-h-[600px] flex flex-col">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 min-h-[500px]">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                        <p className="text-slate-500 font-medium animate-pulse">{t('generating')}</p>
                    </div>
                ) : error ? (
                    <div className={`flex items-center justify-center h-full text-center p-6 min-h-[500px] ${isSafetyError ? 'text-red-600 font-bold text-2xl bg-red-50 border-2 border-red-200 rounded-xl' : 'text-red-600 font-semibold'}`}>
                        {error}
                    </div>
                ) : (
                    <div className="h-full flex flex-col bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden flex-1">
                        {/* Slide Viewport Container */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 flex flex-col items-center justify-center min-h-[460px]">
                            <div className="w-full max-w-4xl min-h-[460px] max-h-[620px] bg-white border border-slate-200 shadow-md rounded-2xl flex flex-col overflow-hidden relative">
                                {/* Slide Header Toolbar */}
                                {slides.length > 0 && (
                                    <div className="px-5 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 select-none">
                                        <div className="flex items-center gap-2 font-medium">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
                                            <span className="font-semibold text-slate-700">Slide {currentSlideIndex + 1} / {slides.length}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (currentSlideContent) {
                                                    copyToClipboard(currentSlideContent);
                                                    setCopiedCurrentSlide(true);
                                                    setTimeout(() => setCopiedCurrentSlide(false), 2000);
                                                }
                                            }}
                                            className="hover:text-indigo-600 font-medium px-2.5 py-1 rounded-md hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 text-slate-600"
                                            title="Sao chép nội dung slide hiện tại"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span>{copiedCurrentSlide ? 'Đã chép slide' : 'Chép slide này'}</span>
                                        </button>
                                    </div>
                                )}

                                {/* Slide Content - Strictly contained within card boundaries */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 min-h-0">
                                    {currentSlideContent ? (
                                        <SlideContentRenderer markdown={currentSlideContent} placeholder={t('slide_placeholder')} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full min-h-[360px] text-slate-400 font-medium">
                                            {t('slide_placeholder')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Navigation Controls */}
                        {slides.length > 0 && (
                            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex justify-between items-center flex-shrink-0">
                                <button 
                                    onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentSlideIndex === 0}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                    {t('prev_slide')}
                                </button>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
                                        Trang {currentSlideIndex + 1} / {slides.length}
                                    </span>
                                    <span className="hidden sm:inline text-xs text-slate-400">(← / →)</span>
                                </div>
                                
                                <button 
                                    onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                                    disabled={currentSlideIndex === slides.length - 1}
                                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-xs"
                                >
                                    {t('next_slide')}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlideGenerator;
