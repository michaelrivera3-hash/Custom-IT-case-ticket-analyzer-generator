import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  ChevronRight,
  History,
  Zap,
  ShieldCheck,
  EyeOff,
  Eye,
  Briefcase,
  BookOpen,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Ticket, 
  AnalysisReport, 
  analyzeIncident, 
  generateExecutiveSummary, 
  draftKBArticle,
  generateSyntheticTicket,
  SuggestedFix 
} from './services/geminiService';

const CLOSING_SIGNATURE = `
---
Resolution Code: CAS-RESOLVED
Department: Identity & Access Management
Contact: helpdesk@company.com
Ticket ID: [AUTO-GEN]
---`;

export default function App() {
  const [historicalTickets, setHistoricalTickets] = useState<Ticket[]>([]);
  const [currentIncident, setCurrentIncident] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New States
  const [shouldSanitize, setShouldSanitize] = useState(true);
  const [execSummary, setExecSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Synthetic Generator State
  const [syntheticInput, setSyntheticInput] = useState('');
  const [isGeneratingSynthetic, setIsGeneratingSynthetic] = useState(false);

  const sanitizeText = (text: string) => {
    if (!shouldSanitize) return text;
    // Simple regex for common PII
    return text
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_MASKED]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_MASKED]')
      .replace(/\b(password|pwd|secret|key)\s*[:=]\s*\S+/gi, '$1: [REDACTED]')
      .replace(/\b\d{16}\b/g, '[CARD_MASKED]');
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setHistoricalTickets(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            content: content,
            date: new Date().toLocaleDateString()
          }
        ]);
      };
      reader.readAsText(file);
    });
  }, []);

  const removeTicket = (id: string) => {
    setHistoricalTickets(prev => prev.filter(t => t.id !== id));
  };

  const handleAnalyze = async () => {
    if (!currentIncident.trim() || historicalTickets.length === 0) {
      setError("Please provide both historical tickets and a new incident description.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setExecSummary(null);
    try {
      const sanitizedIncident = sanitizeText(currentIncident);
      const result = await analyzeIncident(sanitizedIncident, historicalTickets);
      setReport(result);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!report) return;
    setIsGeneratingSummary(true);
    try {
      const technicalText = report.suggestions.map(s => `${s.title}: ${s.explanation}`).join('\n');
      const summary = await generateExecutiveSummary(technicalText);
      setExecSummary(summary);
    } catch (err) {
      console.error(err);
      setError("Failed to generate executive summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExportKB = async (suggestion: SuggestedFix) => {
    try {
      const markdown = await draftKBArticle(suggestion);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KB_Draft_${suggestion.title.replace(/\s+/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Failed to export KB article.");
    }
  };

  const handleCopyToCAS = (suggestion: SuggestedFix) => {
    const textToCopy = `Resolution: ${suggestion.title}\n\nSteps:\n${suggestion.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}\n\n${CLOSING_SIGNATURE.replace('[AUTO-GEN]', Math.floor(Math.random() * 1000000).toString())}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(suggestion.title);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateSynthetic = async () => {
    if (!syntheticInput.trim()) return;
    setIsGeneratingSynthetic(true);
    try {
      const newTicket = await generateSyntheticTicket(syntheticInput);
      setHistoricalTickets(prev => [newTicket, ...prev]);
      setSyntheticInput('');
    } catch (err) {
      console.error(err);
      setError("Failed to generate synthetic ticket.");
    } finally {
      setIsGeneratingSynthetic(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative text-cyan-50">
      <div className="data-stream-bg" />
      
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
            <ShieldCheck className="text-cyan-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white neon-text">NEURAL_CAS_INTEL</h1>
            <p className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-[0.2em]">Historical Pattern Recognition v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/5 rounded-full border border-cyan-500/20">
            <History className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-300/80">{historicalTickets.length} NODES_LOADED</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Sidebar: Knowledge Base */}
        <aside className="lg:col-span-3 border-r border-cyan-500/20 bg-black/20 backdrop-blur-sm overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                DATA_ARCHIVE
              </h2>
              <label className="cursor-pointer bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 p-1.5 rounded-md transition-all shadow-[0_0_10px_rgba(0,242,255,0.1)]">
                <Upload className="w-4 h-4" />
                <input type="file" multiple accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Synthetic Generator UI */}
            <div className="mb-8 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-3">
              <p className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-widest">Synthetic Case Gen</p>
              <textarea
                value={syntheticInput}
                onChange={(e) => setSyntheticInput(e.target.value)}
                placeholder="Brief fix description..."
                className="w-full h-20 p-2 bg-black/40 border border-cyan-500/20 rounded-lg text-xs font-mono text-cyan-100 outline-none focus:border-cyan-500/50 transition-all resize-none"
              />
              <button
                onClick={handleGenerateSynthetic}
                disabled={isGeneratingSynthetic || !syntheticInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isGeneratingSynthetic ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Expand_to_Ticket
              </button>
            </div>

            <div className="space-y-3">
              {historicalTickets.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-cyan-500/20 rounded-xl bg-cyan-500/5">
                  <p className="text-xs text-cyan-500/60 font-mono uppercase tracking-wider">Archive empty.<br/>Inject data streams.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {historicalTickets.map((ticket) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group bg-black/40 border border-cyan-500/10 rounded-lg p-3 hover:border-cyan-500/40 transition-all shadow-[0_0_10px_rgba(0,0,0,0.3)] relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/20 group-hover:bg-cyan-500 transition-colors" />
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pl-2">
                          <p className="text-sm font-mono text-cyan-100 truncate">{ticket.name}</p>
                          <p className="text-[10px] text-cyan-500/50 mt-1 font-mono">{ticket.date}</p>
                        </div>
                        <button 
                          onClick={() => removeTicket(ticket.id)}
                          className="text-cyan-500/30 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content: Analysis */}
        <div className="lg:col-span-9 p-8 overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Input Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-500 drop-shadow-[0_0_8px_rgba(255,0,229,0.5)]" />
                  <h2 className="text-lg font-bold text-white tracking-widest uppercase">Input_Stream</h2>
                </div>
                <button
                  onClick={() => setShouldSanitize(!shouldSanitize)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                    shouldSanitize 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,255,0.2)]' 
                      : 'bg-black/40 text-gray-500 border-white/10'
                  }`}
                >
                  {shouldSanitize ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {shouldSanitize ? 'PII_SHIELD_ON' : 'PII_SHIELD_OFF'}
                </button>
              </div>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-xl blur opacity-10 group-focus-within:opacity-30 transition duration-1000"></div>
                <textarea
                  value={currentIncident}
                  onChange={(e) => setCurrentIncident(e.target.value)}
                  placeholder="Awaiting incident data stream..."
                  className="relative w-full h-40 p-6 bg-black/60 border border-cyan-500/20 rounded-xl focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all resize-none shadow-2xl font-mono text-cyan-100 placeholder:text-cyan-500/30"
                />
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !currentIncident.trim() || historicalTickets.length === 0}
                    className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 text-black px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)] disabled:shadow-none uppercase tracking-widest text-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing_Neural_Net...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Execute_Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-pink-400 bg-pink-500/10 p-3 rounded-lg border border-pink-500/20 font-mono text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <p className="font-bold uppercase tracking-wider">Error: {error}</p>
                </div>
              )}
            </section>

            {/* Results Section */}
            <AnimatePresence mode="wait">
              {report && !isAnalyzing && (
                <motion.section
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="hologram-card rounded-xl p-8 border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,242,255,1)]" />
                        <h3 className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-sm">Neural_Summary</h3>
                      </div>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-cyan-500/20 transition-all disabled:opacity-50 uppercase tracking-widest"
                      >
                        {isGeneratingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Briefcase className="w-3 h-3" />}
                        Management_Brief
                      </button>
                    </div>
                    <p className="text-cyan-100/90 text-sm leading-relaxed font-mono">{report.summary}</p>
                    
                    <AnimatePresence>
                      {execSummary && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-6 pt-6 border-t border-cyan-500/20"
                        >
                          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em] mb-3">Executive_Briefing_Output</p>
                          <p className="text-cyan-100 text-sm italic bg-pink-500/5 p-4 rounded-lg border border-pink-500/20 font-mono">
                            "{execSummary}"
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.4em] flex items-center gap-2 pl-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      Prioritized_Resolutions
                    </h3>
                    
                    {report.suggestions.map((suggestion, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="hologram-card rounded-xl overflow-hidden border border-white/5"
                      >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-lg shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                              0{idx + 1}
                            </span>
                            <h4 className="font-bold text-white tracking-wider uppercase text-sm">{suggestion.title}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-bold text-cyan-500/60 uppercase tracking-widest">Confidence_Rating</span>
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${suggestion.confidence}%` }}
                                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.5)]" 
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-cyan-400">{suggestion.confidence}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-8 space-y-8">
                          <div>
                            <p className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-[0.3em] mb-3">Pattern_Match_Logic</p>
                            <p className="text-sm text-cyan-100/80 leading-relaxed font-mono">{suggestion.explanation}</p>
                          </div>

                          <div className="bg-black/40 rounded-xl p-6 border border-cyan-500/10">
                            <p className="text-[9px] font-bold text-pink-500/60 uppercase tracking-[0.3em] mb-4">Resolution_Protocol</p>
                            <ul className="space-y-4">
                              {suggestion.steps.map((step, sIdx) => (
                                <li key={sIdx} className="flex gap-4 text-sm text-cyan-100/90 font-mono">
                                  <span className="text-cyan-500/40 mt-0.5">[{sIdx + 1}]</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-cyan-500/40 rounded-full" />
                              <span className="text-[10px] text-cyan-500/40 font-mono uppercase tracking-widest">Source: {suggestion.historicalReference}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleExportKB(suggestion)}
                                className="flex items-center gap-2 text-[10px] font-bold text-cyan-500/60 hover:text-cyan-400 transition-all px-3 py-2 rounded-lg hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 uppercase tracking-widest"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                Export_Wiki
                              </button>
                              <button
                                onClick={() => handleCopyToCAS(suggestion)}
                                className={`flex items-center gap-2 text-[10px] font-bold transition-all px-5 py-2.5 rounded-lg border uppercase tracking-widest ${
                                  copiedId === suggestion.title
                                    ? 'bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-[0_0_15px_rgba(255,0,229,0.2)]'
                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                                }`}
                              >
                                {copiedId === suggestion.title ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedId === suggestion.title ? 'Copied_Buffer' : 'Sync_to_CAS'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!report && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                <div className="relative">
                  <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
                  <Search className="w-16 h-16 text-cyan-500/40 relative" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-[0.4em]">System_Idle</h3>
                  <p className="text-xs text-cyan-500/40 font-mono uppercase tracking-widest max-w-xs mx-auto">
                    Awaiting historical data injection and incident stream...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
