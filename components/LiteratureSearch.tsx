import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen } from 'lucide-react';
import { searchMedicalLiterature } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

const LiteratureSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchMedicalLiterature(query);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
      <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
        <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <BookOpen size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Medical Literature Search</h2>
            <p className="text-sm text-gray-500">Powered by Gemini & Google Search</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medical literature (e.g., graft uptake rates meta-analysis)"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-sm hover:border-gray-400"
          />
        </div>
        <button 
          disabled={loading}
          type="submit" 
          className="bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl active:scale-95"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results && (
        <div className="space-y-8 animate-fade-in">
          <div className="prose prose-slate max-w-none bg-gray-50 p-8 rounded-2xl border border-gray-200 shadow-sm">
            <ReactMarkdown>{results.text}</ReactMarkdown>
          </div>

          {results.groundingMetadata?.groundingChunks && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">References & Sources</h3>
              <div className="grid gap-3">
                {results.groundingMetadata.groundingChunks.map((chunk: any, i: number) => 
                  chunk.web?.uri ? (
                    <a 
                      key={i} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="text-blue-600 font-medium truncate group-hover:underline text-sm md:text-base">
                            {chunk.web.title || "Web Source"}
                        </span>
                        <span className="text-gray-400 text-xs truncate max-w-md">{chunk.web.uri}</span>
                      </div>
                      <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500" />
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiteratureSearch;