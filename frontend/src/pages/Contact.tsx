import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../hooks/useSeo';
import { Github, Bug, Lightbulb, HelpCircle, Send, ExternalLink } from 'lucide-react';

const TOPICS = [
  { id: 'bug', label: 'Bug report', icon: <Bug className="w-3.5 h-3.5" /> },
  { id: 'feature', label: 'Feature request', icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { id: 'question', label: 'General question', icon: <HelpCircle className="w-3.5 h-3.5" /> },
] as const;

type TopicId = (typeof TOPICS)[number]['id'];

const ISSUE_URL = 'https://github.com/R0HITHRAO/Townpulse/issues/new';

export const Contact: React.FC = () => {
  const { t } = useTranslation();
  useSeo(
    `${t('contact')} — TownPulse`,
    'Reach the TownPulse maintainers — report a bug, request a feature, or ask a question.'
  );

  const [topic, setTopic] = useState<TopicId>('bug');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const topicLabel = TOPICS.find((tp) => tp.id === topic)?.label ?? 'Message';
    const body = [
      message.trim(),
      name.trim() ? `\n— ${name.trim()}` : '',
      '\n(submitted via the TownPulse contact page)',
    ]
      .filter(Boolean)
      .join('\n');
    const url = `${ISSUE_URL}?title=${encodeURIComponent(`[${topicLabel}]`)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm animate-slide-up transition-colors duration-200">
        <div className="space-y-2 border-b border-gray-100 dark:border-slate-800 pb-6">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Get in touch
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('contact')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            TownPulse is community-run. The fastest way to reach the maintainers is through our
            public GitHub repository — reports and ideas are open for everyone to follow.
          </p>
        </div>

        {/* Direct Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://github.com/R0HITHRAO/Townpulse/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-800/60 space-y-1.5 hover:scale-[1.02] transition group"
          >
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-sm">
              <Github className="w-4 h-4" />
              Open an issue
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition" />
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
              Report bugs or request features on GitHub. We respond to every issue.
            </p>
          </a>

          <a
            href="https://github.com/R0HITHRAO/Townpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 space-y-1.5 hover:scale-[1.02] transition group"
          >
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-sm">
              <Github className="w-4 h-4" />
              Contribute
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition" />
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              TownPulse is open-source under MIT. Star the repo or send a pull request.
            </p>
          </a>
        </div>
        {/* Compose → opens prefilled GitHub issue */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-800"
        >
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Send a message to the maintainers
          </h2>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">
              What is this about?
            </legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setTopic(tp.id)}
                  aria-pressed={topic === tp.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition hover:scale-105 active:scale-95 ${
                    topic === tp.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tp.icon}
                  {tp.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="contact-name"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5"
            >
              Your name (optional)
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we address you?"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5"
            >
              Message *
            </label>
            <textarea
              id="contact-message"
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the bug, idea, or question in detail..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-snug">
              Opens a new GitHub issue with your message pre-filled.
            </p>
            <button
              type="submit"
              disabled={!message.trim()}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Open GitHub Issue
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
          <Link
            to="/"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← {t('back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Contact;
