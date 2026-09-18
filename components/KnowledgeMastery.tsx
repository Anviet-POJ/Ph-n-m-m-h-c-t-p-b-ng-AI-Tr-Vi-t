import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import { GRADES, SUBJECTS, TEXTBOOKS } from '../constants';
import { Subject, LibraryItemType, UserRole } from '../types';
import { ai, getFriendlyErrorMessage } from '../api';
import MarkdownRenderer from './MarkdownRenderer';

// Quick suggested topics by subject to help students get started instantly
const SUGGESTED_TOPICS: Record<string, string[]> = {
    [Subject.MATH]: [
        'Hệ thức Vi-ét và ứng dụng',
        'Giải hệ phương trình bậc nhất hai ẩn',
        'Định lý Pytago và hệ thức lượng trong tam giác vuông',
        'Phương trình bậc hai một ẩn và biệt thức Delta',
        'Hàm số bậc nhất và đồ thị',
        'Góc nội tiếp và góc ở tâm của đường tròn',
    ],
    [Subject.PHYSICS]: [
        'Định luật Ôm cho đoạn mạch nối tiếp và song song',
        'Công và công suất của dòng điện',
        'Hiện tượng khúc xạ ánh sáng',
        'Định luật vạn vật hấp dẫn',
        'Sóng cơ và sự truyền sóng âm',
    ],
    [Subject.CHEMISTRY]: [
        'Axit, Bazơ và Muối - Tính chất và phản ứng trao đổi',
        'Bảng tuần hoàn các nguyên tố hóa học',
        'Phản ứng oxi hóa - khử và cách cân bằng',
        'Kim loại kiềm, kiềm thổ và nhôm',
        'Hiđrocacbon: Metan, Etilen và Axetilen',
    ],
    [Subject.ENGLISH]: [
        'Present Perfect Tense (Thì hiện tại hoàn thành)',
        'Passive Voice (Câu bị động toàn diện)',
        'Conditional Sentences Type 1, 2, 3 (Câu điều kiện)',
        'Relative Clauses (Mệnh đề quan hệ who, which, that)',
        'Reported Speech (Câu gián tiếp tường thuật)',
    ],
    [Subject.LITERATURE]: [
        'Kỹ năng viết đoạn văn Nghị luận Xã hội (200 chữ)',
        'Phân tích các biện pháp tu từ: So sánh, Nhân hóa, Ẩn dụ',
        'Kỹ năng phân tích nhân vật trong tác phẩm truyện',
        'Các thành phần biệt lập trong câu',
    ],
    [Subject.BIOLOGY]: [
        'Quá trình Nguyên phân và Giảm phân',
        'Quy luật di truyền của Menđen',
        'Đột biến gen và đột biến nhiễm sắc thể',
        'Quang hợp và hô hấp ở thực vật',
    ],
    [Subject.NATURAL_SCIENCES]: [
        'Tốc độ chuyển động và đồ thị quãng đường - thời gian',
        'Phản ứng hóa học và định luật bảo toàn khối lượng',
        'Quang hợp ở thực vật và vai trò đối với sự sống',
        'Lực ma sát và ứng dụng trong đời sống',
    ],
    [Subject.HISTORY]: [
        'Cách mạng tháng Tám năm 1945',
        'Chiến dịch Điện Biên Phủ năm 1954',
        'Cuộc kháng chiến chống Mỹ cứu nước (1954 - 1975)',
    ],
    [Subject.GEOGRAPHY]: [
        'Vị trí địa lý và phạm vi lãnh thổ Việt Nam',
        'Đặc điểm khí hậu nhiệt đới gió mùa ẩm',
        'Sự phân hóa thiên nhiên theo độ cao',
    ],
    [Subject.INFORMATICS]: [
        'Thuật toán tìm kiếm nhị phân và sắp xếp nổi bọt',
        'Biến, kiểu dữ liệu và cấu trúc rẽ nhánh trong Python/C++',
        'Mạng máy tính và Internet',
    ],
    [Subject.CIVIC_EDUCATION]: [
        'Quyền bình đẳng của công dân trước pháp luật',
        'Quyền tự do cơ bản của công dân',
        'Ý nghĩa của đạo đức và pháp luật',
    ],
    [Subject.TECHNOLOGY]: [
        'Bản vẽ kỹ thuật và hình chiếu vuông góc',
        'Mạch điện điều khiển đơn giản',
        'Quy trình trồng trọt và bảo vệ cây trồng',
    ],
};

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return;
    } catch {
        // Fallback
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textArea);
    }
};

