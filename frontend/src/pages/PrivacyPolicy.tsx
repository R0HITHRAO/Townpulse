import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../hooks/useSeo';
import { ShieldCheck, HardDrive, EyeOff, Database, Mail, RefreshCw } from 'lucide-react';

const SECTIONS: {
  icon: React.ReactNode;
  title: string;
  body: string[];
}[] = [
  {
    icon: <Database className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
    title: 'Information we collect',
    body: [
      'Listings, reviews, questions, and reports you voluntarily submit. Contact details such as email or phone are only collected when you register, claim a business, or submit a listing.',
      'Server logs may record standard technical data (IP address, browser type, timestamps) for security and rate limiting.',
    ],
  },
  {
    icon: <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    title: 'Data stored on your device',
    body: [
      'Your authentication tokens, theme preference, and saved bookmarks are stored in your browser\'s local storage. They never leave your device except the tokens used to authenticate API requests.',
      'As a progressive web app, TownPulse caches listings and map tiles locally so the directory keeps working offline. You can clear this cache at any time from your browser settings.',
    ],
  },
  {
    icon: <EyeOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    title: 'No third-party tracking',
    body: [
      'TownPulse has no advertising networks, analytics trackers, or third-party cookies. We do not sell, rent, or share your personal information with anyone.',
      'Map tiles are provided by OpenStreetMap; your map interactions are governed by their tile usage policy, not by trackers embedded in TownPulse.',
    ],
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    title: 'How we protect data',
    body: [
      'Passwords are hashed with bcrypt. API access uses short-lived JWTs with refresh tokens. OTP requests are rate limited to prevent abuse.',
      'Verification proof submitted when claiming a business is visible only to administrators and is used solely for the approval workflow.',
    ],
  },
  {
    icon: <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    title: 'Your rights',
    body: [
      'You may request a copy of your personal data, correct it, or ask for account deletion at any time via the contact page.',
      'Reviews and questions you post can be deleted from your account or by moderator action.',
    ],
  },
  {
    icon: <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
    title: 'Changes to this policy',
    body: [
      'When this policy changes materially, we will update the date below and announce it through the app. Continued use after changes constitutes acceptance of the revised policy.',
    ],
  },
];

export const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  useSeo(`${t('privacy')} — TownPulse`, 'How TownPulse collects, stores, and protects your data — privacy-first by design.');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm animate-rise transition-colors duration-200">
        <div className="space-y-2 border-b border-gray-100 dark:border-slate-800 pb-6">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            Legal
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('privacy')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            TownPulse is privacy-first community infrastructure. This page explains exactly what
            we collect and why — no hidden clauses.
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Last updated: January 2026</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                <span className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  {section.icon}
                </span>
                {section.title}
              </h2>
              {section.body.map((para, i) => (
                <p key={i} className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed pl-8">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            to="/"
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            ← {t('back_home')}
          </Link>
          <Link
            to="/contact"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
          >
            {t('contact')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
