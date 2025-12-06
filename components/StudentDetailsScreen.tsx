import React, { useState } from 'react';
import { User, School, Play, ArrowRight } from 'lucide-react';

interface StudentDetailsScreenProps {
  topic: string;
  onStart: (name: string, className: string) => void;
  onCancel: () => void;
}

const StudentDetailsScreen: React.FC<StudentDetailsScreenProps> = ({ topic, onStart, onCancel }) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && className.trim()) {
      onStart(name, className);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 animate-fade-in bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border-2 border-blue-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <User size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Who is taking the test?</h2>
          <p className="text-gray-500 text-sm mt-1">Topic: <span className="font-bold text-blue-600">{topic}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Student Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Class / Grade</label>
            <div className="relative">
              <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="e.g. 3-B"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || !className.trim()}
              className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              Start Exam <ArrowRight size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentDetailsScreen;
