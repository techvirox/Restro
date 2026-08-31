import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Key, 
  Calendar, 
  Smartphone, 
  Building, 
  Award, 
  CheckCircle2, 
  AlertOctagon,
  MapPin,
  Mail,
  Phone,
  Save,
  X,
  Edit3,
  Printer,
  Bluetooth,
  Usb,
  Check,
  MessageSquare,
  HelpCircle,
  Send,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { isBluetoothConnected, connectBluetoothPrinterSession } from '../utils/printUtility';
import { SupportTicket } from '../types';

interface ProfileViewProps {
  currentUser: {
    id: string | number;
    name: string;
    phone: string;
    role: 'owner' | 'waiter' | 'kot';
    tenantId: string | number;
    email?: string;
    isDemo?: boolean;
    tenant?: {
      clinicName: string;
      deviceId: string;
      expiryDate: string;
      isValid: boolean;
      daysRemaining: number;
      address?: string;
      gstin?: string;
      contactNumber?: string;
      foodLicenseNo?: string;
      profilePic?: string;
    };
  } | null;
  onProfileUpdate: (updatedUser: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onProfileUpdate }) => {
  if (!currentUser) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editClinicName, setEditClinicName] = useState(currentUser.tenant?.clinicName || '');
  const [editAddress, setEditAddress] = useState(currentUser.tenant?.address || '');
  const [editContactNumber, setEditContactNumber] = useState(currentUser.tenant?.contactNumber || currentUser.phone || '');
  const [editGstin, setEditGstin] = useState(currentUser.tenant?.gstin || '');
  const [editFoodLicenseNo, setEditFoodLicenseNo] = useState(currentUser.tenant?.foodLicenseNo || '');
  const [editProfilePic, setEditProfilePic] = useState(currentUser.tenant?.profilePic || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Printer Settings State inside Profile
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('bitespeed_print_paper_size') as '80mm' | '58mm') || '58mm';
  });
  const [printerDriver, setPrinterDriver] = useState<'system' | 'bluetooth' | 'usb'>(() => {
    return (localStorage.getItem('bitespeed_printer_driver') as any) || 'system';
  });
  const [btConnected, setBtConnected] = useState(false);
  const [btConnecting, setBtConnecting] = useState(false);

  // Support & Complaint Desk State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketCategory, setTicketCategory] = useState<SupportTicket['type']>('problem');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPhone, setTicketPhone] = useState(currentUser.phone || '');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchTickets = async () => {
    try {
      const data = await api.getSupportTickets();
      if (data) {
        setSupportTickets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setBtConnected(isBluetoothConnected());
    fetchTickets();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDescription.trim()) return;

    setSubmittingTicket(true);
    setTicketMsg(null);

    try {
      const res = await api.createSupportTicket({
        userName: currentUser.name,
        userEmail: currentUser.email,
        userPhone: ticketPhone.trim(),
        type: ticketCategory,
        description: ticketDescription.trim()
      });

      if (res.success) {
        setTicketMsg({ text: 'Support complaint submitted successfully!', type: 'success' });
        setTicketDescription('');
        fetchTickets();
      } else {
        setTicketMsg({ text: res.error || 'Failed to submit complaint.', type: 'error' });
      }
    } catch (err: any) {
      setTicketMsg({ text: 'Error submitting support ticket.', type: 'error' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleConnectBluetoothSession = async () => {
    setBtConnecting(true);
    const ok = await connectBluetoothPrinterSession();
    setBtConnecting(false);
    if (ok) {
      setBtConnected(true);
      setPrinterDriver('bluetooth');
      localStorage.setItem('bitespeed_printer_driver', 'bluetooth');
    } else {
      setBtConnected(false);
      alert('Could not establish Bluetooth printer connection. Please ensure Bluetooth is enabled.');
    }
  };

  const handleSavePrinterSettings = (newWidth: '80mm' | '58mm', newDriver: 'system' | 'bluetooth' | 'usb') => {
    setPaperWidth(newWidth);
    setPrinterDriver(newDriver);
    localStorage.setItem('bitespeed_print_paper_size', newWidth);
    localStorage.setItem('bitespeed_printer_driver', newDriver);
  };

  const startEditing = () => {
    setEditName(currentUser.name);
    setEditEmail(currentUser.email || '');
    setEditClinicName(currentUser.tenant?.clinicName || '');
    setEditAddress(currentUser.tenant?.address || '');
    setEditContactNumber(currentUser.tenant?.contactNumber || currentUser.phone || '');
    setEditGstin(currentUser.tenant?.gstin || '');
    setEditFoodLicenseNo(currentUser.tenant?.foodLicenseNo || '');
    setEditProfilePic(currentUser.tenant?.profilePic || '');
    setError('');
    setSuccess('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editName || !editClinicName) {
      setError('Owner Name and Restaurant Name are required.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = {
        ...currentUser,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editContactNumber.trim() || currentUser.phone,
        tenant: {
          ...currentUser.tenant,
          clinicName: editClinicName.trim(),
          address: editAddress.trim(),
          contactNumber: editContactNumber.trim(),
          gstin: editGstin.trim(),
          foodLicenseNo: editFoodLicenseNo.trim(),
          profilePic: editProfilePic,
        }
      };

      localStorage.setItem('rio_restro_current_user', JSON.stringify(updatedUser));
      localStorage.setItem('bitespeed_printer_title', editClinicName.trim());
      localStorage.setItem('bitespeed_printer_address', editAddress.trim());
      localStorage.setItem('bitespeed_printer_contact', editContactNumber.trim());
      localStorage.setItem('bitespeed_printer_gstin', editGstin.trim());
      localStorage.setItem('bitespeed_printer_food_license_no', editFoodLicenseNo.trim());
      localStorage.setItem('bitespeed_printer_profile_pic', editProfilePic);

      if (!currentUser.isDemo) {
        try {
          await api.updateProfile({
            userId: currentUser.id,
            name: editName.trim(),
            email: editEmail.trim(),
            restaurantName: editClinicName.trim(),
            address: editAddress.trim(),
            contactNumber: editContactNumber.trim(),
            gstin: editGstin.trim(),
            foodLicenseNo: editFoodLicenseNo.trim(),
            profilePic: editProfilePic,
          });
        } catch (apiErr: any) {
          console.warn('Backend database sync notice:', apiErr);
        }
      }

      onProfileUpdate(updatedUser);
      setSuccess('Profile & Bill Header settings updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
      case 'waiter':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'kot':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Restaurant Owner';
      case 'waiter': return 'Floor Waitstaff';
      case 'kot': return 'Kitchen Captain';
      default: return role;
    }
  };

  const isDemo = currentUser.isDemo;
  const tenant = currentUser.tenant;
  const daysRemaining = tenant?.daysRemaining ?? 0;
  const isLicenseActive = tenant?.isValid && daysRemaining > 0;

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 select-text font-sans">
        <div className="bg-[#1a1c23]/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Edit Restaurant Profile
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-955 border border-rose-800/40 text-rose-350 text-xs rounded-xl font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-indigo-950/20 border border-slate-800/55 p-4.5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">
                Owner Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Owner Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-sans"
                    />
                    <User className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="owner@restaurant.com"
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-sans"
                    />
                    <Mail className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-violet-955 border border-slate-800/55 p-4.5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest block">
                Restaurant Info (Thermal Bill Branding)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Restaurant Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editClinicName}
                      onChange={(e) => setEditClinicName(e.target.value)}
                      placeholder="e.g. Rio Restro Bar"
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-sans"
                    />
                    <Building className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Restaurant Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. Sector V, Salt Lake City"
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-sans"
                    />
                    <MapPin className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Contact Phone</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editContactNumber}
                      onChange={(e) => setEditContactNumber(e.target.value)}
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-mono"
                    />
                    <Phone className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">GSTIN Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editGstin}
                      onChange={(e) => setEditGstin(e.target.value)}
                      placeholder="e.g. 27AAAAA1111A1Z0"
                      className="w-full text-sm border border-slate-800 rounded-xl py-3 pl-10 pr-3 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-mono"
                    />
                    <Smartphone className="absolute left-3.5 top-4 h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800/60">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm uppercase py-3.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
              >
                {loading ? 'Saving Changes...' : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm uppercase py-3.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 select-text font-sans animate-fadeIn">
      
      {/* 1. Header Information Panel */}
      <div className="bg-[#1a1c23]/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
        {currentUser.role === 'owner' && (
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={startEditing}
              className="bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-500/30 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {tenant?.profilePic ? (
            <div className="w-24 h-24 rounded-2xl border border-slate-800 bg-slate-950 p-2 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
              <img src={tenant.profilePic} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-500/20 shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl font-black tracking-tight text-white">{currentUser.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider self-center ${getRoleBadgeColor(currentUser.role)}`}>
                {getRoleLabel(currentUser.role)}
              </span>
            </div>
            
            {success && (
              <div className="p-3 bg-emerald-955/30 border border-emerald-800/40 text-emerald-450 text-xs rounded-xl font-semibold leading-relaxed max-w-md mx-auto md:mx-0">
                {success}
              </div>
            )}
 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-400 font-medium pt-1 max-w-2xl">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Owner Phone: {currentUser.phone}</span>
              </div>
              {currentUser.email && (
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Email: {currentUser.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Embedded Printer Configuration Card */}
      <div className="bg-[#1a1c23]/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 backdrop-blur-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Printer className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Thermal Printer Configuration</h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
            1-Click Direct Print Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Mode Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Printer Output Stream</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSavePrinterSettings(paperWidth, 'bluetooth')}
                className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  printerDriver === 'bluetooth'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span>Bluetooth</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePrinterSettings(paperWidth, 'usb')}
                className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  printerDriver === 'usb'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <Usb className="w-4 h-4" />
                <span>USB Direct</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePrinterSettings(paperWidth, 'system')}
                className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  printerDriver === 'system'
                    ? 'bg-slate-700 text-white border-slate-600 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>System Dialog</span>
              </button>
            </div>
          </div>

          {/* Paper Roll Width */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Paper Roll Width</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSavePrinterSettings('58mm', printerDriver)}
                className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>58 mm Roll (Compact)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePrinterSettings('80mm', printerDriver)}
                className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>80 mm Roll (Standard)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Persistent Session Bluetooth Connector */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center space-x-2 justify-center sm:justify-start">
              <span className="text-xs font-bold text-white">Daily Session Connection Status:</span>
              {btConnected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Connect once per day/session. Pressing Print will send receipt directly without asking again!
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnectBluetoothSession}
            disabled={btConnecting}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shrink-0 disabled:opacity-50"
          >
            {btConnecting ? 'Connecting...' : 'Connect Bluetooth Printer'}
          </button>
        </div>

        {/* Support & Complaints Desk Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-800 dark:text-white">
                Support & Help Desk Complaints
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit complaints, software queries, or license issues directly to system admin
              </p>
            </div>
          </div>

          {ticketMsg && (
            <div className={`p-4 rounded-xl text-xs font-bold ${ticketMsg.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-rose-950/40 text-rose-300 border border-rose-800'}`}>
              {ticketMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category / Topic *</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-semibold outline-none"
                >
                  <option value="problem">Problem / Operational Support</option>
                  <option value="bug">Software Bug Report</option>
                  <option value="printer_problem">Thermal Printer Issue</option>
                  <option value="payment_problem">Billing & Payment Query</option>
                  <option value="subscription_problem">Subscription & Expiration Issue</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={ticketPhone}
                  onChange={(e) => setTicketPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono font-semibold outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detailed Complaint / Query *</label>
              <textarea
                required
                rows={3}
                placeholder="Explain the complaint or issue in detail..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-semibold outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingTicket}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer border-none shadow-md disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submittingTicket ? 'Submitting...' : 'Submit Complaint to Admin'}</span>
            </button>
          </form>

          {/* Ticket History */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Your Support Complaints History ({supportTickets.length})
            </h4>

            {supportTickets.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">No support complaints filed yet.</p>
            ) : (
              <div className="space-y-3">
                {supportTickets.map(t => (
                  <div key={t.id} className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800 dark:text-white uppercase">{t.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{t.description}</p>
                    {t.adminReply && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-xs">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px] uppercase block">Admin Reply:</span>
                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{t.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
