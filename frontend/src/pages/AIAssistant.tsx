import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Clock,
  Database,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Info
} from "lucide-react";
import { api } from "../services/api";
import { NLQueryResponse } from "../types/vehicle";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  response?: NLQueryResponse;
  latencyMs?: number;
}

interface AssistantProps {
  initialQuery?: string | null;
}

export const AIAssistant: React.FC<AssistantProps> = ({ initialQuery }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am VehicleGPT, your on-device EV diagnostic assistant. I analyze real vehicle telemetry, battery health, thermal behavior, and diagnostic trouble codes completely offline without cloud servers. How can I help you understand your vehicle today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Why has my driving range decreased over the last two weeks?",
    "Compare energy consumption between city and highway driving.",
    "What happened before the battery overheating warning?",
    "Show all diagnostic events from yesterday.",
    "When did energy consumption show the largest increase?",
    "What was the battery SOC over the last seven days?",
    "Show the last five diagnostic trouble codes.",
    "Summarize vehicle performance over the last week."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (queryToSend?: string) => {
    const text = queryToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const { data, latencyMs } = await api.askAssistant(text.trim());
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        response: data,
        latencyMs
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: `Error querying local vehicle intelligence: ${err.message || "Failed to reach edge backend."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "assistant",
        text: "Conversation cleared. Ready for your next vehicle question.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Top Banner & AI Mode Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">VehicleGPT Intelligence Assistant</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                100% Offline
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Query vehicle logs, DTC codes, battery kinematics, and thermal events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Active Mode:</span>
            <span className="font-semibold text-slate-200">Local SLM / Analytics</span>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            Clear
          </button>
        </div>
      </div>

      {/* Suggested Questions Carousel / Chip Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 shrink-0 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Examples:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-300 text-xs shrink-0 transition whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isExpanded = expandedEvidence[msg.id];
          const evidence = msg.response?.evidence;

          return (
            <div key={msg.id} className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-3xl space-y-2.5 ${isUser ? "items-end" : "items-start"}`}>
                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none font-medium"
                      : "bg-[#0f172a] border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Safety Protocol Indicator if triggered */}
                  {msg.response?.intent_detected === "SAFETY_CONTROL_REJECTION" && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Permanent Safety Boundary: Zero bus write access to braking or steering actuators.</span>
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className={`mt-2.5 flex flex-wrap items-center gap-2.5 text-[10px] ${isUser ? "text-cyan-200" : "text-slate-400"}`}>
                    <span>{msg.timestamp}</span>

                    {/* Distinct Mode Badge */}
                    {msg.response && (
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                          msg.response.active_ai_mode === "LOCAL_SLM"
                            ? "bg-purple-950 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-950"
                            : msg.response.active_ai_mode === "SAFETY_ISOLATION_BARRIER"
                            ? "bg-red-950 text-red-300 border-red-500/40"
                            : "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                        }`}
                      >
                        {msg.response.active_ai_mode === "LOCAL_SLM"
                          ? "✨ Local Quantized SLM"
                          : msg.response.active_ai_mode === "SAFETY_ISOLATION_BARRIER"
                          ? "🛡️ Safety Intercept"
                          : "📊 Verified Analytics Engine"}
                      </span>
                    )}

                    {msg.latencyMs !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock className="w-3 h-3 text-cyan-400" /> {msg.latencyMs}ms latency
                      </span>
                    )}

                    {msg.response && (
                      <span className="font-mono text-slate-400">
                        Intent: {msg.response.intent_detected}
                      </span>
                    )}
                  </div>
                </div>

                {/* Evidence & Supporting Records Drawer (Assistant Only) */}
                {evidence && (
                  <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl overflow-hidden text-xs">
                    <button
                      onClick={() => toggleEvidence(msg.id)}
                      className="w-full px-4 py-2 flex items-center justify-between text-slate-300 hover:text-white bg-slate-900/50 transition"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Supporting Database Evidence</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-cyan-300 rounded font-mono">
                          {evidence.supporting_record_count} Records
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400">Time Window:</span>
                            <div className="font-semibold text-white">{evidence.time_window_analyzed}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Queried Tables:</span>
                            <div className="font-mono text-cyan-300">
                              {evidence.database_tables_queried.join(", ") || "telemetry_records"}
                            </div>
                          </div>
                        </div>

                        {/* Numerical Metrics Summary */}
                        {evidence.numerical_metrics && Object.keys(evidence.numerical_metrics).length > 0 && (
                          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                              Calculated Metrics:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                              {Object.entries(evidence.numerical_metrics).map(([k, v]) => (
                                <div key={k} className="p-1.5 bg-slate-800/50 rounded">
                                  <span className="text-slate-400 block text-[10px]">{k}:</span>
                                  <span className="text-cyan-300 font-bold">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sample Records Snapshot */}
                        {evidence.sample_records && evidence.sample_records.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-slate-400 text-[11px]">Database Record Samples:</span>
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {evidence.sample_records.slice(0, 3).map((rec: any, idx: number) => (
                                <pre
                                  key={idx}
                                  className="p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800"
                                >
                                  {JSON.stringify(rec, null, 2)}
                                </pre>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3.5 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-[#0f172a] border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Querying local SQLite records and calculating evidence metrics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl focus-within:border-cyan-500/60 transition"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask anything about driving range, battery temperatures, DTC codes, or energy consumption..."
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-950"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
