import React, { useState, useEffect } from 'react';
import { Listing } from '../services/api';
import {
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  Send,
  HelpCircle,
  Sparkles,
  User,
  Clock,
} from 'lucide-react';

interface QAAnswer {
  id: string;
  author: string;
  isOwner: boolean;
  content: string;
  created_at: string;
}

interface QuestionItem {
  id: string;
  listingId: string;
  author: string;
  question: string;
  upvotes: number;
  hasUpvoted?: boolean;
  created_at: string;
  answers: QAAnswer[];
}

interface ListingCommunityQAProps {
  listing: Listing;
}

// Realistic default questions for demo listings
const DEFAULT_QUESTIONS: Record<string, QuestionItem[]> = {
  default: [
    {
      id: 'q-default-1',
      listingId: 'default',
      author: 'Local Resident',
      question: 'Do you offer emergency or after-hours assistance if needed?',
      upvotes: 8,
      created_at: '2 days ago',
      answers: [
        {
          id: 'a-default-1',
          author: 'Verified Business Staff',
          isOwner: true,
          content: 'Yes! For urgent after-hours needs, please call our direct hotline listed above. Someone is on call 24/7.',
          created_at: '1 day ago',
        },
      ],
    },
    {
      id: 'q-default-2',
      listingId: 'default',
      author: 'Priya K.',
      question: 'Is there parking available directly outside the entrance?',
      upvotes: 4,
      created_at: '4 days ago',
      answers: [
        {
          id: 'a-default-2',
          author: 'Rahul (Town Guide)',
          isOwner: false,
          content: 'Yes, free roadside parking is available on both sides of the street during normal hours.',
          created_at: '3 days ago',
        },
      ],
    },
  ],
};

export const ListingCommunityQA: React.FC<ListingCommunityQAProps> = ({ listing }) => {
  const storageKey = `townpulse_qa_${listing.id}`;

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_QUESTIONS[listing.id] || DEFAULT_QUESTIONS['default'];
  });

  const [newQuestionText, setNewQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(questions));
    } catch (e) {
      console.error(e);
    }
  }, [questions, storageKey]);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setIsSubmitting(true);
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      listingId: listing.id,
      author: authorName.trim() || 'Town Neighbor',
      question: newQuestionText.trim(),
      upvotes: 1,
      created_at: 'Just now',
      answers: [],
    };

    setQuestions([newQ, ...questions]);
    setNewQuestionText('');
    setIsSubmitting(false);
  };

  const handleAddReply = (questionId: string) => {
    if (!replyText.trim()) return;

    const newReply: QAAnswer = {
      id: `a-${Date.now()}`,
      author: 'Community Member',
      isOwner: false,
      content: replyText.trim(),
      created_at: 'Just now',
    };

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answers: [...q.answers, newReply] } : q
      )
    );

    setReplyText('');
    setActiveReplyId(null);
  };

  const handleToggleUpvote = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const hasUpvoted = q.hasUpvoted;
          return {
            ...q,
            upvotes: hasUpvoted ? q.upvotes - 1 : q.upvotes + 1,
            hasUpvoted: !hasUpvoted,
          };
        }
        return q;
      })
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
      {/* Title & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Community Q&A</span>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                {questions.length} Questions
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ask questions or view answers from verified owners and neighbors.
            </p>
          </div>
        </div>
      </div>

      {/* Ask Question Input Box */}
      <form onSubmit={handleAddQuestion} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your name or nickname (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-1/3 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <input
            type="text"
            required
            placeholder="Ask something about services, parking, appointments..."
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newQuestionText.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>
      </form>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No questions yet. Be the first to ask!
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3"
            >
              {/* Question Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {q.author}
                    </span>
                    <span>•</span>
                    <span>{q.created_at}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {q.question}
                  </p>
                </div>

                {/* Upvote Button */}
                <button
                  onClick={() => handleToggleUpvote(q.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                    q.hasUpvoted
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                  title="Mark this question as helpful"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{q.upvotes}</span>
                </button>
              </div>

              {/* Answers */}
              {q.answers.length > 0 && (
                <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800/60 space-y-2 mt-2">
                  {q.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {ans.author}
                        </span>
                        {ans.isOwner && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-800">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Verified Owner</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">• {ans.created_at}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {ans.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply toggle & input */}
              <div className="pt-1">
                {activeReplyId === q.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Write your reply or answer..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleAddReply(q.id)}
                      disabled={!replyText.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                    >
                      Post Reply
                    </button>
                    <button
                      onClick={() => setActiveReplyId(null)}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveReplyId(q.id)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Reply to this question</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
