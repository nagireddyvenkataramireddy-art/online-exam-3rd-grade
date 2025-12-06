
import React, { useEffect, useState } from 'react';
import { Question } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Award, Share2, RefreshCw, Home, AlertCircle, User, School, Lightbulb, Download, ChevronDown, ChevronUp, Sparkles, MessageCircle } from 'lucide-react';
import { jsPDF } from "jspdf";
import confetti from "canvas-confetti";
import { getPersonalizedExplanation } from '../services/geminiService';

interface ResultsViewProps {
  questions: Question[];
  userAnswers: Record<string, string>;
  timeTaken: number;
  studentName?: string;
  studentClass?: string;
  onHome: () => void;
  onRetry: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ questions, userAnswers, timeTaken, studentName, studentClass, onHome, onRetry }) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  let score = 0;
  const incorrectQuestions: Question[] = [];

  questions.forEach(q => {
    const userAnswer = userAnswers[q.id]?.toString().trim().toLowerCase() || "";
    const correctAnswer = q.correctAnswer.toString().trim().toLowerCase();

    if (userAnswer === correctAnswer) {
      score++;
    } else {
      incorrectQuestions.push(q);
    }
  });

  const percentage = Math.round((score / questions.length) * 100);
  
  const data = [
    { name: 'Correct', value: score, color: '#22c55e' },
    { name: 'Incorrect', value: questions.length - score, color: '#ef4444' },
  ];

  useEffect(() => {
    if (percentage >= 60) {
        // Trigger Confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }
  }, [percentage]);

  const toggleExplanation = (id: string) => {
      setExpandedExplanations(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleAskAi = async (q: Question) => {
      if (aiExplanations[q.id]) return; // Already loaded
      setLoadingAi(q.id);
      const userAnswer = userAnswers[q.id] || "Skipped";
      const explanation = await getPersonalizedExplanation(q.text, userAnswer, q.correctAnswer);
      setAiExplanations(prev => ({...prev, [q.id]: explanation}));
      setLoadingAi(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownloadPdf = () => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Blue
      doc.text("Examo Report Card", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Student: ${studentName || "N/A"}`, 20, 40);
      doc.text(`Class: ${studentClass || "N/A"}`, 20, 48);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 40);
      doc.text(`Time Taken: ${formatTime(timeTaken)}`, 150, 48);

      // Score
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 55, 190, 55);
      
      doc.setFontSize(16);
      doc.text(`Final Score: ${percentage}%  (${score}/${questions.length})`, 105, 65, { align: "center" });
      
      doc.line(20, 75, 190, 75);

      // Details
      let y = 90;
      doc.setFontSize(14);
      doc.text("Detailed Analysis", 20, y);
      y += 10;

      questions.forEach((q, i) => {
          if (y > 270) {
              doc.addPage();
              y = 20;
          }

          doc.setFontSize(11);
          const questionText = doc.splitTextToSize(`${i + 1}. ${q.text}`, 170);
          doc.text(questionText, 20, y);
          y += questionText.length * 5;

          const userAnswer = userAnswers[q.id] || "Skipped";
          const isCorrect = userAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
          
          doc.setFontSize(10);
          doc.setTextColor(isCorrect ? 34 : 220, isCorrect ? 197 : 38, isCorrect ? 94 : 38); // Green or Red
          doc.text(`Your Answer: ${userAnswer}`, 25, y);
          
          if (!isCorrect) {
              y += 5;
              doc.setTextColor(34, 197, 94); // Green
              doc.text(`Correct Answer: ${q.correctAnswer}`, 25, y);
          }
          
          doc.setTextColor(0, 0, 0); // Reset
          y += 10;
      });

      doc.save("Examo_Report_Card.pdf");
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 pb-20">
      <div className="bg-white p-6 rounded-b-3xl shadow-sm mb-6 text-center">
         
         {(studentName || studentClass) && (
            <div className="mb-6 bg-blue-50 border border-blue-100 p-3 rounded-2xl inline-flex items-center gap-4 px-6">
                <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-500" />
                    <span className="font-bold text-gray-800">{studentName || "Student"}</span>
                </div>
                {studentClass && (
                    <>
                        <div className="w-px h-4 bg-blue-200"></div>
                        <div className="flex items-center gap-2">
                            <School size={16} className="text-blue-500" />
                            <span className="font-bold text-gray-800">{studentClass}</span>
                        </div>
                    </>
                )}
            </div>
         )}

         <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-100 relative">
             {percentage >= 70 ? (
                 <Award size={40} className="text-blue-600 animate-bounce" />
             ) : (
                 <AlertCircle size={40} className="text-orange-500" />
             )}
         </div>
         <h2 className="text-2xl font-bold text-gray-900 mb-1">
             {percentage >= 70 ? "Great Job!" : "Keep Practicing!"}
         </h2>
         <p className="text-gray-500 text-sm mb-6">You successfully completed the exam.</p>

         <div className="flex justify-center gap-8 mb-4">
             <div className="text-center">
                 <p className="text-3xl font-bold text-gray-800">{percentage}%</p>
                 <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Score</p>
             </div>
             <div className="w-px bg-gray-100 h-12"></div>
             <div className="text-center">
                 <p className="text-3xl font-bold text-gray-800">{score}/{questions.length}</p>
                 <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Correct</p>
             </div>
             <div className="w-px bg-gray-100 h-12"></div>
             <div className="text-center">
                 <p className="text-3xl font-bold text-gray-800">{formatTime(timeTaken)}</p>
                 <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Time</p>
             </div>
         </div>
      </div>

      <div className="px-5 space-y-6">
        {/* Performance Chart */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Analysis</h3>
            <div className="h-40 flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-400">Accuracy</span>
                    <span className="font-bold text-gray-800">{percentage}%</span>
                </div>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Correct</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Incorrect</span>
                </div>
            </div>
        </div>

        {/* Incorrect Questions Review */}
        {incorrectQuestions.length > 0 && (
            <div className="space-y-4">
                <h3 className="font-bold text-gray-800 ml-1">Review Mistakes ({incorrectQuestions.length})</h3>
                {incorrectQuestions.map((q, i) => {
                    const isExpanded = expandedExplanations.has(q.id);
                    const aiExplanation = aiExplanations[q.id];

                    return (
                        <div key={q.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                            <div className="flex items-start justify-between mb-3 gap-3">
                                <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 bg-red-100 text-red-600 rounded-full p-1 shrink-0">
                                        <XCircle size={14} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-snug">
                                            {q.text}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold shrink-0">
                                    {q.type === 'mcq' ? 'Choice' : q.type === 'tf' ? 'T/F' : 'Short'}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm ml-9">
                                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
                                    <XCircle size={16} className="shrink-0 mt-0.5" />
                                    <span><span className="font-bold">Your Answer:</span> {userAnswers[q.id] || "Skipped"}</span>
                                </div>
                                <div className="flex items-start gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
                                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                                    <span><span className="font-bold">Correct:</span> {q.correctAnswer}</span>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="ml-9 mt-3 flex items-center gap-2">
                                <button 
                                    onClick={() => toggleExplanation(q.id)}
                                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
                                >
                                    <Lightbulb size={14} />
                                    {isExpanded ? "Hide Explanation" : "Show Explanation"}
                                    {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                
                                <div className="w-px h-4 bg-gray-200"></div>

                                <button 
                                    onClick={() => handleAskAi(q)}
                                    disabled={loadingAi === q.id || !!aiExplanation}
                                    className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:bg-purple-50 px-2 py-1.5 rounded transition-colors"
                                >
                                    {loadingAi === q.id ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    Ask AI Teacher
                                </button>
                            </div>

                            {/* Standard Explanation */}
                            {isExpanded && (
                                <div className="mt-3 ml-9 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-fade-in">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Standard Explanation</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                                </div>
                            )}

                            {/* AI Tutor Explanation */}
                            {aiExplanation && (
                                <div className="mt-3 ml-9 bg-purple-50 p-3 rounded-lg border border-purple-100 animate-fade-in">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">🤖</span>
                                        <p className="text-xs font-bold text-purple-700 uppercase">AI Teacher Says:</p>
                                    </div>
                                    <p className="text-sm text-purple-900 leading-relaxed font-medium">{aiExplanation}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white p-2 rounded-full shadow-2xl border border-gray-100 z-50">
        <button onClick={onHome} className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors flex flex-col items-center w-14 h-14 justify-center">
            <Home size={20} />
            <span className="text-[10px] font-bold mt-0.5">Home</span>
        </button>
        <button onClick={handleDownloadPdf} className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-300 transition-transform hover:-translate-y-1" title="Download Report">
            <Download size={24} />
        </button>
        <button onClick={onRetry} className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors flex flex-col items-center w-14 h-14 justify-center">
            <RefreshCw size={20} />
            <span className="text-[10px] font-bold mt-0.5">Retry</span>
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
