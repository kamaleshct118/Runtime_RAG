"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  FileText,
  Loader2,
  Menu,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDocName(doc: string) {
  return doc
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getEmptyStatePrompts(activeDocument: string | null) {
  return activeDocument
    ? [
        "Summarize the key points.",
        "What evidence supports the main claim?",
        "Which pages should I review first?",
      ]
    : [
        "Upload a PDF under 15MB.",
        "Select one document from the sidebar.",
        "Ask precise questions and inspect citations.",
      ];
}

function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60 backdrop-blur-md">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((item) => (
          <span key={item} className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
        ))}
      </div>
      <span>Thinking</span>
    </div>
  );
}

function CitationsPanel({ sources, pages }: { sources: Source[]; pages: number[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[var(--accent-strong)]">
            <BookOpenText size={14} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Citations</p>
            <p className="text-xs text-white/45">{sources.length} supporting excerpts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden flex-wrap gap-1 sm:flex">
            {pages.map((page) => (
              <span
                key={page}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55"
              >
                p.{page}
              </span>
            ))}
          </div>
          <ChevronDown
            size={14}
            className={`text-white/45 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-white/8 px-3 py-3">
              <div className="flex flex-wrap gap-1 sm:hidden">
                {pages.map((page) => (
                  <span
                    key={page}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55"
                  >
                    p.{page}
                  </span>
                ))}
              </div>

              {sources.map((source, index) => (
                <motion.div
                  key={`${source.page}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-lg border border-white/8 bg-black/15 px-3 py-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-strong)]">
                      Page {source.page}
                    </span>
                    <span className="text-[11px] text-white/35">Excerpt {index + 1}</span>
                  </div>
                  <p className="text-sm leading-6 text-white/65">{source.content}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({
  activeDocument,
  onPromptSelect,
}: {
  activeDocument: string | null;
  onPromptSelect: (prompt: string) => void;
}) {
  const prompts = getEmptyStatePrompts(activeDocument);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
          <Sparkles size={12} className="text-[var(--accent-strong)]" />
          Retrieval Workspace
        </div>
        <h1 className="max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
          {activeDocument ? `Ask grounded questions about ${formatDocName(activeDocument)}.` : "A clean workspace for document-grounded chat."}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {activeDocument
            ? "Responses stay anchored to your selected PDF and include structured citations you can inspect inline."
            : "Upload a document, select it from the sidebar, and keep the entire conversation centered in one focused column."}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptSelect(prompt)}
              className="cursor-pointer rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-left text-sm text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-zinc-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RagChatApp() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const citationCount = useMemo(
    () => chatHistory.reduce((total, message) => total + (message.sources?.length ?? 0), 0),
    [chatHistory],
  );

  useEffect(() => {
    void fetchDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!uploadSuccess) return;
    const timeout = setTimeout(() => setUploadSuccess(null), 2500);
    return () => clearTimeout(timeout);
  }, [uploadSuccess]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${BASE_URL}/documents`);
      if (!response.ok) throw new Error("Failed to fetch documents");

      const payload = (await response.json()) as { documents?: string[] };
      const nextDocuments = Array.isArray(payload.documents) ? payload.documents : [];
      setDocuments(nextDocuments);
      setActiveDocument((current) => current ?? nextDocuments[0] ?? null);
    } catch {
      setError("Could not connect to the backend at http://localhost:8000.");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("File is too large. Please upload a PDF smaller than 15MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Upload failed");
      }

      const payload = (await response.json()) as { doc_id: string };
      const nextDocId = payload.doc_id;
      setDocuments((current) => (current.includes(nextDocId) ? current : [nextDocId, ...current]));
      setActiveDocument(nextDocId);
      setChatHistory([]);
      setUploadSuccess(`${formatDocName(nextDocId)} is ready.`);
      setMobileSidebarOpen(false);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingDoc(docId);

    try {
      const response = await fetch(`${BASE_URL}/documents/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      setDocuments((current) => {
        const remaining = current.filter((doc) => doc !== docId);
        setActiveDocument((selected) => (selected === docId ? remaining[0] ?? null : selected));
        return remaining;
      });

      if (activeDocument === docId) {
        setChatHistory([]);
      }
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete document.");
    } finally {
      setDeletingDoc(null);
    }
  };

  const submitQuery = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query || !activeDocument || isLoading) return;

      setChatHistory((current) => [
        ...current,
        { id: genId(), role: "user", content: query, timestamp: new Date() },
      ]);
      setInputValue("");
      setIsLoading(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        const response = await fetch(`${BASE_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, doc_id: activeDocument }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.detail || "Query failed");
        }

        const payload = (await response.json()) as {
          answer: string;
          sources?: Source[];
          pages?: number[];
        };

        setChatHistory((current) => [
          ...current,
          {
            id: genId(),
            role: "assistant",
            content: payload.answer,
            sources: Array.isArray(payload.sources) ? payload.sources : [],
            pages: Array.isArray(payload.pages) ? payload.pages : [],
            timestamp: new Date(),
          },
        ]);
      } catch (askError: unknown) {
        setChatHistory((current) => [
          ...current,
          {
            id: genId(),
            role: "assistant",
            content:
              askError instanceof Error ? `Error: ${askError.message}` : "Something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeDocument, isLoading],
  );

  const handleSend = useCallback(async () => {
    await submitQuery(inputValue);
  }, [inputValue, submitQuery]);

  const handlePromptSelect = useCallback(
    async (prompt: string) => {
      setInputValue(prompt);
      await submitQuery(prompt);
    },
    [submitQuery],
  );

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const selectDocument = (docId: string) => {
    if (docId === activeDocument) return;
    setActiveDocument(docId);
    setChatHistory([]);
    setMobileSidebarOpen(false);
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col rounded-2xl border border-white/10 bg-[rgba(18,20,27,0.78)] shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Documents</p>
            <h2 className="mt-1 text-lg font-semibold text-white">RAG Workspace</h2>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="hidden rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/55 transition hover:bg-white/[0.08] hover:text-white lg:inline-flex"
            aria-label="Collapse sidebar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-white/40">Docs</p>
            <p className="mt-1 font-medium text-white">{documents.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-white/40">Citations</p>
            <p className="mt-1 font-medium text-white">{citationCount}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <input
          ref={fileInputRef}
          id="pdf-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
        />
        <label
          htmlFor="pdf-upload"
          className={`flex h-10 items-center justify-between rounded-xl border px-3 text-sm transition ${
            isUploading
              ? "border-white/15 bg-white/[0.08] text-white"
              : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {isUploading ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
            <span className="truncate">{isUploading ? uploadProgress || "Uploading" : "Upload PDF"}</span>
          </span>
          <span className="text-[11px] text-white/40">15MB</span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Library</div>

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-5 text-center text-sm text-white/45">
            Upload your first PDF to begin.
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {documents.map((doc) => {
                const isActive = doc === activeDocument;
                const isDeleting = doc === deletingDoc;

                return (
                  <motion.div
                    key={doc}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`group rounded-xl border transition ${
                      isActive
                        ? "border-white/15 bg-white/[0.07]"
                        : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => selectDocument(doc)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${isActive ? "text-white" : "text-white/78"}`}>
                            {formatDocName(doc)}
                          </p>
                          <p className="truncate text-xs text-white/35">{doc}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(doc)}
                        disabled={isDeleting}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-red-400/10 hover:text-red-200 disabled:opacity-60"
                        aria-label={`Delete ${doc}`}
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(120,140,170,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(90,110,130,0.08),transparent_22%)]">
        <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-3 py-3 sm:px-4 sm:py-4">
          <div className={`hidden lg:block ${sidebarOpen ? "w-72 shrink-0" : "w-0 overflow-hidden"}`}>{sidebar}</div>

          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <motion.div
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  exit={{ x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  {sidebar}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="relative flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-[rgba(16,18,24,0.72)] shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu size={16} />
              </button>

              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white/60 transition hover:bg-white/[0.08] lg:inline-flex"
                >
                  <Menu size={16} />
                  Documents
                </button>
              )}

              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--accent-strong)]">
                <Search size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold text-white">
                  {activeDocument ? formatDocName(activeDocument) : "RAG Chat"}
                </h1>
                <p className="truncate text-sm text-white/45">
                  {activeDocument ? "Grounded answers with inline citations" : "Select a document to start"}
                </p>
              </div>

              {chatHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatHistory([])}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Clear
                </button>
              )}
            </header>

            <AnimatePresence>
              {(error || uploadSuccess) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-1/2 top-4 z-20 w-full max-w-md -translate-x-1/2 px-4"
                >
                  <div
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm backdrop-blur-xl ${
                      error
                        ? "border-red-400/20 bg-red-500/10 text-red-100"
                        : "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                    }`}
                  >
                    {error ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
                    <p className="flex-1 leading-6">{error || uploadSuccess}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setUploadSuccess(null);
                      }}
                      className="text-current/70 transition hover:text-current"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto pb-32">
              {chatHistory.length === 0 && !isLoading ? (
                <EmptyState activeDocument={activeDocument} onPromptSelect={handlePromptSelect} />
              ) : (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
                  <AnimatePresence initial={false}>
                    {chatHistory.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                          {message.role === "user" ? (
                            <div className="rounded-2xl rounded-br-md border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm leading-6 text-white">
                              {message.content}
                            </div>
                          ) : (
                            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <div className="markdown-body text-sm leading-6">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ ...props }) => <h1 className="mb-2 mt-4 text-lg font-semibold text-white first:mt-0" {...props} />,
                                    h2: ({ ...props }) => <h2 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0" {...props} />,
                                    h3: ({ ...props }) => <h3 className="mb-2 mt-3 text-sm font-semibold text-white first:mt-0" {...props} />,
                                    p: ({ ...props }) => <p className="mb-2 whitespace-pre-wrap text-white/78 last:mb-0" {...props} />,
                                    ul: ({ ...props }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-white/78" {...props} />,
                                    ol: ({ ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-white/78" {...props} />,
                                    li: ({ ...props }) => <li {...props} />,
                                    strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
                                    code: ({ ...props }) => <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.95em] text-[var(--accent-strong)]" {...props} />,
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                              {message.sources && message.pages && <CitationsPanel sources={message.sources} pages={message.pages} />}
                            </div>
                          )}

                          <div className={`mt-1.5 px-1 text-[11px] text-white/32 ${message.role === "user" ? "text-right" : "text-left"}`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="flex justify-start"
                      >
                        <TypingIndicator />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
              <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-[rgba(20,22,30,0.88)] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                {!activeDocument && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-300/12 bg-amber-400/8 px-3 py-2 text-sm text-amber-100/85">
                    <AlertCircle size={14} className="shrink-0" />
                    Select or upload a document to enable chat.
                  </div>
                )}

                <div className="flex items-end gap-2.5">
                <div className="flex-1 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 transition focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10">
                  <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputValue}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      disabled={!activeDocument || isLoading}
                      placeholder={
                        activeDocument
                          ? `Ask about ${formatDocName(activeDocument)}...`
                          : "Choose a document to start..."
                      }
                      className="min-h-[22px] max-h-[160px] w-full resize-none overflow-y-auto bg-transparent text-sm leading-6 text-white placeholder:text-zinc-400 focus:outline-none"
                    />
                  </div>

                  <motion.button
                    type="button"
                    whileHover={inputValue.trim() && activeDocument && !isLoading ? { scale: 1.02 } : undefined}
                    whileTap={inputValue.trim() && activeDocument && !isLoading ? { scale: 0.98 } : undefined}
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || !activeDocument || isLoading}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                      inputValue.trim() && activeDocument && !isLoading
                        ? "border-white/15 bg-white/[0.10] text-white hover:bg-white/[0.14]"
                        : "border-white/10 bg-white/[0.04] text-white/25"
                    }`}
                    aria-label="Send message"
                  >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </motion.button>
                </div>

                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-white/32">
                  <span>Enter to send</span>
                  <span>{activeDocument ? formatDocName(activeDocument) : "No document selected"}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
