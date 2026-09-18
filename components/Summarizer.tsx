
import React, { useState, useEffect, useRef } from 'react';
import { Type, Part } from "@google/genai";
import { useApp } from '../App';
import { Language, Flashcard, MindMapNode, LibraryItemType, UserRole } from '../types';
import MindMapComponent from './MindMap';
import { MathText } from './MarkdownRenderer';
import { ai, getFriendlyErrorMessage } from '../api';

const FlashcardComponent: React.FC<{ card: Flashcard }> = ({ card }) => {
    const [flipped, setFlipped] = useState(false);

    return (
        <div
            className="w-full h-56 [perspective:1000px] group cursor-pointer"
            onClick={() => setFlipped(!flipped)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
                {/* Front */}
                <div className="absolute w-full h-full bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-center text-center [backface-visibility:hidden] shadow-sm">
                    <div className="text-lg font-semibold text-slate-800">
                        <MathText text={card.question} />
                    </div>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-center text-center text-indigo-900 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-sm">
                    <div className="text-base leading-relaxed">
                        <MathText text={card.answer} />
                    </div>
                </div>
            </div>
        </div>
    );
};


const Summarizer: React.FC = () => {
    const { t, language, userRole, addToLibrary, handleViolation } = useApp();
    const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [outputTab, setOutputTab] = useState<'mind_map' | 'flashcards'>('mind_map');
    
    // Input states
    const [fileName, setFileName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [saveButtonText, setSaveButtonText] = useState(t(userRole === UserRole.TEACHER ? 'save_to_documents' : 'save_to_library'));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetSaveButton = () => {
      setSaveButtonText(t(userRole === UserRole.TEACHER ? 'save_to_documents' : 'save_to_library'));
    }
    
    useEffect(() => {
        resetSaveButton();
    }, [t, userRole]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            resetSaveButton();
        } else {
            setFile(null);
            setFileName('');
        }
    };
    
    const handleSave = () => {
        if (!mindMap) return;

        const name = `${t('summarize')} - ${fileName || (textContent ? textContent.slice(0, 25).trim() + '...' : '') || mindMap.title}`;
        addToLibrary({
            name,
            type: LibraryItemType.SUMMARY,
            content: { mindMap }
        });
        setSaveButtonText(t('saved'));
        setTimeout(() => resetSaveButton(), 2000);
    };

    // Helper to sanitize mind map nodes and eliminate repetitive loops or hallucinations
    const cleanRepetitiveText = (text: string): string => {
        if (!text) return '';
        let cleaned = text.trim();
        // Remove known degenerate repetitive superlative patterns
        cleaned = cleaned.replace(/(?:nhất có thể|xuất sắc nhất|chuẩn mực nhất|tối ưu nhất|tuyệt đỉnh nhất|đỉnh cao nhất|hoàn chỉnh nhất|chuẩn xác nhất|logic nhất)\s*/gi, '');
        // Remove immediate repeating word / phrase loops (e.g. "khái niệm khái niệm")
        cleaned = cleaned.replace(/\b(\S+(?:\s+\S+){0,3})\s+\1\b/gi, '$1');
        cleaned = cleaned.replace(/\b(\S+(?:\s+\S+){0,3})\s+\1\b/gi, '$1');
        cleaned = cleaned.trim();
        if (cleaned.length > 80) {
            cleaned = cleaned.slice(0, 77).trim() + '...';
        }
        return cleaned || text.slice(0, 50).trim();
    };

    const cleanMindMapTree = (node: any): MindMapNode | null => {
        if (!node || typeof node !== 'object') return null;
        const title = cleanRepetitiveText(typeof node.title === 'string' ? node.title : '');
        if (!title) return null;

        const children: MindMapNode[] = [];
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                const cleanedChild = cleanMindMapTree(child);
                if (cleanedChild && cleanedChild.title) {
                    children.push(cleanedChild);
                }
            }
        }
        return {
            title,
            ...(children.length > 0 ? { children } : {})
        };
    };

    const handleSummarize = async () => {
        if (!file && !textContent.trim()) return;

        setIsLoading(true);
        setMindMap(null);
        setFlashcards([]);
        setError(null);
        resetSaveButton();

        try {
            const parts: Part[] = [];
            
            let safetyInstruction = `**SAFETY CHECK:**
                   - If the content promotes violence, gore, or school violence, return "VIOLATION_DETECTED_SAFETY".`;

            if (file) {
                const isImage = file.type.startsWith('image/');
                if (isImage) {
                    safetyInstruction = `**STRICT IMAGE SAFETY:** Visual violence is prohibited. If detected, return "VIOLATION_DETECTED_SAFETY".`;
                }

                const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json');
                if (isText) {
                    const textData = await file.text();
                    parts.push({ text: `=== NỘI DUNG TỆP VĂN BẢN ĐÍNH KÈM (${file.name}) ===\n${textData}` });
                } else {
                    const fileToGenerativePart = async (file: File) => {
                        const base64EncodedDataPromise = new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                            reader.readAsDataURL(file);
                        });
                        return {
                            inlineData: {
                                data: await base64EncodedDataPromise,
                                mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                            },
                        };
                    };
                    parts.push(await fileToGenerativePart(file));
                }
            }

            if (textContent.trim()) {
                parts.push({ text: `=== NỘI DUNG BÀI HỌC / GHI CHÚ TRỰC TIẾP ===\n${textContent.trim()}` });
            }

            const promptInstructions = `
                Bạn là chuyên gia sư phạm. Hãy phân tích nội dung được cung cấp ở trên và trích xuất một Sơ đồ tư duy (Mind Map) chuẩn mực và bộ thẻ ghi nhớ (Flashcards).

                **YÊU CẦU NỘI DUNG TUYỆT ĐỐI:**
                1. BÁM SÁT NỘI DUNG THỰC TẾ:
                   - Tiêu đề gốc: Tên bài học hoặc chủ đề cốt lõi (tối đa 6-8 từ).
                   - Nhánh cấp 1: Các phần, luận điểm hoặc khái niệm chính trong bài (mỗi nhánh từ 2 đến 6 từ).
                   - Nhánh cấp 2: Các ý chi tiết, định nghĩa ngắn, số liệu hoặc công thức toán học/khoa học nếu có (ngắn gọn, súc tích).
                2. CHỐNG NỘI DUNG VÔ NGHĨA & CHỐNG LẶP TỪ:
                   - TUYỆT ĐỐI KHÔNG sinh ra các từ ngữ lặp đi lặp lại hoặc các cụm từ sáo rỗng như: "nhất có thể", "xuất sắc nhất", "chuẩn mực nhất", "tối ưu nhất", "tuyệt đỉnh", "đỉnh cao".
                   - Mỗi nút trong sơ đồ tư duy chỉ chứa TỪ KHÓA hoặc CÂU NGẮN GỌN (dưới 15 từ), KHÔNG viết cả đoạn văn dài vào một nút.
                3. NGÔN NGỮ: Toàn bộ bằng **${language === Language.VI ? 'Tiếng Việt' : 'English'}**.
                
                ${safetyInstruction}

                4. QUY TẮC TOÁN HỌC & CÔNG THỨC:
                   - Công thức toán học (nếu có) PHẢI đặt giữa [[MATH]]...[[/MATH]]. Ví dụ: [[MATH]]x^2 + y^2 = z^2[[/MATH]].
                   - Văn bản và tiếng Anh thông thường: Viết dạng plain text, không dùng LaTeX hay dấu $.

                5. FLASHCARDS:
                   - Tạo 3-5 thẻ ghi nhớ câu hỏi - câu trả lời ngắn gọn, chuẩn xác kiểm tra trực tiếp kiến thức trong bài.
            `;

            parts.push({ text: promptInstructions });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: { parts },
                config: {
                    temperature: 0.2,
                    systemInstruction: `Bạn là trợ lý giáo dục Trí Việt chuyên phân tích bài học và lập Sơ đồ tư duy (Mind Map) khoa học. Mọi nút trong sơ đồ phải có ý nghĩa thực tế, bám sát 100% tài liệu người dùng cung cấp. Tuyệt đối không sinh từ ngữ sáo rỗng, không lặp từ, không dùng các cụm từ vô nghĩa.`,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            mindMap: {
                                type: Type.OBJECT,
                                description: "Cây sơ đồ tư duy phân cấp, ngắn gọn và mạch lạc",
                                properties: {
                                    title: { type: Type.STRING, description: "Chủ đề bài học (từ 2-7 từ)" },
                                    children: {
                                        type: Type.ARRAY,
                                        description: "Các nhánh chính của bài học",
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING, description: "Ý chính hoặc tiêu đề mục (từ 2-6 từ)" },
                                                children: {
                                                    type: Type.ARRAY,
                                                    description: "Chi tiết bổ trợ hoặc công thức",
                                                    items: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            title: { type: Type.STRING, description: "Chi tiết súc tích (tối đa 10 từ)" }
                                                        },
                                                        required: ["title"]
                                                    }
                                                }
                                            },
                                            required: ["title"]
                                        }
                                    }
                                },
                                required: ["title"]
                            },
                            flashcards: {
                                type: Type.ARRAY,
                                description: "Danh sách thẻ ôn tập",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        question: { type: Type.STRING, description: "Câu hỏi ôn tập kiến thức" },
                                        answer: { type: Type.STRING, description: "Đáp án ngắn gọn" }
                                    },
                                    required: ["question", "answer"]
                                }
                            }
                        },
                        required: ["mindMap", "flashcards"]
                    }
                },
            });

            const result = JSON.parse(response.text || '{}');

            if (result.mindMap?.title?.includes('VIOLATION')) {
                handleViolation('violation_reason_safety');
                setError(t('unsafe_content_error'));
                return;
            }

            const sanitizedMindMap = cleanMindMapTree(result.mindMap);
            if (!sanitizedMindMap || !sanitizedMindMap.title) {
                setError(language === Language.VI ? 'Không thể phân tích nội dung thành sơ đồ tư duy. Vui lòng kiểm tra lại nội dung bài học được gửi.' : 'Unable to generate mind map. Please check the provided content.');
                return;
            }

            setMindMap(sanitizedMindMap);
            setFlashcards(result.flashcards || []);

        } catch (e: any) {
            console.error("Error generating summary:", e);
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col h-full">
                <h3 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-300 pb-3">{t('summarize')}</h3>
                
                <div className="flex-grow space-y-5 flex flex-col">
                    {/* File Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">{t('upload_file')}</label>
                        <div className="flex items-center gap-3">
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*,audio/*,video/*,.pdf" 
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium shrink-0"
                            >
                                {t('choose_file')}
                            </button>
                            <span className="text-sm text-slate-500 truncate flex-1">
                                {fileName || t('no_file_chosen')}
                            </span>
                        </div>
                    </div>

                    {/* Direct Text / Notes Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">
                            {language === Language.VI ? 'Hoặc dán nội dung / ghi chú bài học' : 'Or paste lesson notes / text'}
                        </label>
                        <textarea
                            rows={3}
                            value={textContent}
                            onChange={(e) => {
                                setTextContent(e.target.value);
                                resetSaveButton();
                            }}
                            placeholder={language === Language.VI ? 'Dán nội dung đoạn văn bài học vào đây...' : 'Paste lesson content here...'}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                        />
                    </div>
                </div>
                
                <button onClick={handleSummarize} disabled={isLoading || (!file && !textContent.trim())} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 mt-6 shadow-md">
                    {isLoading ? t('generating') : t('summarize')}
                </button>
            </div>
            
            {/* Output Section */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-6 rounded-2xl min-h-[500px]">
                 {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                        <p className="text-slate-500 font-medium animate-pulse">AI đang phân tích bài học cho bạn...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-center p-4 text-red-600 font-bold">
                        {error}
                    </div>
                ) : !mindMap ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                        <svg className="w-20 h-20 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="max-w-xs text-center">{t('summary_placeholder')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center border-b border-slate-300 mb-4 flex-shrink-0">
                            <div className="flex">
                               <button onClick={() => setOutputTab('mind_map')} className={`px-4 py-3 font-bold transition-all ${outputTab === 'mind_map' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-900'}`}>{t('mind_map')}</button>
                                <button onClick={() => setOutputTab('flashcards')} className={`px-4 py-3 font-bold transition-all ${outputTab === 'flashcards' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-900'}`}>{t('flashcards')}</button>
                            </div>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-md">
                                {saveButtonText}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {outputTab === 'mind_map' && mindMap && <MindMapComponent data={mindMap} />}
                            {outputTab === 'flashcards' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                                    {flashcards.map((card, index) => <FlashcardComponent key={index} card={card} />)}
                                </div>
                            )}
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default Summarizer;
