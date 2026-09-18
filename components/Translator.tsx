import React, { useState, useEffect, useRef } from 'react';
import { Modality, Type } from '@google/genai';
import { useApp } from '../App';
import { Language } from '../types';
import { LANGUAGES } from '../constants';
import MarkdownRenderer from './MarkdownRenderer';
import { ai, getFriendlyErrorMessage } from '../api';

// Audio decoding helper functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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
    textArea.style.top = "-9999px";
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

const Translator: React.FC = () => {
  const { t, language, handleViolation } = useApp();
  const [sourceLang, setSourceLang] = useState<Language>(language);
  const [targetLang, setTargetLang] = useState<Language>(language === Language.EN ? Language.VI : Language.EN);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [wordContent, setWordContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyAsTextButtonText, setCopyAsTextButtonText] = useState(t('copy_as_text'));
  const [copyForWordButtonText, setCopyForWordButtonText] = useState(t('copy_for_word'));
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Reset button text when translated text changes
    setCopyAsTextButtonText(t('copy_as_text'));
    setCopyForWordButtonText(t('copy_for_word'));
  }, [translatedText, t]);


  const handleTextToSpeech = async () => {
    if (!translatedText.trim() || isSpeaking) return;
    setIsSpeaking(true);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: translatedText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }

        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContext,
            24000,
            1,
        );
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.start();
        source.onended = () => {
            setIsSpeaking(false);
            outputAudioContext.close();
        };

    } catch (e) {
        console.error("Text-to-speech error:", e);
        setIsSpeaking(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    setTranslatedText(''); // Clear previous results
    setWordContent('');
    setError(null); // Clear previous error

    try {
        const prompt = `
            Translate the following text from ${sourceLang} to ${targetLang}.
            Your primary task is to provide a grammatically correct and natural-sounding translation in ${targetLang}.

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
                 \frac{a+b}{c}
                 [[/MATH]]
            3. KHÔNG ĐƯỢC sử dụng $...$ hoặc $$...$$ để đánh dấu công thức toán.
            4. Translate ONLY the text outside the [[MATH]] delimiters. Preserve formulas inside [[MATH]] intact.
            5. **DOUBLE BACKSLASH RULE:** When outputting JSON, you **MUST** use double backslashes for all LaTeX commands inside [[MATH]] (e.g., \`\\\\frac\`, \`\\\\alpha\`, \`\\\\rightarrow\`).

            **SAFETY & EDUCATIONAL CONTEXT:**
            - If the source text contains topics like violence, law, or sensitive issues:
              - Translate them faithfully if they are in an **educational, legal, historical, or preventive context**.
              - **Only** flag as violation if the text actively encourages harm or illegal acts.

            **CRITICAL OUTPUT FORMAT:**
            Your entire response MUST be a single, valid JSON object in ${targetLang}.
            This object MUST have two keys:
            1.  \`markdownContent\`: The translated text with mathematical content correctly formatted in [[MATH]]...[[/MATH]].
            2.  \`wordContent\`: The translated text with math converted to Microsoft Word's native Equation format (UnicodeMath).

            Provide only the final JSON object, without any additional explanations.

            Text to translate:
            ---
            ${sourceText}
            ---
        `;
        
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
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            }
        });

        const result = JSON.parse(response.text || '{}');
        setTranslatedText(result.markdownContent || '');
        setWordContent(result.wordContent || '');

    } catch (e: any) {
        console.error("Translation error:", e);
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

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleCopyAsText = () => {
      copyToClipboard(translatedText)
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


  const LanguageSelector: React.FC<{ value: Language; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; }> = ({ value, onChange }) => (
    <select
      value={value}
      onChange={onChange}
      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
    >
      {LANGUAGES.map(lang => (
        <option key={lang} value={lang}>{lang}</option>
      ))}
    </select>
  );

  const isSafetyError = error === t('unsafe_content_error');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('source_language')}</label>
            <LanguageSelector value={sourceLang} onChange={(e) => setSourceLang(e.target.value as Language)} />
        </div>
        <div className="flex justify-center mt-6">
            <button onClick={handleSwapLanguages} title={t('swap_languages')} className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </button>
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('target_language')}</label>
            <LanguageSelector value={targetLang} onChange={(e) => setTargetLang(e.target.value as Language)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder={t('source_text_placeholder')}
          className="w-full h-48 p-4 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
        />
        <div className="relative w-full h-48 p-4 bg-slate-100 border border-slate-200 rounded-lg">
          {isLoading ? (
             <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className={`flex items-center justify-center h-full text-center p-2 ${isSafetyError ? 'text-red-600 font-bold text-xl bg-red-50 border-2 border-red-200 rounded-xl' : 'text-red-600 font-semibold'}`}>
                {error}
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <MarkdownRenderer markdown={translatedText} placeholder="" />
            </div>
          )}
          {translatedText && !isLoading && !error && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button onClick={handleTextToSpeech} disabled={isSpeaking} title={t('read_aloud')} className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-wait">
                    {isSpeaking ? (
                        <svg className="h-5 w-5 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                <button onClick={handleCopyAsText} title={t('copy_as_text')} className="px-3 py-2 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors text-sm">
                    {copyAsTextButtonText}
                </button>
                 <button onClick={handleCopyToWord} title={t('copy_for_word')} className="px-3 py-2 rounded-full bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:opacity-50 transition-colors text-sm">
                    {copyForWordButtonText}
                </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center">
        <button onClick={handleTranslate} disabled={isLoading || !sourceText.trim()} className="w-full max-w-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
          {isLoading ? t('generating') : t('translate_button')}
        </button>
      </div>
    </div>
  );
};

export default Translator;