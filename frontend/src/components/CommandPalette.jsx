import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, User, TreePine, Pencil, Loader2, CornerDownLeft } from "lucide-react";
import { personAPI } from "../services/api";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await personAPI.search(query);
        setResults(res?.data?.data || []);
        setSelectedIdx(0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard nav
  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) {
      navigate(`/family-tree/${results[selectedIdx].id}`);
      setOpen(false);
    }
  }, [results, selectedIdx, navigate]);

  const handleSelect = (person) => {
    navigate(`/family-tree/${person.id}`);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 dark:border-slate-600">
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search family members..."
              className="flex-1 h-full bg-transparent text-slate-900 dark:text-slate-100 dark:text-white text-base outline-none placeholder:text-slate-400"
            />
            <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-300 font-mono">
              <CornerDownLeft className="w-3 h-3" /> esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-slate-400 dark:text-slate-300 animate-spin" />
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="text-center py-10">
                <User className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-300">No members found</p>
              </div>
            )}

            {!loading && !query && (
              <div className="text-center py-10">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-300">Type to search family members</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono">⌘K</kbd> to toggle
                </p>
              </div>
            )}

            {!loading && results.map((person, idx) => (
              <button
                key={person.id}
                onClick={() => handleSelect(person)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${idx === selectedIdx
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : "hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-600/50"
                  }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${person.gender === "male"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-pink-100 text-pink-600"}`}>
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 dark:text-white">
                    {person.first_name} {person.last_name}
                  </p>
                  {person.email && (
                    <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{person.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  {idx === selectedIdx && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">↵</span>
                  )}
                  <TreePine className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-400">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">↵</kbd> Open</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">esc</kbd> Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
