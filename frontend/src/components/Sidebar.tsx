// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, LayoutGrid, ChefHat, Receipt, Settings, 
  Smartphone, Monitor, Wifi, Clock, Calculator, BarChart3, Home, Users, Smile,
  Printer, TrendingDown, LogOut, User, Zap
} from 'lucide-react';
import { soundEffects } from './SoundUtility';

import { FeatureToggles } from '../types';

interface SidebarProps {
  currentTab: 'dashboard' | 'tables' | 'kitchen' | 'billing' | 'settings' | 'calculator' | 'reports' | 'waiters' | 'crm' | 'printer-settings' | 'expenses' | 'profile';
  onSelectTab: (tab: 'dashboard' | 'tables' | 'kitchen' | 'billing' | 'settings' | 'calculator' | 'reports' | 'waiters' | 'crm' | 'printer-settings' | 'expenses' | 'profile') => void;
  currentTime: string;
  userRole?: 'owner' | 'waiter' | 'kot';
  onLogout?: () => void;
  featureToggles?: FeatureToggles;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentTime,
  userRole,
  onLogout,
  featureToggles
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const allTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home, roles: ['owner'], featureKey: undefined },
    { id: 'settings' as const, label: 'Dish Menu', icon: Settings, roles: ['owner'], featureKey: undefined },
    { id: 'tables' as const, label: 'Billing POS', icon: LayoutGrid, roles: ['owner', 'waiter'], featureKey: 'tables' as keyof FeatureToggles },
    { id: 'kitchen' as const, label: 'Kitchen KOT', icon: ChefHat, roles: ['owner', 'kot'], featureKey: undefined },
    { id: 'billing' as const, label: 'Bills & Ledger', icon: Receipt, roles: ['owner'], featureKey: 'billing' as keyof FeatureToggles },
    { id: 'expenses' as const, label: 'Expense Entry', icon: TrendingDown, roles: ['owner'], featureKey: 'expenses' as keyof FeatureToggles },
    { id: 'waiters' as const, label: 'Staff & Captains', icon: Users, roles: ['owner'], featureKey: 'staffManagement' as keyof FeatureToggles },
    { id: 'crm' as const, label: 'CRM & Customers', icon: Smile, roles: ['owner', 'waiter'], featureKey: 'crm' as keyof FeatureToggles },
    { id: 'calculator' as const, label: 'Cost Calculator', icon: Calculator, roles: ['owner'], featureKey: 'inventory' as keyof FeatureToggles },
    { id: 'reports' as const, label: 'Analytics', icon: BarChart3, roles: ['owner'], featureKey: 'reports' as keyof FeatureToggles },
    { id: 'profile' as const, label: 'Profile & License', icon: User, roles: ['owner', 'waiter', 'kot'], featureKey: undefined },
  ];

  const tabs = allTabs.filter(t => {
    const roleAllowed = !userRole || t.roles.includes(userRole);
    const featureAllowed = !t.featureKey || !featureToggles || featureToggles[t.featureKey] !== false;
    return roleAllowed && featureAllowed;
  });

  return (
    <>
      {/* Horizontal Top Header for Mobile & Tablet viewports */}
      <header id="mobile-top-header" className="flex lg:hidden bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/60 sticky top-0 z-45 h-14 w-full shrink-0 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <img src="/rio_restro_logo.jpg" alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm border border-slate-200/60 dark:border-slate-700/60" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 pulse-ring"></div>
          </div>
          <div>
            <h1 className="font-black tracking-tight text-xs text-slate-900 dark:text-white leading-none">RIO RESTRO</h1>
            <span className="text-[8px] tracking-widest bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent font-mono uppercase font-bold mt-0.5 inline-block">POS & KOT</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Network status */}
          <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/40" title="POS offline persistence active">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-ring"></div>
            <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase hidden sm:inline">LIVE</span>
          </div>

          <button
            id="mobile-menu-toggle-btn"
            type="button"
            onClick={() => {
              soundEffects.playTick();
              setIsOpen(prev => !prev);
            }}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
          >
            {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Sliding Drawer Overlay on Mobile */}
      <AnimatePresence>
        {isOpen && (
          <div id="mobile-navigation-overlay" className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop slide-out */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 h-full p-5 flex flex-col justify-between shadow-2xl border-r border-slate-200/80 dark:border-slate-800/60 z-10 backdrop-blur-2xl"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <img src="/rio_restro_logo.jpg" alt="Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200/60 dark:border-slate-700/60" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></div>
                      </div>
                      <div>
                        <h1 className="font-black tracking-tight text-xs text-slate-900 dark:text-white">RIO RESTRO</h1>
                        <span className="text-[9px] tracking-widest bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent font-mono uppercase font-bold mt-0.5 inline-block">STAFF CONTROL</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Navigation Tabs */}
                  <nav className="my-5 space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = currentTab === tab.id;

                      return (
                        <button
                          id={`drawer-nav-item-${tab.id}`}
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            soundEffects.playTick();
                            onSelectTab(tab.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-sans text-xs font-semibold cursor-pointer select-none group ${
                            isActive 
                              ? 'bg-gradient-to-r from-indigo-50 to-violet-50/50 dark:from-indigo-500/12 dark:to-violet-500/8 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/80 dark:border-indigo-500/15' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                              isActive 
                                ? 'bg-indigo-500/10 dark:bg-indigo-400/15' 
                                : 'bg-slate-100/80 dark:bg-slate-800/40 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30'
                            }`}>
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                            </div>
                            <span>{tab.label}</span>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="space-y-3">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        onLogout();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/30 transition-all duration-200 text-xs font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  )}

                  {/* Clock Widget */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/60 flex items-center space-x-2.5 text-[9px] text-slate-400 font-mono">
                    <div className="w-7 h-7 rounded-lg bg-slate-100/80 dark:bg-slate-800/40 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-500">STATION TIME (UTC)</span>
                      <span className="font-bold text-slate-600 dark:text-slate-400">{currentTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Sidebar for Large Screens (Desktop) */}
      <aside id="pos-admin-sidebar" className="hidden lg:flex bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 flex-col justify-between w-[260px] p-5 h-screen border-r border-slate-200/60 dark:border-slate-800/40 shrink-0 font-sans sticky top-0 backdrop-blur-xl">
        
        {/* Top Brand Logo */}
        <div id="brand-logo-section" className="flex items-center justify-between pb-5 border-b border-slate-200/60 dark:border-slate-800/40 sidebar-accent-line">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <img src="/rio_restro_logo.jpg" alt="Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200/60 dark:border-slate-700/60" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 pulse-ring"></div>
            </div>
            <div>
              <h1 className="font-black tracking-tight text-sm text-slate-900 dark:text-white font-sans leading-none">RIO RESTRO</h1>
              <span className="text-[10px] tracking-widest bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent font-mono uppercase font-bold mt-0.5 inline-block">POS & KOT v1.2</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-100/80 dark:border-emerald-900/30" title="POS offline persistence active">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-ring"></div>
            <span className="text-[7px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">LIVE</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav id="sidebar-navigation-items" className="flex-1 my-4 space-y-0.5 overflow-y-auto pr-1">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <motion.button
                id={`nav-item-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  soundEffects.playTick();
                  onSelectTab(tab.id);
                }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-sans text-xs font-semibold cursor-pointer select-none group ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50/50 dark:from-indigo-500/12 dark:to-violet-500/8 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/80 dark:border-indigo-500/15 sidebar-active-pill' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive 
                      ? 'bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-400' 
                      : 'bg-slate-100/80 dark:bg-slate-800/40 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <span>{tab.label}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active-dot"
                    className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="space-y-3 shrink-0">
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                onLogout();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/15 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-300 border border-rose-200/60 dark:border-rose-900/25 transition-all duration-200 text-xs font-bold cursor-pointer select-none group"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-100/80 dark:bg-rose-900/20 flex items-center justify-center group-hover:bg-rose-200/80 dark:group-hover:bg-rose-900/30 transition-colors">
                <LogOut className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span>Sign Out</span>
            </button>
          )}

          {/* Footer System Time widget */}
          <div id="sidebar-footer-time-info" className="pt-3 border-t border-slate-200/60 dark:border-slate-800/40 flex items-center space-x-2.5 text-[10px] text-slate-400 font-mono">
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 dark:bg-slate-800/40 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 dark:text-slate-500">STATION TIME (UTC)</span>
              <span className="font-bold text-slate-600 dark:text-slate-400">{currentTime}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
