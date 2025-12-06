
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Sparkles, Copy, Check, BookOpen, Trash2, Pencil, X, Save, Plus, Minus, ArrowRight, Settings, Clock, Layers, Eye, CheckCircle2, Image as ImageIcon, Share2, Printer, KeyRound } from 'lucide-react';
import { ExamData, Question, PdfTopic } from '../types';
import { analyzePdfContent } from '../services/geminiService';
import { jsPDF } from "jspdf";

interface TeacherDashboardProps {
  activeExams: Record<string, ExamData>;
  onCreateExam: (type: 'pdf' | 'topic' | 'image', data: File | string, topicPlan?: PdfTopic[]) => Promise<void>;
  onDeleteExam: (id: string) => void;
  onUpdateExam: (id: string, updatedExam: ExamData) => void;
  onPreviewExam: (exam: ExamData) => void;
  loading: boolean;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeExams, onCreateExam, onDeleteExam, onUpdateExam, onPreviewExam, loading }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [topic, setTopic] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // PDF Wizard State
  const [pdfStep, setPdfStep] = useState<'upload' | 'analyzing' | 'configure'>('upload');
  const [analyzedTopics, setAnalyzedTopics] = useState<PdfTopic[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  // Edit State
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<Question[]>([]);
  
  // Settings State
  const [settingsExamId, setSettingsExamId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  
  // Image Upload State
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (pdfStep === 'analyzing') {
        setProgressWidth(0);
        interval = setInterval(() => {
            setProgressWidth(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 10;
            });
        }, 500);
    }
    return () => clearInterval(interval);
  }, [pdfStep]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPdfStep('analyzing');
      
      const reader = new FileReader();
      reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
             const topics = await analyzePdfContent(base64);
             setAnalyzedTopics(topics);
             setPdfStep('configure');
          } catch (err) {
              console.error(err);
              setPdfStep('upload'); // Reset on fail
              alert("Failed to analyze PDF");
          }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          onCreateExam('image', file);
      }
  };

  const updateTopicCount = (index: number, delta: number) => {
      setAnalyzedTopics(prev => {
          const next = [...prev];
          next[index].questionCount = Math.max(0, next[index].questionCount + delta);
          return next;
      });
  };

  const handlePdfSubmit = () => {
      if (selectedFile) {
          onCreateExam('pdf', selectedFile, analyzedTopics);
          setPdfStep('upload');
          setSelectedFile(null);
          setAnalyzedTopics([]);
      }
  };

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onCreateExam('topic', topic);
      setTopic('');
    }
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handleShare = async (exam: ExamData) => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Join my ${exam.topic} Exam!`,
                  text: `Use code ${exam.id} to join the exam on Examo Kids.`,
                  url: window.location.href
              });
          } catch (error) {
              console.log('Error sharing', error);
          }
      } else {
          copyToClipboard(exam.id);
          alert("Code copied to clipboard! (Sharing not supported on this device)");
      }
  };

  const handlePrint = (exam: ExamData, withAnswers: boolean = false) => {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text(withAnswers ? "Teacher Answer Key" : "Class Exam", 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Topic: ${exam.topic}`, 20, 35);
      doc.text(`Duration: ${exam.timeLimit ? Math.round(exam.timeLimit / 60) : 30} mins`, 150, 35);
      if (!withAnswers) {
          doc.text(`Student Name: _______________________`, 20, 45);
      } else {
          doc.setTextColor(220, 38, 38);
          doc.text(`SECRET KEY - DO NOT DISTRIBUTE`, 20, 45);
          doc.setTextColor(0, 0, 0);
      }
      
      doc.line(20, 50, 190, 50);
      
      let y = 60;
      
      exam.questions.forEach((q, i) => {
          if (y > 250) {
              doc.addPage();
              y = 20;
          }
          
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          const questionText = doc.splitTextToSize(`${i + 1}. ${q.text}`, 170);
          doc.text(questionText, 20, y);
          y += questionText.length * 6;
          
          doc.setFont("helvetica", "normal");
          if (q.type === 'mcq') {
              q.options.forEach((opt, idx) => {
                  const isCorrect = opt === q.correctAnswer;
                  if (withAnswers && isCorrect) doc.setFont("helvetica", "bold");
                  doc.text(`[   ] ${String.fromCharCode(65 + idx)}) ${opt} ${withAnswers && isCorrect ? '(CORRECT)' : ''}`, 25, y);
                  if (withAnswers && isCorrect) doc.setFont("helvetica", "normal");
                  y += 6;
              });
          } else if (q.type === 'tf') {
              const isTrue = q.correctAnswer === "True";
              doc.text(`[   ] True ${withAnswers && isTrue ? ' (CORRECT)' : ''}`, 25, y);
              y += 6;
              doc.text(`[   ] False ${withAnswers && !isTrue ? ' (CORRECT)' : ''}`, 25, y);
              y += 6;
          } else {
              if (withAnswers) {
                  doc.text(`Answer: ${q.correctAnswer}`, 25, y);
              } else {
                  doc.text("Answer: __________________________________________________", 25, y);
              }
              y += 10;
          }
          y += 6;
      });
      
      doc.save(withAnswers ? `Answer_Key_${exam.id}.pdf` : `Exam_Paper_${exam.id}.pdf`);
  };

  // Edit Handlers
  const startEditing = (exam: ExamData) => {
      setEditingExamId(exam.id);
      setEditedQuestions(JSON.parse(JSON.stringify(exam.questions)));
  };
  
  const handleSaveEdit = () => {
      if (editingExamId && activeExams[editingExamId]) {
          const updatedExam = { ...activeExams[editingExamId], questions: editedQuestions };
          onUpdateExam(editingExamId, updatedExam);
          setEditingExamId(null);
      }
  };
  
  const updateQuestionText = (index: number, text: string) => {
      const newQuestions = [...editedQuestions];
      newQuestions[index].text = text;
      setEditedQuestions(newQuestions);
  };

  const updateQuestionContext = (index: number, context: string) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index].context = context;
    setEditedQuestions(newQuestions);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
      const newQuestions = [...editedQuestions];
      const wasCorrect = newQuestions[qIndex].options[optIndex] === newQuestions[qIndex].correctAnswer;
      newQuestions[qIndex].options[optIndex] = text;
      if (wasCorrect) newQuestions[qIndex].correctAnswer = text;
      setEditedQuestions(newQuestions);
  };

  const updateQuestionAnswer = (index: number, answer: string) => {
      const newQuestions = [...editedQuestions];
      newQuestions[index].correctAnswer = answer;
      setEditedQuestions(newQuestions);
  };

  // Settings Handlers (Auto-Save)
  const openSettings = (exam: ExamData) => {
    setSettingsExamId(exam.id);
    setSaveStatus(null);
  };

  const updateSetting = (key: keyof ExamData, value: any) => {
      if (!settingsExamId) return;
      setSaveStatus('saving');
      const currentExam = activeExams[settingsExamId];
      const updatedExam = { ...currentExam, [key]: value };
      onUpdateExam(settingsExamId, updatedExam);
      setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
      }, 500);
  };

  const examsList = (Object.values(activeExams) as ExamData[]).sort((a, b) => b.createdAt - a.createdAt);
  const getTotalRequestedQuestions = () => analyzedTopics.reduce((acc, t) => acc + t.questionCount, 0);

  return (
    <div className="pb-20">
      {/* Settings Modal - Auto Save */}
      {settingsExamId && activeExams[settingsExamId] && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in relative">
                 <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                     <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Settings size={20} className="text-gray-500" /> Configure: {activeExams[settingsExamId].topic}
                     </h3>
                     <button onClick={() => setSettingsExamId(null)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                 </div>
                 
                 <div className="h-1 w-full bg-gray-100">
                     {saveStatus === 'saving' && <div className="h-full bg-blue-500 animate-pulse w-full"></div>}
                     {saveStatus === 'saved' && <div className="h-full bg-green-500 w-full transition-all"></div>}
                 </div>

                 <div className="p-6 space-y-6">
                     <div>
                         <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Difficulty Level</label>
                            {saveStatus === 'saved' && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
                         </div>
                         <select 
                            value={activeExams[settingsExamId].difficulty}
                            onChange={(e) => updateSetting('difficulty', e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                         >
                             <option value="Easy">Easy</option>
                             <option value="Medium">Medium</option>
                             <option value="Hard">Hard</option>
                             <option value="Genius">Genius</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Time Limit (Minutes)</label>
                         <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                min="1"
                                max="180"
                                value={activeExams[settingsExamId].timeLimit ? Math.round(activeExams[settingsExamId].timeLimit! / 60) : 0}
                                onChange={(e) => {
                                    const mins = parseInt(e.target.value) || 1;
                                    updateSetting('timeLimit', mins * 60);
                                }}
                                className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500 text-sm font-medium">mins</span>
                         </div>
                     </div>
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                         <p className="font-bold mb-1">Question Pool</p>
                         <p>{activeExams[settingsExamId].questions.length} Questions active</p>
                     </div>
                 </div>
                 <div className="p-4 border-t bg-gray-50 flex justify-end">
                     <button onClick={() => setSettingsExamId(null)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold transition-colors">
                         Done
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* Content Edit Modal */}
      {editingExamId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-800">Edit Exam Content</h3>
                    <button onClick={() => setEditingExamId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                    {editedQuestions.map((q, i) => (
                        <div key={q.id} className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between mb-3 border-b border-gray-100 pb-2">
                                <span className="font-bold text-sm text-blue-600">Question {i+1}</span>
                                <span className="text-xs font-bold uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                    {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'tf' ? 'True/False' : 'Short Answer'}
                                </span>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                    <BookOpen size={12}/> Story / Passage (Optional)
                                </label>
                                <textarea 
                                    value={q.context || ''}
                                    onChange={(e) => updateQuestionContext(i, e.target.value)}
                                    className="w-full text-sm p-3 border border-amber-200 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-200 outline-none resize-none placeholder:text-amber-300"
                                    rows={3}
                                    placeholder="Paste reading passage or story here if required..."
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Question Text</label>
                                <textarea 
                                    value={q.text}
                                    onChange={(e) => updateQuestionText(i, e.target.value)}
                                    className="w-full text-base p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                                    {q.type === 'mcq' ? 'Options' : 'Answer Key'}
                                </label>
                                {q.type === 'mcq' ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-2">
                                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-xs font-bold rounded-full text-gray-500">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                <input 
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => updateOptionText(i, optIdx, e.target.value)}
                                                    className={`flex-1 p-2 border rounded-md text-sm outline-none focus:border-blue-500 ${q.correctAnswer === opt ? 'border-green-400 bg-green-50' : ''}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : q.type === 'tf' ? (
                                    <div className="flex gap-4 p-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-500 italic">True / False options are fixed. Select correct answer below.</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-4 p-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-500 italic">Short answers require exact text match.</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correct Answer</label>
                                {q.type === 'short' ? (
                                     <input 
                                        type="text"
                                        value={q.correctAnswer}
                                        onChange={(e) => updateQuestionAnswer(i, e.target.value)}
                                        className="w-full p-2 border-2 border-green-100 rounded-lg focus:border-green-400 outline-none text-green-800 font-medium"
                                        placeholder="Enter expected answer"
                                     />
                                ) : (
                                    <select 
                                        value={q.correctAnswer}
                                        onChange={(e) => updateQuestionAnswer(i, e.target.value)}
                                        className="w-full p-2 border-2 border-green-100 rounded-lg focus:border-green-400 outline-none text-green-800 font-medium bg-white"
                                    >
                                        <option value="" disabled>Select correct answer</option>
                                        {q.options.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <button onClick={() => setEditingExamId(null)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200">
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="bg-purple-700 text-white px-6 pb-8 pt-4 rounded-b-3xl shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-1">Teacher's Desk 🍎</h2>
        <p className="text-purple-200 text-sm">Create and manage your class quizzes.</p>
        
        <div className="flex gap-2 mt-6 bg-purple-800/50 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'create' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-200 hover:text-white'}`}
            >
                Create Exam
            </button>
            <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-200 hover:text-white'}`}
            >
                My Exams
                {examsList.length > 0 && <span className="ml-2 bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">{examsList.length}</span>}
            </button>
        </div>
      </div>

      <div className="px-5">
        {activeTab === 'create' ? (
            <div className="space-y-6 animate-fade-in">
                 
                 {/* Image Upload Card */}
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Visual Quiz</h3>
                            <p className="text-xs text-gray-500">Create questions from an image</p>
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={imageInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageChange}
                    />
                    <button 
                        onClick={() => imageInputRef.current?.click()}
                        disabled={loading}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                        <ImageIcon size={18} />
                        Select Image
                    </button>
                </div>


                 {/* PDF Upload Wizard */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-500">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Upload PDF</h3>
                            <p className="text-xs text-gray-500">Generate from document chapters</p>
                        </div>
                    </div>

                    {pdfStep === 'upload' && (
                        <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="application/pdf" 
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={18} />
                                Select PDF File
                            </button>
                        </>
                    )}

                    {pdfStep === 'analyzing' && (
                        <div className="text-center py-6">
                             <Sparkles className="animate-spin text-pink-500 mx-auto mb-2" size={24} />
                             <p className="text-sm font-bold text-gray-700 mb-4">Scanning for Chapters...</p>
                             <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-pink-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                    style={{ width: `${progressWidth}%` }}
                                ></div>
                             </div>
                        </div>
                    )}

                    {pdfStep === 'configure' && (
                        <div className="animate-fade-in">
                            <div className="mb-4 bg-pink-50 p-3 rounded-lg border border-pink-100">
                                <p className="text-xs text-pink-800 font-medium">Found {analyzedTopics.length} topics. How many questions for each?</p>
                            </div>
                            <div className="max-h-60 overflow-y-auto pr-1 space-y-2 mb-4 custom-scrollbar">
                                {analyzedTopics.map((t, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg bg-gray-50">
                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{t.name}</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateTopicCount(idx, -1)} className="p-1 rounded bg-white border hover:bg-gray-100"><Minus size={14}/></button>
                                            <span className="w-6 text-center font-bold text-gray-800">{t.questionCount}</span>
                                            <button onClick={() => updateTopicCount(idx, 1)} className="p-1 rounded bg-white border hover:bg-gray-100"><Plus size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={handlePdfSubmit}
                                disabled={getTotalRequestedQuestions() === 0 || loading}
                                className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Generating..." : `Generate ${getTotalRequestedQuestions()} Questions`}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-gray-400 text-xs font-bold uppercase">Or</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* Topic Input */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Quick Topic</h3>
                            <p className="text-xs text-gray-500">Instant 20 questions from topic name</p>
                        </div>
                    </div>
                    <form onSubmit={handleTopicSubmit}>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Solar System..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        />
                        <button 
                            type="submit"
                            disabled={!topic.trim() || loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            {loading ? "Generating..." : "Generate 20 Questions"}
                        </button>
                    </form>
                </div>
            </div>
        ) : (
            <div className="space-y-4 animate-fade-in pb-10">
                {examsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <BookOpen size={24} />
                        </div>
                        <p>No exams created yet.</p>
                        <button onClick={() => setActiveTab('create')} className="text-purple-600 font-bold text-sm mt-2">Create one now</button>
                    </div>
                ) : (
                    examsList.map((exam, index) => {
                        const gradients = [
                            'from-blue-50 to-indigo-50 border-blue-100',
                            'from-emerald-50 to-teal-50 border-emerald-100',
                            'from-rose-50 to-pink-50 border-rose-100',
                            'from-amber-50 to-orange-50 border-amber-100'
                        ];
                        const cardStyle = gradients[index % gradients.length];
                        const iconColors = [
                            'bg-blue-200 text-blue-700',
                            'bg-emerald-200 text-emerald-700',
                            'bg-rose-200 text-rose-700',
                            'bg-amber-200 text-amber-700'
                        ]
                        const iconColor = iconColors[index % iconColors.length];

                        return (
                            <div key={exam.id} className={`bg-gradient-to-br ${cardStyle} p-0 rounded-2xl border shadow-sm relative overflow-hidden group transition-all hover:shadow-md`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Layers size={80} className="rotate-12" />
                                </div>
                                
                                <div className="p-5 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${iconColor}`}>
                                                <BookOpen size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg leading-tight line-clamp-1">{exam.topic}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                    <span>{exam.questions.length} Qs</span>
                                                    <span>•</span>
                                                    <span>{exam.difficulty}</span>
                                                    <span>•</span>
                                                    <span>{exam.timeLimit ? Math.round(exam.timeLimit / 60) : exam.questions.length} mins</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleShare(exam)}
                                                className="p-2 bg-white/80 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-blue-600 transition-colors shadow-sm"
                                                title="Share Code"
                                            >
                                                <Share2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handlePrint(exam, false)}
                                                className="p-2 bg-white/80 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-600 transition-colors shadow-sm"
                                                title="Download Exam Paper PDF"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handlePrint(exam, true)}
                                                className="p-2 bg-white/80 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-red-500 transition-colors shadow-sm"
                                                title="Download Answer Key"
                                            >
                                                <KeyRound size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-3">
                                         <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg border border-gray-100">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">Code:</span>
                                            <button 
                                                onClick={() => copyToClipboard(exam.id)}
                                                className="flex items-center gap-1 group/code cursor-pointer"
                                            >
                                                <span className="text-base font-mono font-bold text-gray-800">{exam.id}</span>
                                                {copiedId === exam.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-gray-400 group-hover/code:text-blue-500" />}
                                            </button>
                                         </div>
                                    </div>

                                    <div className="flex gap-2 mt-2">
                                         <button 
                                            onClick={() => onPreviewExam(exam)}
                                            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                            title="Preview Exam"
                                         >
                                             <Eye size={18} />
                                         </button>
                                         <button 
                                            onClick={() => openSettings(exam)}
                                            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                            title="Settings"
                                         >
                                             <Settings size={18} />
                                         </button>
                                         <button 
                                            onClick={() => startEditing(exam)}
                                            className="flex-1 py-2 bg-white rounded-lg border border-gray-200 text-gray-600 font-bold text-sm hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                                         >
                                             <Pencil size={16} /> Edit Content
                                         </button>
                                         <button 
                                            onClick={() => onDeleteExam(exam.id)}
                                            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                                            title="Delete"
                                         >
                                             <Trash2 size={18} />
                                         </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
