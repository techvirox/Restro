import React, { useState } from 'react';
import { SupportTicket } from '../types';
import { HelpCircle, Send, X, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { soundEffects } from './SoundUtility';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status' | 'priority'>) => void;
  currentUser?: any;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmitTicket,
  currentUser
}) => {
  const [ticketType, setTicketType] = useState<SupportTicket['type']>('problem');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    soundEffects.playSuccessChime();
    onSubmitTicket({
      userName: currentUser?.name || 'Staff User',
      userEmail: currentUser?.email,
      userPhone: contactPhone.trim(),
      type: ticketType,
      description: description.trim()
    });

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setDescription('');
      onClose();
    }, 2000);
  };

  return (
    <div id="support-ticket-modal-overlay" className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold border-none bg-transparent cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-4">
          <HelpCircle className="w-6 h-6" />
          <h2 className="text-base font-black uppercase tracking-wide">Submit Help / Support Request</h2>
        </div>

        {submittedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Ticket Submitted Successfully!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Our support team and system administrator will review your ticket promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Request / Issue Category *</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold outline-none"
              >
                <option value="problem">Problem / Operational Help</option>
                <option value="bug">Software Bug Report</option>
                <option value="printer_problem">Thermal Printer Issue</option>
                <option value="payment_problem">Payment / Billing Discrepancy</option>
                <option value="feature_request">New Feature Request</option>
                <option value="subscription_problem">Subscription / License Inquiry</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono font-semibold outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe the issue, printer error, or feature request in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 border-none cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