interface CachedKnowledge {
    topic: string;
    grade: number;
    subject: Subject;
    textbook: string;
    basicMarkdown?: string;
    basicWord?: string;
    advancedMarkdown?: string;
    advancedWord?: string;
    timestamp: number;
}

const KnowledgeMastery: React.FC = () => {
    const { t, language, userRole, addToLibrary, handleViolation } = useApp();

    const [selectedGrade, setSelectedGrade] = useState<number>(9);
    const [selectedSubject, setSelectedSubject] = useState<Subject>(Subject.MATH);
    const [selectedTextbook, setSelectedTextbook] = useState<string>(TEXTBOOKS[0]);
    const [topicInput, setTopicInput] = useState<string>('');
    const [focusNotes, setFocusNotes] = useState<string>('');

    // Active viewing mode: 'basic' | 'advanced'
    const [activeMode, setActiveMode] = useState<'basic' | 'advanced'>('basic');

    // Content storage for current topic
    const [basicContent, setBasicContent] = useState<{ markdown: string; word: string } | null>(null);
    const [advancedContent, setAdvancedContent] = useState<{ markdown: string; word: string } | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMode, setLoadingMode] = useState<'basic' | 'advanced' | 'both' | null>(null);
    const [error, setError] = useState<string | null>(null);

    // UI feedback states
    const [copyAsTextText, setCopyAsTextText] = useState<string>(t('copy_as_text'));
    const [copyForWordText, setCopyForWordText] = useState<string>(t('copy_for_word'));
    const [saveText, setSaveText] = useState<string>(t(userRole === UserRole.TEACHER ? 'save_to_documents' : 'save_to_library'));
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

    // Recent topics history from localStorage
    const [recentTopics, setRecentTopics] = useState<CachedKnowledge[]>(() => {
        try {
            const saved = localStorage.getItem('triviet_mastered_topics');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const resetSaveButton = () => {
        setSaveText(t(userRole === UserRole.TEACHER ? 'save_to_documents' : 'save_to_library'));
    };

    // Current active display content
    const currentMarkdown = activeMode === 'basic' ? (basicContent?.markdown || '') : (advancedContent?.markdown || '');
    const currentWord = activeMode === 'basic' ? (basicContent?.word || '') : (advancedContent?.word || '');

    // Stop TTS when unmounting or switching content
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Save recent topics to localStorage
    const saveToRecent = (item: CachedKnowledge) => {
        setRecentTopics(prev => {
            const filtered = prev.filter(p => !(p.topic.toLowerCase() === item.topic.toLowerCase() && p.grade === item.grade && p.subject === item.subject));
            const updated = [item, ...filtered].slice(0, 10);
            try {
                localStorage.setItem('triviet_mastered_topics', JSON.stringify(updated));
            } catch {
                // storage quota exceeded
            }
            return updated;
        });
    };

    // Prompt generator
    const buildPrompt = (mode: 'basic' | 'advanced' | 'both', topicName: string, notes: string) => {
        const textbookName = t(selectedTextbook);
        const subjectName = t(selectedSubject);

        return `
            Bạn là Chuyên gia Giáo dục & Giáo viên dạy giỏi xuất sắc theo Chương trình Giáo dục Phổ thông 2018 (Bộ GD&ĐT Việt Nam).
            Nhiệm vụ của bạn là giúp học sinh NẮM VỮNG KIẾN THỨC một cách tường minh, chuẩn mực và nhanh chóng nhất.

            THÔNG TIN HỌC TẬP:
            - Lớp: ${selectedGrade}
            - Môn học: ${subjectName}
            - Bộ sách: ${textbookName}
            - Bài học / Nội dung cần nắm chắc: "${topicName}"
            ${notes.trim() ? `- Trọng tâm học sinh muốn hiểu sâu / vướng mắc riêng: "${notes.trim()}"` : ''}
            - Chế độ yêu cầu: ${mode.toUpperCase()}
            - Ngôn ngữ phản hồi: ${language}

            YÊU CẦU CỐT LÕI TỪ NGƯỜI HỌC (TUÂN THỦ TUYỆT ĐỐI):
            "GIẢNG KĨ - NGẮN GỌN - DỄ HIỂU"
            1. GIẢNG KĨ: Phân tích tường minh bản chất vì sao lại như vậy, không chỉ liệt kê máy móc; nêu rõ điều kiện áp dụng, trường hợp ngoại lệ.
            2. NGẮN GỌN: Không viết văn mẫu lan man rườm rà, đi thẳng vào bản chất; dùng gạch đầu dòng súc tích, đóng khung công thức trọng tâm.
            3. DỄ HIỂU: Sử dụng ngôn từ sư phạm hiện đại, trong sáng, có ví dụ so sánh đời sống gần gũi và các bước giải 1-2-3 rõ ràng.

            ${mode === 'basic' || mode === 'both' ? `
            === CẤU TRÚC PHẦN KIẾN THỨC CƠ BẢN (basicMarkdown) ===
            # 📗 KIẾN THỨC CƠ BẢN: ${topicName}
            ## 1. 🎯 Bản chất & Định nghĩa cốt lõi (Hiểu trong 1 phút)
            - Khái niệm là gì? Dùng để giải quyết vấn đề gì?
            - Bản chất trực quan (ví dụ đời sống hoặc sơ đồ tư duy ngắn gọn).
            
            ## 2. ⚡ Công thức & Quy tắc vàng (Bắt buộc phải nhớ)
            - Liệt kê các công thức/quy tắc gốc quan trọng nhất.
            - Chú thích rõ từng đại lượng và đơn vị đo lường.
            - Mẹo ghi nhớ siêu tốc (cách nhớ nhanh, quy tắc bàn tay, vần điệu...).

            ## 3. 💡 Ví dụ mẫu từng bước (Dễ hiểu 100%)
            - 1 đến 2 ví dụ điển hình nhất từ mức Nhận biết đến Thông hiểu.
            - **Phân tích hướng tư duy:** Đọc đề thì nghĩ ngay đến công thức/quy tắc nào?
            - **Lời giải chi tiết:** Trình bày chuẩn mẫu từng bước như trong bài thi.

            ## 4. ⚠️ Lưu ý & Sai lầm ngớ ngẩn thường gặp
            - 2-3 lỗi sai học sinh hay làm mất điểm oan (quên điều kiện, nhầm dấu, sai đơn vị...) và cách né tránh.

            ## 5. 🚀 Thử tài nhanh (Tự kiểm tra)
            - 2 câu hỏi trắc nghiệm hoặc bài tập mini có kèm đáp án và giải thích ngắn để học sinh tự đánh giá xem đã nắm chắc bài chưa.
            ` : ''}

            ${mode === 'advanced' || mode === 'both' ? `
            === CẤU TRÚC PHẦN KIẾN THỨC NÂNG CAO (advancedMarkdown) ===
            # 🚀 KIẾN THỨC NÂNG CAO: ${topicName}
            ## 1. 🧠 Mở rộng tư duy & Bản chất chuyên sâu
            - Bản chất toán học/khoa học sâu sắc hơn, chứng minh hoặc xuất xứ công thức.
            - Mối liên kết giữa kiến thức này với các chủ đề khác trong chương trình thi HSG / Tuyển sinh 10 / THPT QG.

            ## 2. 💎 Các dạng bài phân loại & Kỹ thuật giải nhanh
            - Phân loại 2-3 dạng bài toán/câu hỏi phân loại điểm 9-10 thường gặp.
            - Phương pháp giải đột phá, công thức tính nhanh hoặc kỹ thuật tư duy đỉnh cao.

            ## 3. 🎯 Bài tập ví dụ nâng cao (Chiến thuật điểm 9-10)
            - 1-2 bài toán/câu hỏi Vận dụng cao.
            - **Chiến thuật nhận diện dạng bài:** Nhìn dấu hiệu nào để bẻ khóa bài toán?
            - **Lời giải mẫu chuẩn mực:** Trình bày chặt chẽ, tối ưu thời gian làm bài.

            ## 4. 💣 Bẫy đề thi kinh điển (Cạm bẫy của người ra đề)
            - Những bẫy tinh vi: trường hợp suy biến, điều kiện ngầm định, các trường hợp biên dễ bỏ sót.

            ## 5. 🔥 Bài tập rèn luyện tư duy
            - 1-2 bài tập thử thách để học sinh tự giải (kèm gợi ý tư duy và đáp số).
            ` : ''}

            QUY TẮC ĐỊNH DẠNG TOÁN HỌC & LATEX:
            - Công thức Toán, Lý, Hóa PHẢI đặt giữa [[MATH]]...[[/MATH]] hoặc sử dụng LaTeX chuẩn (ví dụ: [[MATH]]\\frac{-b \\pm \\sqrt{\\Delta}}{2a}[[/MATH]], [[MATH]]x_1 + x_2 = -\\frac{b}{a}[[/MATH]]).
            - VĂN BẢN TIẾNG ANH, CẤU TRÚC NGỮ PHÁP: Giữ nguyên dạng văn bản thuần (plain text, ví dụ: S + have/has + V3/ed). Tuyệt đối không dùng LaTeX cho cấu trúc ngữ pháp tiếng Anh.
            - ĐẢM BẢO dùng 2 dấu gạch chéo ngược \\\\ cho các lệnh LaTeX khi đóng gói trong chuỗi JSON (ví dụ: \\\\frac, \\\\sqrt, \\\\Delta).

            ĐỊNH DẠNG PHẢN HỒI (JSON BẮT BUỘC):
            Phản hồi PHẢI là một đối tượng JSON hợp lệ gồm các trường sau:
            {
              "basicMarkdown": "Nội dung markdown phần Cơ bản (hoặc chuỗi rỗng nếu không yêu cầu)",
              "basicWord": "Nội dung cho Microsoft Word phần Cơ bản (UnicodeMath)",
              "advancedMarkdown": "Nội dung markdown phần Nâng cao (hoặc chuỗi rỗng nếu không yêu cầu)",
              "advancedWord": "Nội dung cho Microsoft Word phần Nâng cao (UnicodeMath)"
            }
        `;
    };

    const handleGenerate = async (targetMode: 'basic' | 'advanced' | 'both') => {
        const cleanTopic = topicInput.trim();
        if (!cleanTopic) {
            setError(language === 'vi' ? 'Vui lòng nhập tên bài học hoặc nội dung muốn nắm chắc.' : 'Please enter a lesson topic or concept.');
            return;
        }

        setIsLoading(true);
        setLoadingMode(targetMode);
        setError(null);
        resetSaveButton();

        try {
            const prompt = buildPrompt(targetMode, cleanTopic, focusNotes);

            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: 'application/json',
                }
            });

            const text = response.text || '{}';
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch {
                // If response contains json markdown block
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("Không thể phân tích dữ liệu trả về từ AI.");
                }
            }

            if (parsed.basicMarkdown === 'VIOLATION_DETECTED' || parsed.advancedMarkdown === 'VIOLATION_DETECTED') {
                handleViolation('violation_reason_policy');
                setError(t('unsafe_content_error'));
                return;
            }

            let newBasic = basicContent;
            let newAdvanced = advancedContent;

            if (parsed.basicMarkdown && parsed.basicMarkdown.trim()) {
                newBasic = {
                    markdown: parsed.basicMarkdown.trim(),
                    word: (parsed.basicWord || parsed.basicMarkdown).trim(),
                };
                setBasicContent(newBasic);
            }

            if (parsed.advancedMarkdown && parsed.advancedMarkdown.trim()) {
                newAdvanced = {
                    markdown: parsed.advancedMarkdown.trim(),
                    word: (parsed.advancedWord || parsed.advancedMarkdown).trim(),
                };
                setAdvancedContent(newAdvanced);
            }

            // Set active mode based on target
            if (targetMode === 'basic') {
                setActiveMode('basic');
            } else if (targetMode === 'advanced') {
                setActiveMode('advanced');
            } else if (targetMode === 'both') {
                // Keep current or default to basic
                setActiveMode('basic');
            }

            // Cache in recent topics
            const cacheItem: CachedKnowledge = {
                topic: cleanTopic,
                grade: selectedGrade,
                subject: selectedSubject,
                textbook: selectedTextbook,
                basicMarkdown: newBasic?.markdown,
                basicWord: newBasic?.word,
                advancedMarkdown: newAdvanced?.markdown,
                advancedWord: newAdvanced?.word,
                timestamp: Date.now(),
            };
            saveToRecent(cacheItem);

        } catch (e: any) {
            console.error("KnowledgeMastery generate error:", e);
            const friendly = getFriendlyErrorMessage(e, language);
            setError(friendly);
        } finally {
            setIsLoading(false);
            setLoadingMode(null);
        }
    };

    // Switch between basic and advanced tab
    const handleSwitchTab = (mode: 'basic' | 'advanced') => {
        setActiveMode(mode);
        if (mode === 'basic' && !basicContent && topicInput.trim()) {
            handleGenerate('basic');
        } else if (mode === 'advanced' && !advancedContent && topicInput.trim()) {
            handleGenerate('advanced');
        }
    };

    // Load a cached topic from recent list
    const handleLoadRecent = (item: CachedKnowledge) => {
        setSelectedGrade(item.grade);
        setSelectedSubject(item.subject);
        setSelectedTextbook(item.textbook || TEXTBOOKS[0]);
        setTopicInput(item.topic);
        setBasicContent(item.basicMarkdown ? { markdown: item.basicMarkdown, word: item.basicWord || item.basicMarkdown } : null);
        setAdvancedContent(item.advancedMarkdown ? { markdown: item.advancedMarkdown, word: item.advancedWord || item.advancedMarkdown } : null);
        setActiveMode(item.basicMarkdown ? 'basic' : 'advanced');
        setError(null);
        resetSaveButton();
    };

    // Copy handlers
    const handleCopyAsText = () => {
        if (!currentMarkdown) return;
        const plainText = currentMarkdown
            .replace(/## /g, '\n')
            .replace(/### /g, '')
            .replace(/\[\[(?:MATH|math)\]\]/gi, '')
            .replace(/\[\[\/(?:MATH|math)\]\]/gi, '')
            .replace(/\$\$(.*?)\$\$/g, '$1')
            .replace(/\$(.*?)\$/g, '$1')
            .replace(/- /g, '• ')
            .trim();

        copyToClipboard(plainText)
            .then(() => {
                setCopyAsTextText(t('copied'));
                setTimeout(() => setCopyAsTextText(t('copy_as_text')), 2000);
            })
            .catch(() => alert('Không thể sao chép văn bản.'));
    };

    const handleCopyForWord = () => {
        if (!currentWord && !currentMarkdown) return;
        copyToClipboard(currentWord || currentMarkdown)
            .then(() => {
                setCopyForWordText(t('copied'));
                setTimeout(() => setCopyForWordText(t('copy_for_word')), 2000);
            })
            .catch(() => alert('Không thể sao chép định dạng cho Word.'));
    };

    // Save to library
    const handleSave = () => {
        if (!currentMarkdown) return;
        const modeLabel = activeMode === 'basic' ? t('basic_knowledge') : t('advanced_knowledge');
        const itemName = `${topicInput.trim()} (${modeLabel}) - Lớp ${selectedGrade} ${t(selectedSubject)}`;

        addToLibrary({
            name: itemName,
            type: LibraryItemType.KNOWLEDGE_MASTERY,
            content: currentMarkdown,
        });

        setSaveText(t('saved'));
        setTimeout(resetSaveButton, 2000);
    };

    // Text to Speech
    const handleToggleSpeech = () => {
        if (!('speechSynthesis' in window)) {
            alert('Trình duyệt của bạn không hỗ trợ tính năng đọc to giọng nói.');
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        if (!currentMarkdown) return;

        // Clean markdown for smoother voice reading
        const voiceText = currentMarkdown
            .replace(/\[\[(?:MATH|math)\]\][\s\S]*?\[\[\/(?:MATH|math)\]\]/gi, ' công thức toán ')
            .replace(/#+\s*/g, '')
            .replace(/\*+/g, '')
            .replace(/`+/g, '')
            .replace(/[-*•]\s+/g, ', ')
            .trim();

        const utterance = new SpeechSynthesisUtterance(voiceText);
        utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    // Download Markdown file
    const handleDownload = () => {
        if (!currentMarkdown) return;
        const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const modeSlug = activeMode === 'basic' ? 'co-ban' : 'nang-cao';
        a.download = `TriViet_NamVungKienThuc_${topicInput.replace(/\s+/g, '_')}_${modeSlug}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Available suggestions for current subject
    const subjectSuggestions = useMemo(() => {
        return SUGGESTED_TOPICS[selectedSubject] || SUGGESTED_TOPICS[Subject.MATH];
    }, [selectedSubject]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* LEFT COLUMN: Input & Configuration */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm p-5 sm:p-6 rounded-2xl">
                    {/* Header Banner */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {t('knowledge_mastery')}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {t('knowledge_mastery_desc')}
                            </p>
                        </div>
                    </div>

                    {/* Filter Grid: Grade, Subject, Textbook */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {/* Grade */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {t('grade')}
                            </label>
                            <select
                                value={selectedGrade}
                                onChange={(e) => {
                                    setSelectedGrade(Number(e.target.value));
                                    resetSaveButton();
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                            >
                                {GRADES.map((grade) => (
                                    <option key={grade} value={grade}>
                                        {t('grade')} {grade}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {t('subject')}
                            </label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => {
                                    setSelectedSubject(e.target.value as Subject);
                                    resetSaveButton();
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                            >
                                {SUBJECTS.map((subj) => (
                                    <option key={subj} value={subj}>
                                        {t(subj)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Textbook */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {t('textbook')}
                            </label>
                            <select
                                value={selectedTextbook}
                                onChange={(e) => {
                                    setSelectedTextbook(e.target.value);
                                    resetSaveButton();
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors truncate"
                            >
                                {TEXTBOOKS.map((tb) => (
                                    <option key={tb} value={tb}>
                                        {t(tb)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lesson / Topic Input */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-slate-700">
                                {t('enter_lesson_topic')} <span className="text-rose-500">*</span>
                            </label>
                            {topicInput && (
                                <button
                                    onClick={() => setTopicInput('')}
                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                        <textarea
                            rows={3}
                            value={topicInput}
                            onChange={(e) => {
                                setTopicInput(e.target.value);
                                resetSaveButton();
                            }}
                            placeholder={t('lesson_topic_placeholder')}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all custom-scrollbar"
                        />
                    </div>

                    {/* Quick Suggested Topic Chips */}
                    <div className="mb-4">
                        <span className="block text-xs font-semibold text-slate-500 mb-2">
                            💡 Gợi ý chủ đề tiêu biểu:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                            {subjectSuggestions.map((suggested, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setTopicInput(suggested);
                                        resetSaveButton();
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-medium transition-all text-left flex-shrink-0 active:scale-95"
                                >
                                    {suggested}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Focus / Notes */}
                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            {t('core_focus_optional')}
                        </label>
                        <input
                            type="text"
                            value={focusNotes}
                            onChange={(e) => setFocusNotes(e.target.value)}
                            placeholder={language === 'vi' ? 'Ví dụ: Phần em chưa hiểu rõ cách phân biệt dấu, mẹo làm bài...' : 'Specific parts you want more details on...'}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* ACTION BUTTONS: Basic vs Advanced */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                            {/* BASIC BUTTON */}
                            <button
                                onClick={() => handleGenerate('basic')}
                                disabled={isLoading || !topicInput.trim()}
                                className="w-full py-3 px-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-100 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                    <span>{t('learn_basic')}</span>
                                </div>
                                <span className="text-[11px] font-normal text-emerald-100">Cốt lõi, dễ hiểu</span>
                            </button>

                            {/* ADVANCED BUTTON */}
                            <button
                                onClick={() => handleGenerate('advanced')}
                                disabled={isLoading || !topicInput.trim()}
                                className="w-full py-3 px-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-100 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                                    <span>{t('learn_advanced')}</span>
                                </div>
                                <span className="text-[11px] font-normal text-indigo-100">Chuyên sâu, điểm 9-10</span>
                            </button>
                        </div>

                        {/* LEARN BOTH BUTTON */}
                        <button
                            onClick={() => handleGenerate('both')}
                            disabled={isLoading || !topicInput.trim()}
                            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-indigo-700 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>{t('learn_both')} (Nắm chắc cả hai phần)</span>
                        </button>
                    </div>
                </div>

                {/* RECENT TOPICS SECTION */}
                {recentTopics.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Bài học đã ôn tập gần đây
                            </h4>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('triviet_mastered_topics');
                                    setRecentTopics([]);
                                }}
                                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                            >
                                Xóa lịch sử
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {recentTopics.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleLoadRecent(item)}
                                    className="w-full p-2.5 rounded-xl text-left bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all flex items-center justify-between group"
                                >
                                    <div className="truncate pr-2">
                                        <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 truncate">
                                            {item.topic}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            Lớp {item.grade} • {t(item.subject)}
                                        </p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-medium group-hover:bg-indigo-100 group-hover:text-indigo-700 flex-shrink-0">
                                        Xem lại
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Output Viewer */}
            <div className="lg:col-span-7 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm p-4 sm:p-6 rounded-2xl flex flex-col min-h-[620px]">
                {/* Mode Selector & Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
                    {/* Mode Tabs: Basic vs Advanced */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs">
                        <button
                            onClick={() => handleSwitchTab('basic')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeMode === 'basic'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                            <span>{t('basic_knowledge')}</span>
                            {basicContent && <span className="text-[10px] ml-1 opacity-80">✓</span>}
                        </button>

                        <button
                            onClick={() => handleSwitchTab('advanced')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeMode === 'advanced'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-purple-300"></span>
                            <span>{t('advanced_knowledge')}</span>
                            {advancedContent && <span className="text-[10px] ml-1 opacity-80">✓</span>}
                        </button>
                    </div>

                    {/* Action Buttons Toolbar */}
                    {currentMarkdown && !isLoading && (
                        <div className="flex items-center flex-wrap gap-2">
                            {/* TTS Button */}
                            <button
                                onClick={handleToggleSpeech}
                                title="Đọc to bài học"
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                                    isSpeaking
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : 'Đọc bài'}</span>
                            </button>

                            {/* Copy as Text */}
                            <button
                                onClick={handleCopyAsText}
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                                title={t('copy_as_text')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{copyAsTextText}</span>
                            </button>

                            {/* Copy for Word */}
                            <button
                                onClick={handleCopyForWord}
                                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                                title={t('copy_for_word')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>{copyForWordText}</span>
                            </button>

                            {/* Save to Library */}
                            <button
                                onClick={handleSave}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span>{saveText}</span>
                            </button>

                            {/* Download file */}
                            <button
                                onClick={handleDownload}
                                title="Tải file về máy"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Body Container */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-inner overflow-hidden min-h-[480px]">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[420px]">
                            <div className="relative mb-4">
                                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 border-r-indigo-600 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl">✨</span>
                                </div>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mb-1">
                                {loadingMode === 'basic' && 'Đang chuẩn bị kiến thức cốt lõi...'}
                                {loadingMode === 'advanced' && 'Đang xây dựng kiến thức nâng cao & bứt phá...'}
                                {loadingMode === 'both' && 'Đang tổng hợp toàn bộ kiến thức Cơ bản & Nâng cao...'}
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm">
                                AI sư phạm Trí Việt đang biên soạn nội dung theo chuẩn GDPT 2018: giảng kĩ, ngắn gọn và dễ hiểu.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-rose-600 mb-4 max-w-md">{error}</p>
                            <button
                                onClick={() => handleGenerate(activeMode)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : currentMarkdown ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                            <MarkdownRenderer markdown={currentMarkdown} placeholder="" />
                        </div>
                    ) : (
                        /* Empty State or Mode Not Yet Generated */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            {/* If the current mode is not yet generated, but the other mode exists */}
                            {(activeMode === 'advanced' && basicContent && !advancedContent) ? (
                                <div className="max-w-md space-y-4">
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-xs">
                                        🚀
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-slate-800 mb-1">
                                            Chưa tạo phần Kiến thức Nâng cao
                                        </h4>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Bạn đã có phần Kiến thức Cơ bản cho bài <span className="font-semibold text-slate-700">"{topicInput}"</span>. Bấm nút dưới đây để tạo tiếp phần Nâng cao!
                                        </p>
                                        <button
                                            onClick={() => handleGenerate('advanced')}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                                        >
                                            ⚡ Tạo Kiến thức Nâng cao ngay
                                        </button>
                                    </div>
                                </div>
                            ) : (activeMode === 'basic' && advancedContent && !basicContent) ? (
                                <div className="max-w-md space-y-4">
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-xs">
                                        📗
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-slate-800 mb-1">
                                            Chưa tạo phần Kiến thức Cơ bản
                                        </h4>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Bạn đã có phần Kiến thức Nâng cao cho bài <span className="font-semibold text-slate-700">"{topicInput}"</span>. Bấm nút dưới đây để tạo thêm phần Cơ bản!
                                        </p>
                                        <button
                                            onClick={() => handleGenerate('basic')}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                                        >
                                            ⚡ Tạo Kiến thức Cơ bản ngay
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-md space-y-3">
                                    <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-700">
                                        {t('knowledge_mastery_placeholder')}
                                    </h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Nhập bài học cần ôn luyện ở khung bên trái và chọn nút <span className="text-emerald-600 font-semibold">Cơ bản</span> hoặc <span className="text-indigo-600 font-semibold">Nâng cao</span> để bắt đầu.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeMastery;
