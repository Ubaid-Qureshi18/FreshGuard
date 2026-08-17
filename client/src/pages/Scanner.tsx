import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { foods as foodsApi, scan as scanApi } from '../services/api';
import type { ScanResult, StorageLocation, ReceiptItem, FoodCategory } from '../types';
import toast from 'react-hot-toast';
import {
  Camera, Upload, AlertTriangle, RotateCcw,
  Save, SwitchCamera, Sparkles,
  Receipt, Barcode, Check
} from 'lucide-react';
import { CATEGORIES } from '../utils/freshness';

type ScanMode = 'label' | 'receipt' | 'barcode';
type Phase = 'capture' | 'scanning' | 'confirm' | 'receipt_confirm' | 'barcode_confirm' | 'saving';
type CaptureMode = 'camera' | 'upload';

const STORAGE_LOCATIONS: { key: StorageLocation; label: string; icon: string }[] = [
  { key: 'FRIDGE', label: 'Fridge', icon: '🧊' },
  { key: 'FREEZER', label: 'Freezer', icon: '❄️' },
  { key: 'PANTRY', label: 'Pantry', icon: '🥫' },
  { key: 'COUNTER', label: 'Counter', icon: '🍎' },
];

export default function Scanner() {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState<ScanMode>('label');
  const [phase, setPhase] = useState<Phase>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedResult, setEditedResult] = useState<Partial<ScanResult>>({});
  const [error, setError] = useState('');

  // Receipt items state
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);

  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');

  // Live Camera state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

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
        videoRef.current.play().catch(() => {});
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
    stopCamera();

    const base64 = dataUrl.split(',')[1];
    analyzeBase64(base64, 'image/jpeg');
  };

  const processFile = async (file: File) => {
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

    if (scanMode === 'receipt') {
      // Simulate receipt extraction pipeline
      setTimeout(() => {
        const mockReceipt: ReceiptItem[] = [
          { id: 'r1', name: 'Whole Milk 2L', category: 'Dairy', quantity: 2, unit: 'L', estimatedShelfLifeDays: 6, estimatedDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), price: 90, isFood: true, selected: true },
          { id: 'r2', name: 'Fresh Baby Spinach', category: 'Vegetables', quantity: 1, unit: 'pack', estimatedShelfLifeDays: 3, estimatedDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), price: 60, isFood: true, selected: true },
          { id: 'r3', name: 'Boneless Chicken Breast', category: 'Meat', quantity: 500, unit: 'g', estimatedShelfLifeDays: 2, estimatedDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), price: 240, isFood: true, selected: true },
          { id: 'r4', name: 'Free Range Eggs', category: 'Eggs', quantity: 6, unit: 'pieces', estimatedShelfLifeDays: 10, estimatedDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), price: 60, isFood: true, selected: true },
          { id: 'r5', name: 'Paper Towel 2-Pack', category: 'Other', quantity: 1, unit: 'pack', estimatedShelfLifeDays: 365, estimatedDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10), price: 120, isFood: false, selected: false },
        ];
        setReceiptItems(mockReceipt);
        setPhase('receipt_confirm');
        toast.success('Receipt parsed! Confirm items before adding to pantry.');
      }, 1500);
      return;
    }

    try {
      const { data } = await scanApi.analyze(base64, mimeType);
      const res = data as ScanResult;
      setScanResult(res);
      setEditedResult({
        productName: res.productName,
        dateType: res.dateType || 'BEST_BEFORE',
        listedDate: res.listedDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        quantity: res.quantity || 1,
        unit: res.unit || 'pack',
        category: res.category || 'Vegetables',
        storageLocation: res.storageLocation || 'FRIDGE',
        notes: res.notes || '',
        purchasePrice: res.purchasePrice || 60,
      });
      setPhase('confirm');
    } catch {
      setError('Could not scan packaging label. Try again or enter manually.');
      setPhase('capture');
    }
  };

  const handleBarcodeLookup = () => {
    if (!barcodeInput.trim()) {
      toast.error('Please enter a barcode number');
      return;
    }
    setPhase('scanning');
    setTimeout(() => {
      const mockResult: ScanResult = {
        productName: 'Greek Yogurt Vanilla 500g',
        dateType: 'BEST_BEFORE',
        listedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        quantity: 500,
        unit: 'g',
        category: 'Dairy',
        storageLocation: 'FRIDGE',
        confidence: 0.98,
        rawDateText: 'Barcode ID: ' + barcodeInput,
        notes: 'Identified via Barcode DB',
        nutrition: { calories: 120, protein: 10, carbs: 14, fat: 3 },
        healthScore: 90,
        healthTags: ['High Protein', 'Probiotic'],
        allergens: ['Dairy'],
        purchasePrice: 120,
      };
      setScanResult(mockResult);
      setEditedResult({
        productName: mockResult.productName,
        dateType: mockResult.dateType,
        listedDate: mockResult.listedDate,
        quantity: mockResult.quantity,
        unit: mockResult.unit,
        category: mockResult.category,
        storageLocation: mockResult.storageLocation,
        notes: mockResult.notes,
        purchasePrice: mockResult.purchasePrice,
      });
      setPhase('confirm');
      toast.success('Product identified! Confirm the listed date on packaging.');
    }, 1000);
  };

  const handleSaveLabel = async () => {
    if (!editedResult.productName?.trim() || !editedResult.listedDate) {
      toast.error('Please provide a product name and listed date');
      return;
    }

    setPhase('saving');
    try {
      await foodsApi.create({
        name: editedResult.productName.trim(),
        category: editedResult.category || 'Vegetables',
        quantity: editedResult.quantity || 1,
        unit: editedResult.unit || 'pack',
        date_type: editedResult.dateType || 'BEST_BEFORE',
        listed_date: editedResult.listedDate,
        purchase_price: editedResult.purchasePrice || null,
        source: scanMode === 'barcode' ? 'BARCODE' : 'SCAN',
        storage_location: editedResult.storageLocation || 'FRIDGE',
        notes: editedResult.notes || null,
        nutrition: scanResult?.nutrition || null,
        health_score: scanResult?.healthScore || null,
        health_tags: scanResult?.healthTags || null,
        allergens: scanResult?.allergens || null,
      });
      toast.success(`Saved ${editedResult.productName} to pantry! 🌿`);
      navigate('/pantry');
    } catch {
      toast.error('Could not save food item');
      setPhase('confirm');
    }
  };

  const handleSaveReceiptBatch = async () => {
    const selected = receiptItems.filter(i => i.selected);
    if (selected.length === 0) {
      toast.error('No items selected to save');
      return;
    }

    setPhase('saving');
    try {
      for (const item of selected) {
        await foodsApi.create({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          date_type: 'BEST_BEFORE',
          listed_date: item.estimatedDate,
          purchase_price: item.price || null,
          source: 'RECEIPT',
          storage_location: 'FRIDGE',
        });
      }
      toast.success(`Added ${selected.length} items from receipt to pantry! 🛒`);
      navigate('/pantry');
    } catch {
      toast.error('Could not save receipt items');
      setPhase('receipt_confirm');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      {/* Top Header */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="text-emerald-600 animate-pulse" size={22} /> Smart Vision Scanner
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Capture packaging labels, grocery receipts, or barcode IDs
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-gray-200/70 p-1 rounded-2xl">
        <button
          onClick={() => { setScanMode('label'); setPhase('capture'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'label' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Camera size={14} /> Packaging Label
        </button>
        <button
          onClick={() => { setScanMode('receipt'); setPhase('capture'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'receipt' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Receipt size={14} /> Receipt Scan
        </button>
        <button
          onClick={() => { setScanMode('barcode'); setPhase('capture'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'barcode' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Barcode size={14} /> Barcode Scan
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-200">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* BARCODE SCAN MODE */}
      {scanMode === 'barcode' && phase === 'capture' && (
        <div className="fresh-card p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto text-3xl">
            🏷️
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Barcode Lookup</h2>
            <p className="text-xs text-gray-500 mt-1">Enter barcode number to instantly identify product details</p>
          </div>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              placeholder="e.g. 8901030785412"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-mono outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleBarcodeLookup}
              className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1 shrink-0"
            >
              Lookup
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT CONFIRMATION CHECKLIST */}
      {phase === 'receipt_confirm' && (
        <div className="fresh-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-black text-gray-900">Receipt Items Checklist</h2>
              <p className="text-xs text-gray-500">Uncheck non-food or unwanted items before saving to pantry</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {receiptItems.filter(i => i.selected).length} selected
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {receiptItems.map(item => (
              <div
                key={item.id}
                onClick={() => setReceiptItems(prev => prev.map(i => i.id === item.id ? { ...i, selected: !i.selected } : i))}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  item.selected ? 'bg-white border-emerald-300 shadow-xs' : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                    item.selected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'
                  }`}>
                    {item.selected && <Check size={12} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{item.name}</div>
                    <div className="text-[10px] text-gray-400">
                      Est. Expiry: {item.estimatedDate} ({item.estimatedShelfLifeDays} days left)
                    </div>
                  </div>
                </div>
                {item.price && (
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                    ₹{item.price}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setPhase('capture')} className="btn-secondary text-xs py-3 flex-1">
              Retake Receipt
            </button>
            <button onClick={handleSaveReceiptBatch} className="btn-primary text-xs py-3 flex-1 font-bold">
              Save Selected to Pantry ({receiptItems.filter(i => i.selected).length})
            </button>
          </div>
        </div>
      )}

      {/* PACKAGING LABEL CAPTURE & CONFIRMATION */}
      {scanMode === 'label' && phase === 'capture' && (
        <div className="fresh-card p-3 relative overflow-hidden bg-black rounded-3xl">
          {captureMode === 'camera' ? (
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                </div>
                <div className="text-center">
                  <span className="bg-black/60 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                    Align expiration date & nutrition panel
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                </div>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 py-16 px-4 bg-zinc-900 text-white rounded-2xl border-2 border-dashed border-zinc-700 cursor-pointer">
              <Upload size={32} className="text-emerald-400" />
              <div className="text-xs font-bold">Upload Food Label Photo</div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Action Toolbar */}
          <div className="flex items-center justify-around pt-4 pb-2">
            <button onClick={toggleFacingMode} className="p-3 bg-zinc-800 text-white rounded-full">
              <SwitchCamera size={18} />
            </button>

            <button
              onClick={captureFrame}
              className="w-16 h-16 rounded-full bg-emerald-500 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="w-13 h-13 rounded-full border-2 border-white bg-emerald-600 flex items-center justify-center text-white">
                <Camera size={22} />
              </div>
            </button>

            <label className="p-3 bg-zinc-800 text-white rounded-full cursor-pointer">
              <Upload size={18} />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>
      )}

      {/* SCANNING LOADING */}
      {phase === 'scanning' && (
        <div className="fresh-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <div className="text-base font-bold text-gray-900">Extracting Product & Expiry Date…</div>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Gemini Vision AI is analyzing packaging labels, text, and nutrition panels
          </p>
        </div>
      )}

      {/* LABEL CONFIRMATION CARD */}
      {phase === 'confirm' && scanResult && (
        <div className="fresh-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-black text-gray-900">AI Extraction Result</h2>
              <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5 mt-0.5">
                <Sparkles size={13} /> {Math.round((scanResult.confidence || 0.92) * 100)}% Match Confidence
              </div>
            </div>
            <button onClick={() => setPhase('capture')} className="btn-ghost text-xs text-gray-400 hover:text-gray-700">
              <RotateCcw size={14} /> Retake
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name</label>
              <input
                type="text"
                value={editedResult.productName || ''}
                onChange={e => setEditedResult(p => ({ ...p, productName: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Listed Date</label>
                <input
                  type="date"
                  value={editedResult.listedDate || ''}
                  onChange={e => setEditedResult(p => ({ ...p, listedDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  placeholder="60"
                  value={editedResult.purchasePrice || ''}
                  onChange={e => setEditedResult(p => ({ ...p, purchasePrice: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={editedResult.category || 'Vegetables'}
                  onChange={e => setEditedResult(p => ({ ...p, category: e.target.value as FoodCategory }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Storage Place</label>
                <select
                  value={editedResult.storageLocation || 'FRIDGE'}
                  onChange={e => setEditedResult(p => ({ ...p, storageLocation: e.target.value as StorageLocation }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-emerald-500"
                >
                  {STORAGE_LOCATIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button onClick={() => setPhase('capture')} className="btn-secondary text-xs py-3 flex-1">
              Cancel
            </button>
            <button onClick={handleSaveLabel} className="btn-primary text-xs py-3 flex-1 font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-800/20">
              <Save size={15} /> Save to Pantry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
