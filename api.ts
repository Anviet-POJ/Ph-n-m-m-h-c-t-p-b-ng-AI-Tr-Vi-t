
import { GoogleGenAI } from "@google/genai";

export const getApiKey = (): string => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
            if (process.env.API_KEY) return process.env.API_KEY;
        }
    } catch (e) {
        // ignore
    }
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('triViet_apiKey');
            if (stored) return stored;
        } catch (e) {
            // ignore
        }
    }
    return '';
};

// Returns a human-friendly localized error string instead of raw JSON 503/429
export const getFriendlyErrorMessage = (error: any, language: string = 'vi'): string => {
    const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || '');
    const is503 = errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand') || errorStr.includes('experiencing high demand');
    const is429 = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota');
    const isSafety = errorStr.includes('SAFETY') || errorStr.includes('safety') || errorStr.includes('blocked');

    if (language === 'vi') {
        if (is503) {
            return 'Máy chủ AI hiện đang có lượng truy cập cao tạm thời (503). Hệ thống đã tự động thử lại nhưng chưa hoàn tất. Vui lòng nhấn nút "Thử lại" bên dưới sau giây lát.';
        }
        if (is429) {
            return 'Đã chạm hạn mức yêu cầu tạm thời (429). Vui lòng đợi khoảng 1 phút rồi nhấn "Thử lại".';
        }
        if (isSafety) {
            return 'Nội dung bị chặn bởi chính sách an toàn của hệ thống.';
        }
        return 'Đã xảy ra sự cố khi xử lý dữ liệu với AI. Vui lòng thử lại.';
    } else {
        if (is503) {
            return 'The AI service is currently experiencing temporary high demand (503). Please click "Try Again" in a few moments.';
        }
        if (is429) {
            return 'Rate limit exceeded (429). Please wait a moment and try again.';
        }
        if (isSafety) {
            return 'The request was blocked by safety guidelines.';
        }
        return 'An error occurred while generating AI content. Please try again.';
    }
};

function createResilientAI(apiKey: string): GoogleGenAI {
    const rawAi = new GoogleGenAI({
        apiKey: apiKey || "TEMPORARY_KEY",
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build'
            }
        }
    });

    const originalGenerateContent = rawAi.models.generateContent.bind(rawAi.models);
    const originalChatsCreate = rawAi.chats.create.bind(rawAi.chats);

    // Resilient generateContent with model mapping, automatic retries, and fallback on 503 / 429
    rawAi.models.generateContent = async (params: any) => {
        let model = params?.model || 'gemini-3.8-flash';
        
        // Normalize deprecated or high-demand models to standard stable models
        if (model === 'gemini-2.5-flash' || model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-preview') {
            model = 'gemini-3.8-flash';
        } else if (model === 'gemini-2.5-flash-preview-tts') {
            model = 'gemini-3.1-flash-tts-preview';
        }

        // Establish fallback chain
        const candidateModels: string[] = [model];
        if (model === 'gemini-3.8-flash') {
            candidateModels.push('gemini-flash-latest');
        } else if (model === 'gemini-flash-latest') {
            candidateModels.push('gemini-3.8-flash');
        } else if (model === 'gemini-3.1-flash-tts-preview') {
            candidateModels.push('gemini-2.5-flash-preview-tts');
        }

        let lastError: any;
        const maxRetriesPerModel = 2;

        for (const targetModel of candidateModels) {
            for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
                try {
                    return await originalGenerateContent({
                        ...params,
                        model: targetModel,
                    });
                } catch (err: any) {
                    lastError = err;
                    const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
                    const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
                    const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
                    const isTransient = msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout');

                    if (!is503 && !is429 && !isTransient) {
                        // Non-retryable error (e.g. invalid arguments or safety block), fail immediately
                        throw err;
                    }

                    // Exponential backoff before next retry
                    const backoffMs = (attempt + 1) * 1200;
                    await new Promise((resolve) => setTimeout(resolve, backoffMs));
                }
            }
        }

        throw lastError;
    };

    // Resilient chats.create
    rawAi.chats.create = (params: any) => {
        let model = params?.model || 'gemini-3.8-flash';
        if (model === 'gemini-2.5-flash' || model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-preview') {
            model = 'gemini-3.8-flash';
        }
        return originalChatsCreate({
            ...params,
            model,
        });
    };

    return rawAi;
}

// Initialize with environment key or placeholder
export let ai = createResilientAI(getApiKey());

export const initializeAI = (apiKey?: string) => {
    const resolvedKey = apiKey || getApiKey();
    if (resolvedKey) {
        ai = createResilientAI(resolvedKey);
    }
};
