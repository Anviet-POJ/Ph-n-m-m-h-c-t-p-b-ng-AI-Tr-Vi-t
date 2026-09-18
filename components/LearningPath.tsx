import React, { useState, useEffect, useRef } from 'react';
import { Type } from '@google/genai';
import { useApp } from '../App';
import { GRADES, SUBJECTS, TEXTBOOKS } from '../constants';
import { Subject, Lesson, LibraryItemType, Language } from '../types';
import MarkdownRenderer, { MathText } from './MarkdownRenderer';
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

const KatexRenderer: React.FC<{ text: string, className: string }> = ({ text, className }) => {
    return <span className={className}><MathText text={text} /></span>;
};


// Helper to create a unique key for localStorage based on grade, subject, and textbook
const getStorageKey = (grade: number, subject: Subject, textbook: string) => `triVietLearningPath_${grade}_${subject}_${textbook}`;

const learningPathSubjects = SUBJECTS.filter(s => s !== Subject.NATURAL_SCIENCES);


const LearningPath: React.FC = () => {
    const { t, language, studentGoal, handleViolation } = useApp();
    // Initialize with empty values to force user selection
    const [config, setConfig] = useState({ grade: '' as any, subject: '' as any, textbook: '' });
    const [manualTextbook, setManualTextbook] = useState('');
    const [plan, setPlan] = useState<Lesson[]>([]);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [markdownContent, setMarkdownContent] = useState('');
    const [wordContent, setWordContent] = useState('');
    const [isLoading, setIsLoading] = useState<'plan' | 'lesson' | false>(false);
    const [error, setError] = useState<string | null>(null);
    const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
    const [copyAsTextButtonText, setCopyAsTextButtonText] = useState(t('copy_as_text'));
    const [copyForWordButtonText, setCopyForWordButtonText] = useState(t('copy_for_word'));
    const [isReviewSessionActive, setIsReviewSessionActive] = useState(false);


    useEffect(() => {
        setCopyAsTextButtonText(t('copy_as_text'));
        setCopyForWordButtonText(t('copy_for_word'));
    }, [markdownContent, t]);


    // Effect to load progress from localStorage when component mounts or config changes
    useEffect(() => {
        if (!config.grade || !config.subject || !config.textbook) return;

        setIsReviewSessionActive(false);
        const storageKey = getStorageKey(config.grade, config.subject, config.textbook);
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const { savedPlan, savedIndex } = JSON.parse(savedData);
                if (savedPlan && Array.isArray(savedPlan) && typeof savedIndex === 'number') {
                    setPlan(savedPlan);
                    setCurrentLessonIndex(savedIndex);
                    setMarkdownContent(''); // Clear content for the next lesson
                    setWordContent('');
                    return; // Exit if data is successfully loaded
                }
            }
            // If no data or invalid data, reset the state for the new config
            setPlan([]);
            setCurrentLessonIndex(0);
            setMarkdownContent('');
            setWordContent('');
        } catch (e) {
            console.error("Failed to load learning path from localStorage:", e);
             // Reset on error
            setPlan([]);
            setCurrentLessonIndex(0);
            setMarkdownContent('');
            setWordContent('');
        }
    }, [config.grade, config.subject, config.textbook]);

    // Effect to save progress to localStorage whenever the plan or current lesson index changes
    useEffect(() => {
        // Only save if there's a valid plan to prevent overwriting with an empty one
        if (plan.length > 0 && config.grade && config.subject && config.textbook) {
            const storageKey = getStorageKey(config.grade, config.subject, config.textbook);
            try {
                const dataToSave = {
                    savedPlan: plan,
                    savedIndex: currentLessonIndex,
                };
                localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            } catch (e) {
                console.error("Failed to save learning path to localStorage:", e);
            }
        }
    }, [plan, currentLessonIndex, config.grade, config.subject, config.textbook]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'textbook' && value !== 'other') {
            setManualTextbook('');
        }
        setConfig(prev => ({ ...prev, [name]: name === 'grade' ? parseInt(value) : value }));
    };

    const generatePlan = async () => {
        if (!config.grade || !config.subject || !config.textbook) return;
        if (config.textbook === 'other' && !manualTextbook.trim()) return;

        const textbookName = config.textbook === 'other' ? manualTextbook : t(config.textbook);

        setIsLoading('plan');
        setError(null);
        setIsReviewSessionActive(false);
        // Clear any old plan from state and storage before generating a new one
        const storageKey = getStorageKey(config.grade, config.subject, config.textbook);
        localStorage.removeItem(storageKey);
        setPlan([]);
        setMarkdownContent('');
        setWordContent('');
        
        try {
            const prompt = `
                Create a structured learning plan for a grade ${config.grade} student in ${t(config.subject)} using the textbook "${textbookName}".
                The student's learning goal is "${t(studentGoal!)}".
                The plan must consist of 5 to 7 logically ordered, distinct lesson topics based on the **Table of Contents** of the specified textbook.
                
                **CRITICAL LANGUAGE RULE (MUST FOLLOW):**
                The user has explicitly selected **${language}** as their interface language.
                - The lesson topics in the JSON output **MUST be exclusively in ${language}**.
                - If the subject name or standard curriculum terms are in English, you **MUST translate** them to **${language}**.
                - Do NOT output English unless **${language}** is explicitly English.

                **SAFETY CHECK:**
                If the user asks to generate passwords or credentials, this is a violation. Return a JSON object where "plan" contains the single string "VIOLATION_DETECTED".

                **QUY TẮC RENDER NỘI DUNG:**
                - Văn bản thông thường, ngữ pháp tiếng Anh (như S + V(s/es)): Dùng plain text, TUYỆT ĐỐI không dùng ký tự $.
                - Công thức toán: Bắt buộc đặt trong [[MATH]]...[[/MATH]] (Ví dụ: "Hệ phương trình bậc nhất hai ẩn [[MATH]]ax + by = c[[/MATH]]"). KHÔNG dùng $ hoặc $$.
                - **DOUBLE BACKSLASH RULE:** When outputting JSON, you **MUST** use double backslashes for all LaTeX commands inside [[MATH]] (e.g., \`\\\\frac\`, \`\\\\alpha\`, \`\\\\rightarrow\`).

                Your entire response MUST be a single JSON object with a key "plan" which is an array of strings. Each string is a lesson topic.
                Do not include any other text or formatting.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                 config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            plan: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['plan']
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            
            if (result.plan && result.plan.includes("VIOLATION_DETECTED")) {
                handleViolation('violation_reason_policy');
                return;
            }

            if (result.plan && result.plan.length > 0) {
                setPlan(result.plan.map((topic: string) => ({ topic, completed: false })));
                setCurrentLessonIndex(0);
                setRetryAction(null);
            } else {
                throw new Error("Failed to generate a valid plan.");
            }
        } catch (e) {
            console.error("Error generating plan:", e);
            setError(getFriendlyErrorMessage(e, language));
            setRetryAction(() => () => generatePlan());
        } finally {
            setIsLoading(false);
        }
    };
    
    const baseGenerationLogic = async (prompt: string, onRetry?: () => void) => {
        setIsLoading('lesson');
        setError(null);
        setMarkdownContent('');
        setWordContent('');
        try {
            // We are requesting raw markdown now to avoid JSON truncation issues on long texts
            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
            });
            
            const lessonText = response.text || '';
            
            if (lessonText.includes('VIOLATION_DETECTED')) {
                handleViolation('violation_reason_policy');
                return;
            }

            // Remove possible markdown code block wrapping if the model adds it
            const cleanLessonText = lessonText.replace(/^```markdown\s*/, '').replace(/```$/, '').trim();
            
            setMarkdownContent(cleanLessonText);
            // Reuse markdown content for word content to save tokens
            setWordContent(cleanLessonText);
            setRetryAction(null);

        } catch (e) {
            console.error("Error generating lesson:", e);
            setError(getFriendlyErrorMessage(e, language));
            if (onRetry) {
                setRetryAction(() => onRetry);
            }
        } finally {
            setIsLoading(false);
        }
    };


    const generateLesson = async (topic: string) => {
        const textbookName = config.textbook === 'other' ? manualTextbook : t(config.textbook);
        const prompt = `
            You are an AI Tutor. Create a comprehensive lesson for a grade ${config.grade} student about the topic: "${topic}".
            The content MUST be strictly based on the textbook: "${textbookName}".
            The student's learning goal is "${t(studentGoal!)}".

            **CRITICAL LANGUAGE RULE (MUST FOLLOW):**
            The user has explicitly selected **${language}** as their interface language.
            - The entire lesson, including all explanations, questions, options, and headers (like 'Introduction', 'Exercises'), **MUST be in ${language}**.
            - **Do not output English unless ${language} is explicitly English.**
            - Even if the topic is technical, translate explanations to **${language}**.

            **SAFETY CHECK:**
            You MUST strict forbid requests related to:
            1. **Legal/Commitment Violations**: Generating passwords, credentials, cheating tools, or illegal acts.
            2. **School Violence**: Content PROMOTING bullying, physical/mental abuse in schools.
            
            **EXCEPTION:** If the topic is purely educational, historical, or preventive, proceed. Only block if it promotes harm.

            If detected, return "VIOLATION_DETECTED".

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
               - Nội dung bên trong [[MATH]] sử dụng LaTeX chuẩn.
               - Ví dụ:
                 [[MATH]]
                 x^2 + y^2 = z^2
                 [[/MATH]]
                 [[MATH]]
                 \sqrt{x^2+y^2}
                 [[/MATH]]
                 [[MATH]]
                 \frac{a+b}{c}
                 [[/MATH]]
            3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
            4. Khi bài học có cả tiếng Anh và Toán: Tiếng Anh, giải thích, cấu trúc câu → plain text; Công thức Toán → [[MATH]]...[[/MATH]].
            5. QUY TẮC BÀI TẬP TỰ LUẬN VÀ CÁC Ý a), b), c):
               - Khi câu hỏi hoặc lời giải có nhiều ý (ví dụ ý a, ý b, ý c):
                 + Mỗi ý BẮT BUỘC viết trên một dòng riêng biệt, bắt đầu bằng: **a)**, **b)**, **c)**,...
                 + TUYỆT ĐỐI KHÔNG viết dính liền nhiều ý trên cùng 1 dòng (CẤM VIẾT: "[[MATH]]...[[/MATH]]. b) [[MATH]]...").
                 + Từng bước tính toán của mỗi ý phải xuống dòng rõ ràng, mỗi biểu thức toán nằm trong 1 khối [[MATH]] riêng biệt.
            
            **CRITICAL OUTPUT FORMAT:**
            - Output the lesson content DIRECTLY in **Markdown** format.
            - **DO NOT** use JSON.
            - **DO NOT** wrap the output in code blocks (like \`\`\`markdown).

            **Lesson Structure:**
            -   **Title** (Use # Heading)
            -   **Explanation:** A clear explanation of the main concepts from the textbook.
            -   **Multiple Choice Questions:** 3-5 MCQs with 4 options (A, B, C, D) based on the lesson.
            -   **Essay Question:** 1 critical thinking question (if having sub-questions, clearly separate **a)**, **b)** on new lines).
            -   **Formatting:** Use Markdown headers (##) for structure.

            Now, generate the lesson content based on these absolute rules.
        `;
        await baseGenerationLogic(prompt, () => generateLesson(topic));
    };

    const generateReviewLesson = async (reviewType: 'numbers' | 'geometry' | 'both') => {
        setIsReviewSessionActive(true);
        const textbookName = config.textbook === 'other' ? manualTextbook : t(config.textbook);
        const reviewTopicMap = {
            numbers: t('numbers'),
            geometry: t('geometry'),
            both: t('both')
        };
        const topic = reviewTopicMap[reviewType];
        
        let topicFocusInstruction = '';
        if (reviewType === 'numbers') {
            topicFocusInstruction = "The lesson MUST focus exclusively on Numbers and Algebra. DO NOT include any Geometry topics.";
        } else if (reviewType === 'geometry') {
            topicFocusInstruction = "The lesson MUST focus exclusively on Geometry. DO NOT include any Numbers and Algebra topics.";
        } else { // 'both'
            topicFocusInstruction = "The lesson should provide a balanced review of both Numbers & Algebra and Geometry.";
        }

        const prompt = `
            You are an AI Tutor specializing in ${t(config.subject)}. Create a comprehensive review lesson for a grade ${config.grade} student.
            The student's learning goal is "${t(studentGoal!)}".
            The review topic is: **${topic}**.
            The content MUST be strictly based on the textbook: "${textbookName}".

            **Topic Focus:** ${topicFocusInstruction}
            
            **CRITICAL LANGUAGE RULE (MUST FOLLOW):**
            The user has explicitly selected **${language}** as their interface language.
            - The entire lesson, including all explanations, exercises, and headers, **MUST be in ${language}**.
            - **Do not output English unless ${language} is explicitly English.**
            
            **SAFETY CHECK:**
            You MUST strict forbid requests related to:
            1. **Legal/Commitment Violations**: Generating passwords, credentials, cheating tools, or illegal acts.
            2. **School Violence**: Content PROMOTING bullying, physical/mental abuse in schools.
            
            If detected, return "VIOLATION_DETECTED".

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
               - Nội dung bên trong [[MATH]] sử dụng LaTeX chuẩn.
               - Ví dụ:
                 [[MATH]]
                 \sum_{i=1}^{n} i
                 [[/MATH]]
                 [[MATH]]
                 \frac{a+b}{c}
                 [[/MATH]]
            3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
            4. Khi bài học có cả tiếng Anh và Toán: Tiếng Anh, giải thích, cấu trúc câu → plain text; Công thức Toán → [[MATH]]...[[/MATH]].
            5. QUY TẮC BÀI TẬP TỰ LUẬN VÀ CÁC Ý a), b), c):
               - Khi một bài toán có nhiều ý tính toán hoặc chứng minh (ví dụ: a), b), c)):
                 + Mỗi ý BẮT BUỘC phải nằm trên một dòng riêng biệt với định dạng: **a)**, **b)**, **c)**,...
                 + TUYỆT ĐỐI KHÔNG viết dính liền câu b) vào cuối câu a) trên cùng một dòng (CẤM: "[[MATH]]...[[/MATH]]. b) [[MATH]]...").
                 + Từng bước giải và biến đổi công thức phải xuống dòng rõ ràng, mỗi biểu thức đặt trong khối [[MATH]] riêng biệt.
            
            **CRITICAL OUTPUT FORMAT:**
            - Output the review lesson content DIRECTLY in **Markdown** format.
            - **DO NOT** use JSON.
            - **DO NOT** wrap the output in code blocks.

            **Lesson Structure:**
            1.  **Title** (Use # Heading)
            2.  **Explanation of Key Concepts:** A clear summary of the core theories and formulas from the textbook.
            3.  **Worked Examples:** Provide 2-3 step-by-step examples.
            4.  **Practice Exercises:** Provide 5-7 practice exercises of varying difficulty, including their solutions (strictly separating sub-questions **a)**, **b)** on distinct lines).
            5.  **Formatting:** Use Markdown headers (##, ###) for structure.

            Now, generate the review lesson content based on these absolute rules.
        `;
        await baseGenerationLogic(prompt, () => generateReviewLesson(reviewType));
    };

    const handleLessonClick = (index: number) => {
        if (index === currentLessonIndex) {
            setIsReviewSessionActive(false);
            generateLesson(plan[index].topic);
        }
    };

    const handleMarkComplete = () => {
        const updatedPlan = [...plan];
        updatedPlan[currentLessonIndex].completed = true;
        setPlan(updatedPlan);

        if (currentLessonIndex < plan.length - 1) {
            setCurrentLessonIndex(currentLessonIndex + 1);
            setMarkdownContent(''); // Clear content for the next lesson
            setWordContent('');
        } else {
            // Last lesson completed
            setMarkdownContent(markdownContent + "\n\n---\n\n# Congratulations! You have completed the learning path!");
        }
    };

    const handleCopyAsText = () => {
        if (!markdownContent) return;

        const plainText = markdownContent
            .replace(/## /g, '\n')
            .replace(/### /g, '')
            .replace(/\$\$(.*?)\$\$/g, '$1')
            .replace(/\$(.*?)\$/g, '$1')
            .replace(/- /g, '- ')
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Config and Plan */}
            <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col space-y-4">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('learning_path')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600">{t('grade')}</label>
                        <select name="grade" value={config.grade} onChange={handleConfigChange} className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition">
                            <option value="" disabled>{t('select_grade')}</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">{t('subject')}</label>
                        <select name="subject" value={config.subject} onChange={handleConfigChange} className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition">
                            <option value="" disabled>{t('select_subject')}</option>
                            {learningPathSubjects.map(s => <option key={s} value={s}>{t(s)}</option>)}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-600">{t('textbook')}</label>
                    <select name="textbook" value={config.textbook} onChange={handleConfigChange} className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition">
                        <option value="" disabled>{t('select_textbook')}</option>
                        {TEXTBOOKS.map(tb => <option key={tb} value={tb}>{t(tb)}</option>)}
                    </select>
                    {config.textbook === 'other' && (
                        <input
                            type="text"
                            value={manualTextbook}
                            onChange={(e) => setManualTextbook(e.target.value)}
                            placeholder={t('manual_textbook_placeholder')}
                            className="mt-2 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            disabled={isLoading !== false}
                        />
                    )}
                </div>

                <button onClick={generatePlan} disabled={isLoading === 'plan' || !config.grade || !config.subject || !config.textbook || (config.textbook === 'other' && !manualTextbook.trim())} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105">
                    {isLoading === 'plan' ? t('generating') : t('generate_plan')}
                </button>

                {plan.length > 0 && config.subject === Subject.MATH && (
                    <div className="mt-2 pt-4 border-t border-slate-200">
                        <h4 className="text-md font-semibold text-slate-700 mb-3">{t('specialized_review')}</h4>
                        <div className="grid grid-cols-3 gap-2">
                             <button onClick={() => generateReviewLesson('numbers')} disabled={isLoading === 'lesson'} className="px-2 py-2 text-sm bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors">{t('numbers')}</button>
                             <button onClick={() => generateReviewLesson('geometry')} disabled={isLoading === 'lesson'} className="px-2 py-2 text-sm bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors">{t('geometry')}</button>
                             <button onClick={() => generateReviewLesson('both')} disabled={isLoading === 'lesson'} className="px-2 py-2 text-sm bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors">{t('both')}</button>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    {plan.length > 0 ? (
                        <ol className="space-y-3 mt-4">
                            {plan.map((lesson, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => handleLessonClick(index)}
                                        disabled={index > currentLessonIndex}
                                        className={`w-full text-left p-3 rounded-lg border-l-4 transition-all duration-300 ${
                                            index < currentLessonIndex ? 'bg-green-100 border-green-400 cursor-default' :
                                            index === currentLessonIndex ? 'bg-indigo-100 border-indigo-400 hover:bg-indigo-200/70' :
                                            'bg-slate-200/60 border-slate-300 cursor-not-allowed opacity-70'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <KatexRenderer text={`${index + 1}. ${lesson.topic}`} className="font-medium" />
                                            {index < currentLessonIndex && <span className="text-xs font-bold text-green-600 flex-shrink-0 ml-2">{t('completed')}</span>}
                                            {index === currentLessonIndex && <span className="text-xs font-bold text-indigo-600 flex-shrink-0 ml-2">{t('current_lesson')}</span>}
                                            {index > currentLessonIndex && <span className="text-xs font-bold text-slate-500 flex-shrink-0 ml-2">{t('locked')}</span>}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    ) : isLoading !== 'plan' && (
                         <div className="flex items-center justify-center h-full text-slate-500 text-center p-4">
                            {t('plan_placeholder')}
                        </div>
                    )}
                </div>
            </div>
            {/* Right Panel: Lesson Content */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-2 rounded-2xl min-h-[600px] flex flex-col">
                {isLoading === 'lesson' || isLoading === 'plan' ? (
                    <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div></div>
                ) : error ? (
                    <div className={`flex flex-col items-center justify-center h-full text-center p-6 ${isSafetyError ? 'text-red-600 font-bold text-2xl bg-red-50 border-2 border-red-200 rounded-xl' : 'text-red-600 font-medium'}`}>
                        <p className="max-w-lg mb-2">{error}</p>
                        {retryAction && !isSafetyError && (
                            <button
                                onClick={() => {
                                    setError(null);
                                    retryAction();
                                }}
                                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all transform hover:scale-105 cursor-pointer"
                            >
                                <span>{language === Language.VI ? '🔄 Thử lại ngay' : '🔄 Try Again'}</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 h-full overflow-y-auto bg-white rounded-lg custom-scrollbar">
                        <MarkdownRenderer
                            markdown={markdownContent}
                            placeholder={plan.length > 0 ? t('lesson_placeholder') : t('plan_placeholder')}
                        />
                    </div>
                )}
                 {markdownContent && !isLoading && (
                    <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                        {!isReviewSessionActive && currentLessonIndex < plan.length && !plan[currentLessonIndex].completed ? (
                            <button onClick={handleMarkComplete} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105">
                                {t('mark_complete')}
                            </button>
                        ) : <div className="flex-1"></div>}
                        <div className="flex-1 flex gap-2">
                             <button 
                                onClick={handleCopyAsText}
                                className="flex-1 bg-slate-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105">
                                {copyAsTextButtonText}
                            </button>
                             <button 
                                onClick={handleCopyToWord}
                                className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all transform hover:scale-105">
                                {copyForWordButtonText}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningPath;