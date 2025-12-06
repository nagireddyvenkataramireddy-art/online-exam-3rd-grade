import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { Clock, CheckCircle, ChevronLeft, ChevronRight, Lightbulb, Save, Volume2, VolumeX, Menu, X, Flag, RotateCcw, BookOpen, Mic, PenTool, Eraser, Trash } from 'lucide-react';
import { getAiHint } from '../services/geminiService';

interface ExamSessionProps {
  questions: Question[];
  topic: string;
  examId: string; // Used for localStorage key
  initialState?: {
    userAnswers: Record<string, string>;
    timeTaken: number;
    currentQuestionIndex: number;
    markedQuestions: string[];
  };
  timeLimit?: number; // Optional time limit in seconds
  onFinish: (userAnswers: Record<string, string>, timeTaken: number) => void;
  onBack: () => void;
}

const ExamSession: React.FC<ExamSessionProps> = ({ questions, topic, examId, initialState, timeLimit, onFinish, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(initialState?.userAnswers || {});
  const [markedQuestions, setMarkedQuestions] = useState<string[]>(initialState?.markedQuestions || []);
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([questions[0]?.id]);
  
  // Use provided timeLimit or default to 1 minute per question
  const [timeLeft, setTimeLeft] = useState(() => {
     if (timeLimit) return timeLimit;
     return questions.length * 60;
  }); 

  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [timeTaken, setTimeTaken] = useState(initialState?.timeTaken || 0);
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  
  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Mobile drawer state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Scratchpad State
  const [showScratchpad, setShowScratchpad] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
      synthRef.current = window.speechSynthesis;
      
      // Initialize Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'en-US';
          
          recognitionRef.current.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setShortAnswerInput(transcript);
              handleOptionSelect(transcript);
              setIsListening(false);
          };
          
          recognitionRef.current.onerror = () => setIsListening(false);
          recognitionRef.current.onend = () => setIsListening(false);
      }

      return () => {
          if (synthRef.current) {
              synthRef.current.cancel();
          }
      }
  }, []);

  // Save progress to local storage
  useEffect(() => {
    const progressData = {
      examId,
      questions,
      userAnswers,
      timeTaken,
      currentQuestionIndex,
      markedQuestions,
      timestamp: Date.now()
    };
    localStorage.setItem(`examo_progress_${examId}`, JSON.stringify(progressData));
  }, [userAnswers, timeTaken, currentQuestionIndex, markedQuestions, examId, questions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
      setTimeTaken(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update logic when changing question
  useEffect(() => {
      setHint(null);
      if (synthRef.current) synthRef.current.cancel();
      setIsSpeaking(false);
      setShowScratchpad(false); // Close scratchpad on new question

      const currentQ = questions[currentQuestionIndex];
      if (currentQ) {
        if (currentQ.type === 'short') {
            setShortAnswerInput(userAnswers[currentQ.id] || '');
        }
        if (!visitedQuestions.includes(currentQ.id)) {
            setVisitedQuestions(prev => [...prev, currentQ.id]);
        }
      }
  }, [currentQuestionIndex]);

  // Scratchpad Logic
  useEffect(() => {
      if (showScratchpad && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const context = canvas.getContext('2d');
          if (context) {
              context.lineWidth = 3;
              context.lineCap = 'round';
              context.strokeStyle = 'black';
              setCtx(context);
          }
      }
  }, [showScratchpad]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (!ctx) return;
      setIsDrawing(true);
      ctx.beginPath();
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      ctx.moveTo(clientX, clientY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !ctx) return;
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
  };

  const stopDrawing = () => {
      setIsDrawing(false);
      ctx?.closePath();
  };

  const clearCanvas = () => {
      if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };


  const handleFinish = () => {
    localStorage.removeItem(`examo_progress_${examId}`);
    if (synthRef.current) synthRef.current.cancel();
    onFinish(userAnswers, timeTaken);
  };

  const handleOptionSelect = (option: string) => {
      setUserAnswers(prev => ({
          ...prev,
          [questions[currentQuestionIndex].id]: option
      }));
  };

  const handleShortAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setShortAnswerInput(val);
    handleOptionSelect(val);
  };

  const toggleListening = () => {
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      } else {
          setShortAnswerInput(''); // Clear previous
          recognitionRef.current?.start();
          setIsListening(true);
      }
  };

  const handleSpeak = () => {
      if (!synthRef.current) return;

      if (isSpeaking) {
          synthRef.current.cancel();
          setIsSpeaking(false);
          return;
      }

      const q = questions[currentQuestionIndex];
      let textToRead = "";
      if (q.context) {
          textToRead += `Story: ${q.context}. `;
      }
      textToRead += `Question: ${q.text}. ${q.type !== 'short' ? 'Options are: ' + q.options.join(', ') : ''}`;
      
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsSpeaking(false);
      
      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
      setIsSpeaking(true);
  };

  const fetchHint = async () => {
      if (hint) return;
      setLoadingHint(true);
      const currentQ = questions[currentQuestionIndex];
      const h = await getAiHint(currentQ.text, currentQ.options);
      setHint(h);
      setLoadingHint(false);
  }

  // --- Navigation & Action Handlers ---

  const handleSaveAndNext = () => {
      const currentQ = questions[currentQuestionIndex];
      if (markedQuestions.includes(currentQ.id)) {
          setMarkedQuestions(prev => prev.filter(id => id !== currentQ.id));
      }
      
      if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
      }
  };

  const handleMarkAndNext = () => {
      const currentQ = questions[currentQuestionIndex];
      if (!markedQuestions.includes(currentQ.id)) {
          setMarkedQuestions(prev => [...prev, currentQ.id]);
      }
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
  };

  const handleClearResponse = () => {
      const currentQ = questions[currentQuestionIndex];
      setUserAnswers(prev => {
          const newState = {...prev};
          delete newState[currentQ.id];
          return newState;
      });
      setShortAnswerInput('');
  };

  const jumpToQuestion = (index: number) => {
      setCurrentQuestionIndex(index);
      setIsPaletteOpen(false); // Close drawer on mobile selection
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatusColor = (questionId: string, index: number) => {
      const isAnswered = userAnswers[questionId];
      const isMarked = markedQuestions.includes(questionId);
      const isVisited = visitedQuestions.includes(questionId);
      
      if (isMarked && isAnswered) return 'bg-purple-600 text-white relative after:content-[""] after:absolute after:top-0 after:right-0 after:w-2 after:h-2 after:bg-green-400 after:rounded-full';
      if (isMarked) return 'bg-purple-600 text-white';
      if (isAnswered) return 'bg-green-500 text-white';
      if (isVisited && !isAnswered) return 'bg-red-500 text-white'; // Visited but not answered
      return 'bg-gray-200 text-gray-700'; // Not visited
  };

  const currentQuestion = questions[currentQuestionIndex];

  // Render Input Logic
  const renderInput = () => {
      if (currentQuestion.type === 'short') {
          return (
              <div className="mt-6 relative">
                  <input 
                    type="text" 
                    value={shortAnswerInput}
                    onChange={handleShortAnswerChange}
                    placeholder="Type answer or click mic..."
                    className="w-full text-lg p-4 pr-12 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                  {recognitionRef.current && (
                    <button 
                        onClick={toggleListening}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                    >
                        <Mic size={20} />
                    </button>
                  )}
              </div>
          );
      }
      return (
        <div className={`mt-6 space-y-3 ${currentQuestion.type === 'tf' ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = userAnswers[currentQuestion.id] === option;
            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 relative overflow-hidden
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                  ${currentQuestion.type === 'tf' ? 'justify-center text-center h-24 flex-col' : ''}
                `}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span className={`text-base font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden relative">
      
      {/* Scratchpad Overlay */}
      {showScratchpad && (
          <div className="fixed inset-0 z-50 bg-white/20 touch-none">
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair"
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white shadow-xl border p-2 rounded-full flex items-center gap-4 px-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <PenTool size={16} /> Drawing Mode
                  </div>
                  <button onClick={clearCanvas} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Clear All">
                      <Trash size={18} />
                  </button>
                  <button onClick={() => setShowScratchpad(false)} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full">
                      <X size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* LEFT PANEL: Question Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header inside Left Panel */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
             <div className="flex items-center gap-3">
                 <h1 className="font-bold text-lg text-gray-800 truncate max-w-[150px] md:max-w-xs">{topic}</h1>
                 <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold uppercase hidden md:inline-block">Grade 3</span>
             </div>
             
             <div className="flex items-center gap-2 md:gap-4">
                 <button 
                    onClick={() => setShowScratchpad(true)}
                    className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg flex items-center gap-1 text-xs font-bold border border-purple-200"
                 >
                     <PenTool size={16} /> <span className="hidden md:inline">Scratchpad</span>
                 </button>
                 <div className="flex items-center gap-2 font-mono bg-gray-900 text-white px-3 py-1 rounded-md">
                    <Clock size={16} className={timeLeft < 60 ? "text-red-400 animate-pulse" : "text-green-400"} />
                    <span className="font-bold tracking-widest">{formatTime(timeLeft)}</span>
                 </div>
                 {/* Mobile Palette Toggle */}
                 <button className="md:hidden p-2 bg-gray-100 rounded-md" onClick={() => setIsPaletteOpen(true)}>
                     <Menu size={20} />
                 </button>
             </div>
        </div>

        {/* Question Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Image Block (Conditional) */}
                {currentQuestion.image && (
                     <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white">
                         <img 
                            src={`data:image/jpeg;base64,${currentQuestion.image}`} 
                            alt="Question Reference" 
                            className="w-full h-auto max-h-[400px] object-contain mx-auto"
                         />
                     </div>
                )}

                {/* Context / Story Block (Conditional) */}
                {currentQuestion.context && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm relative">
                        <div className="flex items-center gap-2 text-amber-800 font-bold mb-3 uppercase text-xs tracking-wider">
                            <BookOpen size={16} /> Reading Passage
                        </div>
                        <p className="text-gray-800 leading-relaxed font-serif text-lg whitespace-pre-line">
                            {currentQuestion.context}
                        </p>
                    </div>
                )}

                {/* Main Question Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                         <div>
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {currentQuestionIndex + 1}</span>
                             <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-1 leading-snug">{currentQuestion.text}</h2>
                         </div>
                         <button 
                            onClick={handleSpeak}
                            className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                            {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
                         </button>
                    </div>

                    {renderInput()}

                     {/* Hint */}
                     <div className="mt-6">
                        {!hint ? (
                            <button onClick={fetchHint} className="text-sm text-purple-600 font-bold flex items-center gap-1 hover:underline">
                                <Lightbulb size={16} /> Need a Hint?
                            </button>
                        ) : (
                            <div className="bg-purple-50 p-3 rounded-lg text-purple-800 text-sm border border-purple-100 animate-fade-in">
                                <strong>Hint:</strong> {hint}
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 flex items-center justify-between z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex items-center gap-2">
                 <button 
                    onClick={handleClearResponse}
                    className="px-4 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-100 text-sm border border-transparent hover:border-gray-300 transition-all"
                 >
                    <span className="hidden md:inline">Clear Response</span>
                    <span className="md:hidden"><RotateCcw size={18} /></span>
                 </button>
                 <button 
                    onClick={handleMarkAndNext}
                    className="px-4 py-2 rounded-lg text-purple-600 font-bold hover:bg-purple-50 text-sm border border-purple-200 hover:border-purple-300 transition-all flex items-center gap-2"
                 >
                    <Flag size={16} />
                    <span className="hidden md:inline">Mark for Review & Next</span>
                    <span className="md:hidden">Review</span>
                 </button>
             </div>
             
             <button
                onClick={handleSaveAndNext}
                disabled={currentQuestionIndex === questions.length - 1 && !userAnswers[currentQuestion.id]}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center gap-2"
             >
                {currentQuestionIndex === questions.length - 1 ? "Submit" : "Save & Next"}
                <ChevronRight size={18} />
             </button>
        </div>
      </div>

      {/* RIGHT PANEL: Question Palette (Sidebar / Drawer) */}
      <div className={`
        fixed inset-y-0 right-0 w-72 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40 flex flex-col
        md:relative md:transform-none md:flex
        ${isPaletteOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}
      `}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                      ST
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-gray-800">Student</h4>
                      <p className="text-xs text-gray-400">Class 3-A</p>
                  </div>
              </div>
              <button className="md:hidden text-gray-400" onClick={() => setIsPaletteOpen(false)}>
                  <X size={24} />
              </button>
          </div>

          <div className="p-4 bg-white border-b border-gray-100">
              <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">Legend</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-sm"></div> Answered
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-sm"></div> Not Answered
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-sm"></div> Marked
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-sm"></div> Not Visited
                  </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
               <h4 className="font-bold text-sm text-gray-800 mb-3">Questions Palette</h4>
               <div className="grid grid-cols-5 gap-2">
                   {questions.map((q, idx) => (
                       <button
                          key={q.id}
                          onClick={() => jumpToQuestion(idx)}
                          className={`
                              h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all border-2
                              ${getQuestionStatusColor(q.id, idx)}
                              ${currentQuestionIndex === idx ? 'ring-2 ring-blue-400 ring-offset-2 border-blue-600 scale-110 z-10' : 'border-transparent'}
                          `}
                       >
                           {idx + 1}
                       </button>
                   ))}
               </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={handleFinish}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
              >
                  Submit Final Exam
              </button>
          </div>
      </div>
      
      {/* Mobile Overlay Backdrop */}
      {isPaletteOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsPaletteOpen(false)}></div>
      )}

    </div>
  );
};

export default ExamSession;