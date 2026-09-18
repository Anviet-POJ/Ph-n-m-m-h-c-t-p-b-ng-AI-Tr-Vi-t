
// components/Chatbot.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse, Part } from '@google/genai';
import { useApp } from '../App';
import { ChatMessage, ChatFile, Dialect, Language, UserRole } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { TEXTBOOKS } from '../constants';
import { ai, getFriendlyErrorMessage } from '../api';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface SpeechRecognition {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onstart: () => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

const Chatbot: React.FC = () => {
    const { t, language, userRole, handleViolation } = useApp();
    const isTeacher = userRole === UserRole.TEACHER;
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [textbook, setTextbook] = useState('');
    const [manualTextbook, setManualTextbook] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [dialect, setDialect] = useState<Dialect>(Dialect.NORTH);
    const [helpRequestCount, setHelpRequestCount] = useState(0); // Track hint cycles
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [usageHistory, setUsageHistory] = useState<number[]>([]);
    const [showOveruseReminder, setShowOveruseReminder] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const [voiceSupported, setVoiceSupported] = useState(false);

    useEffect(() => {
        let dialectInstruction = '';
        if (language === Language.VI) {
            switch (dialect) {
                case Dialect.NORTH: dialectInstruction = 'Dùng giọng Bắc tự nhiên.'; break;
                case Dialect.CENTRAL: dialectInstruction = 'Dùng giọng Trung tự nhiên.'; break;
                case Dialect.SOUTH: dialectInstruction = 'Dùng giọng Nam tự nhiên.'; break;
            }
        }

        const teacherInstruction = `
            Bạn là Trợ lý AI Trí Việt chuyên nghiệp, tận tâm, được thiết kế chuyên biệt để hỗ trợ THẦY/CÔ GIÁO trong công tác giảng dạy, giáo dục và sư phạm.

            **QUY TẮC XƯNG HÔ BẮT BUỘC (QUAN TRỌNG NHẤT):**
            1. ĐỐI TƯỢNG TRÒ CHUYỆN LÀ THẦY/CÔ GIÁO:
               - Bạn PHẢI luôn luôn xưng hô với người trò chuyện là: "Thầy/Cô" hoặc "Quý Thầy/Cô".
            2. TUYỆT ĐỐI KHÔNG DÙNG TỪ "EM" VỚI NGƯỜI TRÒ CHUYỆN:
               - Tuyệt đối KHÔNG gọi Thầy/Cô là "em", "học sinh", "bạn", "con", "cháu" hay xưng hô như với học sinh dưới bất kỳ hình thức nào.
               - Không bao giờ được dùng từ "em" để nói về hoặc xưng hô với người đang trò chuyện.
            3. CÁCH AI TỰ XƯNG:
               - Bản thân AI tự xưng là "Tôi" hoặc "Trợ lý AI Trí Việt" (hoặc "Trí Việt").
               - Giữ thái độ kính trọng, lễ phép, lịch thiệp, chu đáo và chuẩn mực tác phong sư phạm (ví dụ: "Kính thưa Thầy/Cô...", "Dạ, tôi xin phép gửi Thầy/Cô...", "Kính gửi Thầy/Cô...", "Thầy/Cô cần hỗ trợ thêm nội dung gì không ạ?").
               - Tuyệt đối không xưng mình là thầy/cô với người dùng. Người dùng là Thầy/Cô, còn bạn là trợ lý của Thầy/Cô.

            **NHIỆM VỤ VÀ NĂNG LỰC CHUYÊN MÔN HỖ TRỢ GIÁO VIÊN:**
            - Hỗ trợ soạn giáo án (kế hoạch bài dạy theo khung chuẩn Công văn 5512/BGDĐT), thiết kế kế hoạch dạy học chi tiết với 4 hoạt động: Khởi động, Hình thành kiến thức mới, Luyện tập, Vận dụng.
            - Hỗ trợ xây dựng ma trận đề kiểm tra, bảng đặc tả, ngân hàng câu hỏi trắc nghiệm và tự luận phân hóa theo 3 mức độ (Nhận biết, Thông hiểu, Vận dụng) bám sát các bộ SGK mới (Kết nối tri thức, Cánh diều, Chân trời sáng tạo).
            - Cung cấp lời giải chi tiết, chuẩn xác, bài tập tương tự, bài tập nâng cao, dự án học tập, gợi ý phương pháp dạy học tích cực, tích hợp STEM/STEAM.
            - Trả lời trực diện, chi tiết, logic, sư phạm, KHÔNG giấu đáp án hay đố lại Thầy/Cô.

            **CHƯƠNG TRÌNH:** Tuân thủ chuẩn Chương trình Giáo dục Phổ thông 2018 của Bộ Giáo dục và Đào tạo Việt Nam.
            **NGÔN NGỮ:** ${language}. ${dialectInstruction}

            **QUY TẮC RENDER NỘI DUNG (BẮT BUỘC):**
            1. VĂN BẢN THÔNG THƯỜNG:
               - Không sử dụng LaTeX cho văn bản thông thường.
               - Không dùng dấu $ để bao quanh nội dung.
               - Các cấu trúc ngữ pháp tiếng Anh phải được viết dạng plain text (Ví dụ: S + V(s/es), S + do/does + not + V, Do/Does + S + V?). Tuyệt đối không viết $S + V(s/es)$.
            2. CÔNG THỨC TOÁN HỌC:
               - Công thức toán PHẢI được đặt giữa:
                 [[MATH]]
                 ...
                 [[/MATH]]
               - Nội dung bên trong [[MATH]] sử dụng LaTeX chuẩn (Ví dụ: [[MATH]]x^2 + y^2 = z^2[[/MATH]], [[MATH]]\\frac{a+b}{c}[[/MATH]]).
            3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
        `;

        const studentInstruction = `
            Bạn là bạn đồng hành học tập AI Trí Việt.
            
            **PHƯƠNG PHÁP SƯ PHẠM (SCAFFOLDING):**
            - Ưu tiên: Không đưa đáp án ngay. Hãy đặt câu hỏi gợi mở, đưa ra gợi ý, phương pháp.
            - **QUY TẮC ĐẶC BIỆT:** Nếu người dùng liên tục hỏi cùng một vấn đề hoặc tỏ ra không hiểu sau hơn 3 lần gợi ý, hãy THỰC HIỆN GIẢI CHI TIẾT TỪNG BƯỚC VÀ ĐƯA RA ĐÁP ÁN CUỐI CÙNG.
            
            **CHƯƠNG TRÌNH:** Tuân thủ GDPT 2018 của Việt Nam.
            **NGÔN NGỮ:** ${language}. ${dialectInstruction}
            
            **QUY TẮC RENDER NỘI DUNG (BẮT BUỘC):**
            1. VĂN BẢN THÔNG THƯỜNG:
               - Không sử dụng LaTeX cho văn bản thông thường.
               - Không dùng dấu $ để bao quanh nội dung.
               - Các cấu trúc ngữ pháp tiếng Anh phải được viết dạng plain text (Ví dụ: S + V(s/es), S + do/does + not + V, Do/Does + S + V?). Tuyệt đối không viết $S + V(s/es)$.
            2. CÔNG THỨC TOÁN HỌC:
               - Công thức toán PHẢI được đặt giữa:
                 [[MATH]]
                 ...
                 [[/MATH]]
               - Nội dung bên trong [[MATH]] sử dụng LaTeX chuẩn (Ví dụ: [[MATH]]x^2 + y^2 = z^2[[/MATH]], [[MATH]]\\frac{a+b}{c}[[/MATH]]).
            3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
        `;

        const systemInstruction = isTeacher ? teacherInstruction : studentInstruction;

        const newChat = ai.chats.create({
            model: 'gemini-3.8-flash',
            config: { systemInstruction },
        });
        setChat(newChat);
        const greeting = isTeacher ? t('teacher_chatbot_greeting') : (t('student_chatbot_greeting') || t('teacher_chatbot_greeting'));
        setMessages([{ role: 'model', text: greeting }]);
    }, [language, dialect, isTeacher]);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            setVoiceSupported(true);
            const recognition = new SpeechRecognitionAPI();
            recognitionRef.current = recognition;
            recognition.lang = language === Language.VI ? 'vi-VN' : 'en-US';
            recognition.onresult = (e: any) => setInput(prev => prev + e.results[0][0].transcript);
            recognition.onend = () => setIsRecording(false);
        }
    }, [language]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if ((!input.trim() && !attachedFile) || !chat || isLoading) return;

        const parts: Part[] = [];
        let userMessageFile: ChatFile | undefined = undefined;

        if (attachedFile) {
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(attachedFile);
            });
            parts.push({ inlineData: { data: base64Data, mimeType: attachedFile.type } });
            userMessageFile = { base64Data, mimeType: attachedFile.type, name: attachedFile.name };
        }

        let userQuery = input;
        
        if (!isTeacher) {
            // Logic to detect if student is asking for help/hint again
            const keywords = ['không hiểu', 'giúp tiếp', 'khó quá', 'đáp án là gì', "don't understand", "clueless"];
            const isAskingAgain = keywords.some(k => input.toLowerCase().includes(k));
            
            const newCount = isAskingAgain ? helpRequestCount + 1 : 1;
            setHelpRequestCount(newCount);

            if (newCount >= 4) {
                userQuery += "\n\n(Hệ thống: Người dùng đã không hiểu sau 3 lần gợi ý. Hãy thực hiện GIẢI CHI TIẾT TỪNG BƯỚC VÀ ĐƯA RA ĐÁP ÁN NGAY LẬP TỨC.)";
            }
        }

        parts.push({ text: userQuery });
        setMessages(prev => [...prev, { role: 'user', text: input, file: userMessageFile }]);
        setInput('');
        setAttachedFile(null);
        setIsLoading(true);

        try {
            const result = await chat.sendMessage({ message: parts });
            const responseText = result.text || "";
            if (responseText.includes('VIOLATION_DETECTED')) {
                handleViolation('violation_reason_policy');
                setMessages(prev => [...prev, { role: 'model', text: t('unsafe_content_error') }]);
            } else {
                const ethicsNote = isTeacher ? (t('ethics_reminder_teacher') || '') : t('ethics_reminder');
                setMessages(prev => [...prev, { role: 'model', text: responseText + (ethicsNote ? ethicsNote : '') }]);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: getFriendlyErrorMessage(error, language) }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-2xl">
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-xl p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-50 shadow-sm' : 'bg-slate-200'}`}>
                             {msg.file && (
                                <div className="mb-2">
                                    {msg.file.mimeType.startsWith('image/') && <img src={`data:${msg.file.mimeType};base64,${msg.file.base64Data}`} className="rounded-lg max-h-40" />}
                                    <p className="text-xs italic mt-1 opacity-60">{msg.file.name}</p>
                                </div>
                            )}
                             <MarkdownRenderer markdown={msg.text} placeholder="" />
                        </div>
                    </div>
                ))}
                {isLoading && <div className="text-sm text-slate-400 animate-pulse">AI đang suy nghĩ...</div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200">
                <div className="flex items-end space-x-2">
                    <input type="file" ref={fileInputRef} onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200">📎</button>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={isTeacher ? t('teacher_chatbot_placeholder') : (t('student_chatbot_placeholder') || t('teacher_chatbot_placeholder'))}
                        className="flex-1 p-3 border rounded-lg resize-none min-h-[48px]"
                    />
                    <button onClick={() => isRecording ? recognitionRef.current?.stop() : (setIsRecording(true), recognitionRef.current?.start())} className={`p-3 rounded-lg ${isRecording ? 'bg-red-500 text-white' : 'bg-slate-100'}`}>🎤</button>
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">🚀</button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
