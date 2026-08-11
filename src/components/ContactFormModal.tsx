import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Tag, FileText, X, Check, AlertCircle } from 'lucide-react';
import { Contact, ContactFormData } from '../types';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ContactFormData) => void;
  initialData?: Contact | null;
  existingPlaces: string[];
}

const POPULAR_PLACES = [
  'San Francisco, CA',
  'New York, NY',
  'London, UK',
  'Tokyo, Japan',
  'Paris, France',
  'Berlin, Germany',
  'Sydney, Australia',
];

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  existingPlaces,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [tag, setTag] = useState<'Personal' | 'Work' | 'Family' | 'VIP' | 'Other'>('Personal');
  const [notes, setNotes] = useState('');
  
  const [errors, setErrors] = useState<{ name?: string; phone?: string; place?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean; place?: boolean }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setPlace(initialData.place);
      setTag(initialData.tag || 'Personal');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setPhone('');
      setPlace('');
      setTag('Personal');
      setNotes('');
    }
    setErrors({});
    setTouched({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { name?: string; phone?: string; place?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Contact name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name should be at least 2 characters';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\+\-\(\)\.]{7,20}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!place.trim()) {
      newErrors.place = 'Place / Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, place: true });
    if (validate()) {
      onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        place: place.trim(),
        tag,
        notes: notes.trim(),
      });
      onClose();
    }
  };

  // Quick place selector suggestions
  const suggestedPlaces = Array.from(
    new Set([...existingPlaces, ...POPULAR_PLACES])
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {initialData ? 'Edit Contact' : 'Create New Contact'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {initialData ? 'Update contact details below' : 'Add name, phone number, and location details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) validate();
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder="e.g. Alex Morgan"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.name && touched.name
                    ? 'border-rose-300 focus:ring-rose-500/20 dark:border-rose-800'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.name && touched.name && (
              <p className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Phone Number Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (touched.phone) validate();
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="e.g. +1 (555) 019-2834"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.phone && touched.phone
                    ? 'border-rose-300 focus:ring-rose-500/20 dark:border-rose-800'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.phone && touched.phone && (
              <p className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Place / Location Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Place / Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  if (touched.place) validate();
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, place: true }))}
                placeholder="e.g. Chicago, IL or Paris, France"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.place && touched.place
                    ? 'border-rose-300 focus:ring-rose-500/20 dark:border-rose-800'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.place && touched.place && (
              <p className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.place}
              </p>
            )}

            {/* Quick Location Pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Quick pick:</span>
              {suggestedPlaces.map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => {
                    setPlace(suggested);
                    setErrors((prev) => ({ ...prev, place: undefined }));
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                    place === suggested
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {suggested}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tag Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Personal', 'Work', 'Family', 'VIP', 'Other'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tag === t
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes / Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add job title, relationship, or reference details..."
                rows={2}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              {initialData ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
