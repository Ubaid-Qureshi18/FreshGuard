import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, scan as scanApi } from '../services/api';
import type { ScanResult, StorageLocation } from '../types';
import toast from 'react-hot-toast';
import {
  Camera, Upload, CheckCircle, AlertTriangle, RotateCcw,
  Save, Video, SwitchCamera, Sparkles, HeartPulse, ShieldAlert,
  Flame, Apple
} from 'lucide-react';
import { CATEGORIES, CATEGORY_EMOJIS, DATE_TYPE_LABELS } from '../utils/freshness';

type Phase = 'capture' | 'scanning' | 'confirm' | 'saving' | 'saved';
type CaptureMode = 'camera' | 'upload';

const STORAGE_LOCATIONS: { key: StorageLocation; label: string; icon: string }[] = [
  { key: 'FRIDGE', label: 'Fridge', icon: '🧊' },
  { key: 'FREEZER', label: 'Freezer', icon: '❄️' },
  { key: 'PANTRY', label: 'Pantry', icon: '🥫' },
  { key: 'COUNTER', label: 'Counter', icon: '🍎' },
];

export default function Scanner() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedResult, setEditedResult] = useState<Partial<ScanResult>>({});
  const [error, setError] = useState('');
  const [confirmTab, setConfirmTab] = useState<'details' | 'nutrition'>('details');

  // Live Camera state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start / Stop camera stream
  const startCamera = async (mode = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCaptureMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (phase === 'capture' && captureMode === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [phase, captureMode, facingMode]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video canvas
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewUrl(dataUrl);
    stopCamera();

    const base64 = dataUrl.split(',')[1];
    analyzeBase64(base64, 'image/jpeg');
  };

  const processFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopCamera();

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    analyzeBase64(base64, file.type || 'image/jpeg');
  };

  const analyzeBase64 = async (base64: string, mimeType: string) => {
    setPhase('scanning');
    setError('');
    try {
      const { data } = await scanApi.analyze(base64, mimeType);
      const res = data as ScanResult;
      setScanResult(res);
      setEditedResult(res);
      setPhase('confirm');
      toast.success('Food label & nutrition extracted! 🥗');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Scan failed. Please adjust lighting or try another photo.');
      setPhase('capture');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) processFile(file);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editedResult?.productName || !editedResult?.listedDate) {
      toast.error('Product name and date are required');
      return;
    }
    setIsSaving(true);
    setPhase('saving');
    try {
      await foodsApi.add({
        name: editedResult.productName,
        category: editedResult.category || 'Other',
        quantity: editedResult.quantity || 1,
        unit: editedResult.unit || 'pack',
        date_type: editedResult.dateType || 'BEST_BEFORE',
        listed_date: editedResult.listedDate,
        storage_location: editedResult.storageLocation || 'FRIDGE',
        nutrition: editedResult.nutrition || null,
        health_score: editedResult.healthScore || null,
        health_tags: editedResult.healthTags || null,
        allergens: editedResult.allergens || null,
        notes: editedResult.notes || null,
      });
      setPhase('saved');
      toast.success('Food saved to pantry! 🌿');
    } catch {
      toast.error('Save failed');
      setPhase('confirm');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPhase('capture');
    setPreviewUrl('');
    setScanResult(null);
    setEditedResult({});
    setError('');
  };

  // ── Phase: Saved ─────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-md shadow-green-600/10">
          <CheckCircle size={36} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1.5">Added to Digital Pantry!</h2>
        <p className="text-gray-500 text-xs mb-8">
          <strong>{editedResult?.productName}</strong> is now monitored with nutritional tracking.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-secondary flex items-center gap-2 text-xs py-2.5 px-4">
            <Camera size={15} /> Scan Another Item
          </button>
          <button onClick={() => navigate('/pantry')} className="btn-primary text-xs py-2.5 px-5">
            View Pantry
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Confirm & Nutrition Inspection ──────────────────
  if (phase === 'confirm' && scanResult) {
    const r = editedResult;
    const nutrition = r.nutrition;
    const lowConf = (scanResult.confidence ?? 1) < 0.7;

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={reset} className="btn-ghost p-1.5"><RotateCcw size={16} /></button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Review Scanned Food</h1>
              <p className="text-xs text-gray-400">AI identified product, expiration date & nutrition</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full">
            ✨ AI Verified
          </span>
        </div>

        {lowConf && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-amber-900 text-xs">Low OCR Confidence ({Math.round((scanResult.confidence || 0) * 100)}%)</div>
              <div className="text-amber-700 text-[11px] mt-0.5">Please double-check product name and listed date below</div>
            </div>
          </div>
        )}

        {/* Tab switch between Details and Nutrition */}
        <div className="flex bg-gray-100/90 p-1 rounded-2xl max-w-xs">
          <button
            onClick={() => setConfirmTab('details')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              confirmTab === 'details' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            📋 Product & Date
          </button>
          <button
            onClick={() => setConfirmTab('nutrition')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              confirmTab === 'nutrition' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
            }`}
          >
            🥗 Nutrition & Macros
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-start">
          {/* Scanned Image Preview */}
          <div className="fresh-card p-3 overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Scanned food packaging" className="rounded-xl object-cover w-full h-48 sm:h-56" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                <Apple size={36} />
              </div>
            )}
            {scanResult.rawDateText && (
              <div className="text-[11px] text-gray-400 mt-2 px-1 text-center font-medium">
                Detected text: <span className="font-mono text-gray-700">"{scanResult.rawDateText}"</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="fresh-card p-5">
            {confirmTab === 'details' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={r.productName || ''}
                    required
                    onChange={e => setEditedResult(p => ({ ...p, productName: e.target.value }))}
                    className="form-input text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Date Type</label>
                    <select
                      value={r.dateType || 'BEST_BEFORE'}
                      onChange={e => setEditedResult(p => ({ ...p, dateType: e.target.value as ScanResult['dateType'] }))}
                      className="form-select text-xs"
                    >
                      {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Listed Date *</label>
                    <input
                      type="date"
                      value={r.listedDate || ''}
                      required
                      onChange={e => setEditedResult(p => ({ ...p, listedDate: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={r.category || 'Other'}
                      onChange={e => setEditedResult(p => ({ ...p, category: e.target.value as ScanResult['category'] }))}
                      className="form-select text-xs"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Storage Place</label>
                    <select
                      value={r.storageLocation || 'FRIDGE'}
                      onChange={e => setEditedResult(p => ({ ...p, storageLocation: e.target.value as StorageLocation }))}
                      className="form-select text-xs"
                    >
                      {STORAGE_LOCATIONS.map(l => (
                        <option key={l.key} value={l.key}>{l.icon} {l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      value={r.quantity || 1}
                      min="0"
                      step="0.1"
                      onChange={e => setEditedResult(p => ({ ...p, quantity: parseFloat(e.target.value) || null }))}
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Unit</label>
                    <select
                      value={r.unit || 'pack'}
                      onChange={e => setEditedResult(p => ({ ...p, unit: e.target.value || null }))}
                      className="form-select text-xs"
                    >
                      {['pack', 'pieces', 'g', 'kg', 'ml', 'L', 'oz', 'box', 'can', 'bottle'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* 🥗 Nutrition Tab */
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <HeartPulse size={15} className="text-red-500" />
                    <span>Nutrition Profile</span>
                  </div>
                  {r.healthScore && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Score: {r.healthScore}/100
                    </span>
                  )}
                </div>

                {/* Macro Grid */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-orange-50/80 p-2 rounded-xl border border-orange-100">
                    <div className="text-orange-900 font-bold text-sm flex items-center justify-center gap-0.5">
                      <Flame size={12} className="text-orange-500" />
                      {nutrition?.calories || 0}
                    </div>
                    <div className="text-[10px] text-orange-700 font-medium">Calories</div>
                  </div>
                  <div className="bg-blue-50/80 p-2 rounded-xl border border-blue-100">
                    <div className="text-blue-900 font-bold text-sm">{nutrition?.protein || 0}g</div>
                    <div className="text-[10px] text-blue-700 font-medium">Protein</div>
                  </div>
                  <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
                    <div className="text-amber-900 font-bold text-sm">{nutrition?.carbs || 0}g</div>
                    <div className="text-[10px] text-amber-700 font-medium">Carbs</div>
                  </div>
                  <div className="bg-rose-50/80 p-2 rounded-xl border border-rose-100">
                    <div className="text-rose-900 font-bold text-sm">{nutrition?.fat || 0}g</div>
                    <div className="text-[10px] text-rose-700 font-medium">Fats</div>
                  </div>
                </div>

                {/* Additional Nutrition Facts */}
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>Dietary Fiber</span>
                    <span className="font-semibold text-gray-800">{nutrition?.fiber || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Natural Sugars</span>
                    <span className="font-semibold text-gray-800">{nutrition?.sugar || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sodium</span>
                    <span className="font-semibold text-gray-800">{nutrition?.sodium || 0}mg</span>
                  </div>
                </div>

                {/* Health Tags */}
                {r.healthTags && r.healthTags.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Highlights</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.healthTags.map((tag, idx) => (
                        <span key={idx} className="bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-green-200">
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens Alert */}
                {r.allergens && r.allergens.length > 0 && (
                  <div className="flex items-start gap-1.5 bg-amber-50/80 text-amber-900 p-2.5 rounded-xl border border-amber-200/70 text-[11px]">
                    <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Allergen Notice:</strong> {r.allergens.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={reset} className="btn-secondary flex-1 text-xs py-3">
            Scan Again
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editedResult.productName || !editedResult.listedDate}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-xs py-3 shadow-md shadow-green-600/20"
          >
            <Save size={15} />
            {isSaving ? 'Adding to Pantry…' : 'Save Food & Nutrition'}
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Live Camera & Scanner Interface ────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Food & Label Camera</h1>
          <p className="text-xs text-gray-500">Live package OCR & nutritional recognition</p>
        </div>
        <button onClick={() => navigate('/add')} className="btn-ghost text-xs font-semibold">
          Manual Entry
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-4 max-w-xs mx-auto">
        <button
          onClick={() => { setCaptureMode('camera'); startCamera(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            captureMode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Video size={14} className="text-green-600" /> Live AI Viewfinder
        </button>
        <button
          onClick={() => { setCaptureMode('upload'); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            captureMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Upload size={14} className="text-green-600" /> Upload Photo
        </button>
      </div>

      {captureMode === 'camera' ? (
        /* ── Live Camera Viewfinder ── */
        <div className="fresh-card p-3 relative overflow-hidden bg-black rounded-3xl">
          <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center">
            {phase === 'scanning' ? (
              <div className="relative flex flex-col items-center justify-center py-12 w-full h-full bg-zinc-900 text-white">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
                <div className="text-emerald-400 font-bold text-sm">Extracting Nutrients & Expiry…</div>
                <div className="text-xs text-zinc-400 mt-1">Analyzing packaging label with Gemini AI</div>
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-lg shadow-emerald-500/50" />
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Overlays */}
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-sm" />
                    <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-sm" />
                  </div>
                  <div className="text-center">
                    <span className="bg-black/60 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                      Align expiration date & label
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-sm" />
                    <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-sm" />
                  </div>
                </div>
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Action Toolbar */}
          {phase === 'capture' && (
            <div className="flex items-center justify-around pt-4 pb-2">
              <button
                onClick={toggleFacingMode}
                className="p-3 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors"
                title="Flip Camera"
              >
                <SwitchCamera size={18} />
              </button>

              {/* Shutter Button */}
              <button
                onClick={captureFrame}
                className="w-16 h-16 rounded-full bg-emerald-500 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-transform"
                title="Capture and Scan"
              >
                <div className="w-13 h-13 rounded-full border-2 border-white bg-emerald-600 flex items-center justify-center text-white">
                  <Camera size={22} />
                </div>
              </button>

              <label className="p-3 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 cursor-pointer transition-colors" title="Upload from gallery">
                <Upload size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}
        </div>
      ) : (
        /* ── File Drag & Drop Mode ── */
        <label
          htmlFor="file-input"
          className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-gray-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/20 cursor-pointer transition-all py-16 px-4 text-center shadow-xs"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {phase === 'scanning' ? (
            <div className="relative flex flex-col items-center justify-center py-6 w-full overflow-hidden">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mb-4" />
              <div className="text-emerald-800 font-bold text-base">Reading label & nutrition…</div>
              <div className="text-xs text-gray-500 mt-1">Gemini Vision AI is extracting data</div>
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse shadow-lg shadow-emerald-500/50" />
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-sm">
                <Upload size={28} />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-base mb-0.5">Upload a photo of packaging</div>
                <div className="text-xs text-gray-400">Click to browse or drag and drop image file</div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-xl">
                Supports JPG, PNG, WEBP, HEIC
              </span>
            </>
          )}
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-900 text-xs">Scan failed</div>
            <div className="text-red-700 text-[11px] mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Camera Guidance Box */}
      <div className="mt-5 bg-gray-50/80 rounded-2xl p-4 border border-gray-100 text-xs text-gray-600 space-y-1.5">
        <div className="font-bold text-gray-800 flex items-center gap-1.5">
          <Sparkles size={13} className="text-emerald-600" /> AI Camera Recognition Tips:
        </div>
        <ul className="list-disc pl-4 text-gray-500 space-y-0.5">
          <li>Hold camera ~15cm from label for crisp barcode and date resolution</li>
          <li>Point directly at the <strong>Best Before</strong> or <strong>Nutrition Facts</strong> table</li>
          <li>AI will automatically extract calories, macros, and estimated shelf-life</li>
        </ul>
      </div>
    </div>
  );
}
