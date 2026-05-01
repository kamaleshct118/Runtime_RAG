"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Upload,
  Trash2,
  Send,
  ChevronDown,
  BookOpen,
  MessageSquare,
  Sparkles,
  AlertCircle,
  X,
  FileSearch,
  Loader2,
  CheckCircle2,
  FilePlus2,
  PanelLeftClose,
  PanelLeftOpen,
  Hash,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Source {
  page: number;
  content: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  pages?: number[];
  timestamp: Date;
}

const BASE_URL = "http://localhost:8000";

// ─── Utility ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDocName(doc: string) {
  return doc.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-brand"
        />
      ))}
    </div>
  );
}

function SourcesPanel({ sources, pages }: { sources: Source[]; pages: number[] }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <BookOpen size={11} className="text-brand" />
          {sources.length} source{sources.length > 1 ? "s" : ""} referenced
        </span>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <span className="flex items-center gap-1">
              {pages.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-0.5 bg-brand-muted text-brand px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                >
                  <Hash size={8} />
                  {p}
                </span>
              ))}
            </span>
          )}
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border">
              {sources.map((src, idx) => (
                <div key={idx} className="px-3 py-2.5 bg-card/40">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono font-medium text-brand bg-brand-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Hash size={8} />
                      Page {src.page}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Source {idx + 1}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                    {src.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyChat({ activeDocument }: { activeDocument: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-muted border border-brand/20 flex items-center justify-center">
          <Sparkles size={28} className="text-brand" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
          <MessageSquare size={10} className="text-brand" />
        </div>
      </div>

      {activeDocument ? (
        <>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Ready to explore
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Ask anything about{" "}
            <span className="text-foreground font-medium">
              {formatDocName(activeDocument)}
            </span>
            . I'll find the most relevant sections and cite my sources.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-sm">
            {[
              "Summarize the key points",
              "What are the main conclusions?",
              "List the important findings",
            ].map((s) => (
              <span
                key={s}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-card hover:border-brand/40 hover:text-foreground transition-colors cursor-default"
              >
                {s}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No document selected
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Upload a PDF or select an existing document from the sidebar to begin
            chatting.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RagChatApp() {
  const [documentList, setDocumentList] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch documents on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetchDocuments();
  }, []);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  // ── Auto-dismiss error ─────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (uploadSuccess) {
      const t = setTimeout(() => setUploadSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [uploadSuccess]);

  // ── API: Fetch documents ───────────────────────────────────────────────────
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${BASE_URL}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocumentList(data.documents || []);
    } catch {
      setError("Could not connect to the backend. Is it running on port 8000?");
    }
  };

  // ── API: Upload document ───────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    
    // 15MB limit (15 * 1024 * 1024 bytes)
    if (file.size > 15 * 1024 * 1024) {
      setError("File is too large. Please upload a PDF smaller than 15MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Processing "${file.name}"…`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      const newDocId: string = data.doc_id;

      setDocumentList((prev) =>
        prev.includes(newDocId) ? prev : [...prev, newDocId]
      );
      setActiveDocument(newDocId);
      setChatHistory([]);
      setUploadSuccess(`"${formatDocName(newDocId)}" is ready to chat!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── API: Delete document ───────────────────────────────────────────────────
  const handleDelete = async (docId: string) => {
    setDeletingDoc(docId);
    try {
      const res = await fetch(`${BASE_URL}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setDocumentList((prev) => prev.filter((d) => d !== docId));
      if (activeDocument === docId) {
        setActiveDocument(null);
        setChatHistory([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete document");
    } finally {
      setDeletingDoc(null);
    }
  };

  // ── API: Ask question ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || !activeDocument || isLoading) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(`${BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, doc_id: activeDocument }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Query failed");
      }
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        pages: data.pages,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content:
          err instanceof Error
            ? `Error: ${err.message}`
            : "Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, activeDocument, isLoading]);

  // ── Textarea auto-resize + Enter key ──────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Select document ────────────────────────────────────────────────────────
  const selectDocument = (docId: string) => {
    if (docId === activeDocument) return;
    setActiveDocument(docId);
    setChatHistory([]);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 flex flex-col border-r border-border overflow-hidden"
            style={{ background: "var(--sidebar)" }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
                  <FileSearch size={14} className="text-brand" />
                </div>
                <span className="font-semibold text-sm tracking-tight text-foreground">
                  DocMind
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>

            {/* Upload section */}
            <div className="px-3 py-3 border-b border-border">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all duration-200 text-sm font-medium group
                  ${
                    isUploading
                      ? "border-brand/40 bg-brand-muted text-brand cursor-not-allowed"
                      : "border-border hover:border-brand/50 hover:bg-brand-muted/60 text-muted-foreground hover:text-brand"
                  }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs truncate max-w-[160px]">
                      {uploadProgress || "Uploading…"}
                    </span>
                  </>
                ) : (
                  <>
                    <FilePlus2 size={14} />
                    <span>Upload PDF</span>
                  </>
                )}
              </label>
              <p className="text-[10px] text-muted-foreground/60 text-center mt-2 font-medium">
                Max file size: 15MB
              </p>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
                Documents ({documentList.length})
              </p>

              {documentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FileText size={18} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No documents yet.
                    <br />
                    Upload a PDF to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence>
                    {documentList.map((doc) => {
                      const isActive = doc === activeDocument;
                      const isDeleting = doc === deletingDoc;
                      return (
                        <motion.div
                          key={doc}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                            isActive
                              ? "bg-brand/10 border border-brand/20"
                              : "hover:bg-accent border border-transparent"
                          }`}
                          onClick={() => !isDeleting && selectDocument(doc)}
                        >
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              isActive
                                ? "bg-brand/15 text-brand"
                                : "bg-muted text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <FileText size={12} />
                          </div>
                          <span
                            className={`flex-1 text-xs font-medium truncate ${
                              isActive ? "text-brand" : "text-foreground"
                            }`}
                            title={doc}
                          >
                            {formatDocName(doc)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc);
                            }}
                            disabled={isDeleting}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
                          >
                            {isDeleting ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="px-4 py-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                Powered by local RAG · 2026
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border backdrop-blur-sm bg-background/80 z-10">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {!sidebarOpen && (
            <div className="flex items-center gap-2 mr-2">
              <div className="w-6 h-6 rounded-md bg-brand/15 border border-brand/25 flex items-center justify-center">
                <FileSearch size={12} className="text-brand" />
              </div>
              <span className="font-semibold text-sm tracking-tight">DocMind</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {activeDocument ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <span className="text-sm font-medium text-foreground truncate">
                  {formatDocName(activeDocument)}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  · Ready
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a document to begin
              </span>
            )}
          </div>

          {chatHistory.length > 0 && (
            <button
              onClick={() => setChatHistory([])}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent transition-all"
            >
              <X size={11} />
              Clear chat
            </button>
          )}
        </header>

        {/* Toast notifications */}
        <AnimatePresence>
          {(error || uploadSuccess) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
            >
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm backdrop-blur-sm ${
                  error
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-brand/10 border-brand/30 text-brand"
                }`}
              >
                {error ? (
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                )}
                <span className="flex-1 leading-snug">{error || uploadSuccess}</span>
                <button
                  onClick={() => {
                    setError(null);
                    setUploadSuccess(null);
                  }}
                  className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 && !isLoading ? (
            <EmptyChat activeDocument={activeDocument} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              <AnimatePresence initial={false}>
                {chatHistory.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center mt-0.5">
                        <Sparkles size={14} className="text-brand" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[82%] ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-brand text-brand-foreground text-sm leading-relaxed shadow-sm">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-card border border-border text-sm leading-relaxed text-foreground shadow-sm">
                          <div className="text-sm prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                h1: ({node, ...props}: any) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground" {...props} />,
                                h2: ({node, ...props}: any) => <h2 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />,
                                h3: ({node, ...props}: any) => <h3 className="text-base font-bold mt-3 mb-1 text-foreground" {...props} />,
                                p: ({node, ...props}: any) => <p className="mb-2 leading-relaxed whitespace-pre-wrap text-foreground/90 last:mb-0" {...props} />,
                                ul: ({node, ...props}: any) => <ul className="list-disc list-outside ml-5 mb-3 text-foreground/90" {...props} />,
                                ol: ({node, ...props}: any) => <ol className="list-decimal list-outside ml-5 mb-3 text-foreground/90" {...props} />,
                                li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
                                strong: ({node, ...props}: any) => <strong className="font-semibold text-foreground" {...props} />
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                          {msg.sources && msg.pages && (
                            <SourcesPanel
                              sources={msg.sources}
                              pages={msg.pages}
                            />
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center mt-0.5 text-xs font-semibold text-muted-foreground">
                        U
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center">
                      <Sparkles size={14} className="text-brand" />
                    </div>
                    <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-card border border-border shadow-sm">
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {!activeDocument && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5"
              >
                <AlertCircle size={11} />
                Select or upload a document to enable the chat
              </motion.p>
            )}

            <div
              className={`flex items-end gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
                activeDocument
                  ? "border-border bg-card focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20"
                  : "border-border/50 bg-muted/30 opacity-60"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={!activeDocument || isLoading}
                placeholder={
                  activeDocument
                    ? `Ask about ${formatDocName(activeDocument)}…`
                    : "Select a document to chat…"
                }
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[22px] max-h-[140px] overflow-y-auto"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || !activeDocument || isLoading}
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  inputValue.trim() && activeDocument && !isLoading
                    ? "bg-brand text-brand-foreground hover:opacity-90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
