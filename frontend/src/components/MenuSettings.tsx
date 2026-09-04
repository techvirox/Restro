import React, { useState, useRef, useMemo } from 'react';
import { MenuItem } from '../types';
import { Plus, Edit2, Check, Trash2, X, AlertOctagon, HelpCircle, UtensilsCrossed, RefreshCw, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { soundEffects } from './SoundUtility';

interface MenuSettingsProps {
  menu: MenuItem[];
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onResetMenu: () => void;
}

export const MenuSettings: React.FC<MenuSettingsProps> = ({
  menu,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onResetMenu
}) => {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Starters');
  const [price, setPrice] = useState(100);
  const [type, setType] = useState<'veg' | 'non-veg' | 'egg'>('veg');
  const [code, setCode] = useState('');
  const [available, setAvailable] = useState(true);
  const [gstRate, setGstRate] = useState<number>(5);
  const [image, setImage] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number>(15);

  // Drag and drop / file reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('bitespeed_custom_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Spreadsheet / Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDragActive, setImportDragActive] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreviewList, setImportPreviewList] = useState<Omit<MenuItem, 'id'>[]>([]);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(true);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setImportDragActive(true);
    } else if (e.type === 'dragleave') {
      setImportDragActive(false);
    }
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseImportFile(e.target.files[0]);
    }
  };

  const parseImportFile = (file: File) => {
    setImportError(null);
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportError('Please upload a valid spreadsheet file (CSV, TXT, or Excel-formatted CSV).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (!text) {
          setImportError('File is empty or could not be read.');
          return;
        }

        const rows: string[][] = [];
        const lines = text.split(/\r?\n/);
        
        for (let r = 0; r < lines.length; r++) {
          const line = lines[r];
          if (!line.trim()) continue;
          
          const columns: string[] = [];
          let currentField = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              columns.push(currentField.trim());
              currentField = '';
            } else {
              currentField += char;
            }
          }
          columns.push(currentField.trim());
          rows.push(columns);
        }

        if (rows.length < 2) {
          setImportError('The provided CSV must contain a header row and at least one dish row.');
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        
        let nameIdx = headers.findIndex(h => h.includes('name') || h.includes('dish') || h.includes('title') || h.includes('item'));
        let codeIdx = headers.findIndex(h => h.includes('code') || h.includes('sku') || h.includes('id') || h.includes('key') || h.includes('fastcode'));
        let priceIdx = headers.findIndex(h => h.includes('price') || h.includes('rate') || h.includes('cost') || h.includes('amt'));
        let categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('group') || (h.includes('type') && !h.includes('dish') && !h.includes('veg')));
        let typeIdx = headers.findIndex(h => h.includes('dishtype') || h.includes('vegtype') || h.includes('type') && h !== 'category');
        let gstIdx = headers.findIndex(h => h.includes('gst') || h.includes('tax') || h.includes('vat'));
        let stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('inv'));
        let availIdx = headers.findIndex(h => h.includes('avail') || h.includes('active') || h.includes('stock'));

        // Fallbacks if columns aren't matching
        if (nameIdx === -1) {
          nameIdx = 0;
          codeIdx = 1;
          priceIdx = 2;
          categoryIdx = 3;
          typeIdx = 4;
          gstIdx = 5;
          stockIdx = 6;
          availIdx = 7;
        }

        const parsedItems: Omit<MenuItem, 'id'>[] = [];

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue;

          const rawName = indexVal(nameIdx, row);
          const rawCode = indexVal(codeIdx, row);
          const rawPrice = indexVal(priceIdx, row);
          const rawCategory = indexVal(categoryIdx, row);
          const rawType = indexVal(typeIdx, row);
          const rawGst = indexVal(gstIdx, row);
          const rawStock = indexVal(stockIdx, row);
          const rawAvail = indexVal(availIdx, row);

          if (!rawName) continue; // Skip if empty name

          const cleanName = rawName.replace(/^["']|["']$/g, '').trim();
          const cleanCode = (rawCode ? rawCode.replace(/^["']|["']$/g, '').trim() : rawName.substring(0, 3)).toUpperCase();
          const cleanCategory = rawCategory ? rawCategory.replace(/^["']|["']$/g, '').trim() : 'Mains';
          
          let cleanType: 'veg' | 'non-veg' | 'egg' = 'veg';
          const tLower = rawType.toLowerCase().trim();
          if (tLower.includes('non') || tLower.includes('red')) cleanType = 'non-veg';
          else if (tLower.includes('egg') || tLower.includes('yellow')) cleanType = 'egg';

          const parsedPrice = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 100;
          const parsedGst = parseFloat(rawGst.replace(/[^\d.]/g, '')) ?? 5;
          const parsedStock = parseInt(rawStock.replace(/\D/g, ''), 10) ?? 15;
          
          let cleanAvail = true;
          const aLower = rawAvail.toLowerCase().trim();
          if (aLower === 'false' || aLower === 'no' || aLower === '0' || aLower === 'n') {
            cleanAvail = false;
          }

          parsedItems.push({
            name: cleanName,
            code: cleanCode,
            category: cleanCategory,
            price: parsedPrice,
            type: cleanType,
            available: cleanAvail,
            gstRate: parsedGst,
            stockQuantity: parsedStock
          });
        }

        if (parsedItems.length === 0) {
          setImportError('No valid dish records could be read. Make sure "Dish Name" is populated.');
          return;
        }

        soundEffects.playSuccessChime();
        setImportPreviewList(parsedItems);
      } catch (err) {
        console.error('Error parsing uploaded spreadsheet', err);
        setImportError('An error occurred during sheet extraction. Check your file format.');
      }
    };
    reader.readAsText(file);
  };

  const indexVal = (index: number, row: string[]): string => {
    return index !== -1 && index < row.length ? row[index].trim() : '';
  };

  const handleCommitImport = () => {
    if (importPreviewList.length === 0) return;

    soundEffects.playSuccessChime();
    
    // Loop through preview list and either overwrite or skip
    importPreviewList.forEach((importedItem, index) => {
      // check if exist by code or name
      const existingIdx = menu.findIndex(m => m.code === importedItem.code || m.name.toLowerCase() === importedItem.name.toLowerCase());
      
      if (existingIdx !== -1) {
        if (overwriteDuplicates) {
          // Update item
          const payload: MenuItem = {
            ...menu[existingIdx],
            ...importedItem,
            id: menu[existingIdx].id // Keep the old ID
          };
          onUpdateMenuItem(payload);
        }
        // skip if not overwriteDuplicates
      } else {
        // Add as a new item with uniquely staggered timestamp ID to prevent collision
        const payload: MenuItem = {
          ...importedItem,
          id: `m-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`
        };
        onAddMenuItem(payload);
      }
    });

    // Clear and close
    setImportPreviewList([]);
    setShowImportModal(false);
  };

  const downloadSampleTemplate = () => {
    soundEffects.playTick();
    const headers = "Dish Name,Fast-Code,Price,Category,Dish Type,Tax Rate %,Stock Qty,Available\n";
    const sampleRows = [
      'Crispy Honey Chilli Potato,CCP,240,Starters,veg,5,25,true',
      'Butter Chicken,BC,380,Mains,non-veg,5,15,true',
      'Chocolate Lava Cake,CLC,150,Desserts,veg,18,10,true',
      'Fresh Lime Soda,FLS,90,Beverages,veg,12,40,true',
      'Egg Curry,EC,220,Mains,egg,5,12,false'
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bitespeed_dish_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamically combine default, custom stored, and actual categories inside menu
  const categories = useMemo(() => {
    const defaultCats = ['Starters', 'Mains', 'Desserts', 'Beverages'];
    const fromMenu = menu.map(item => item.category);
    return Array.from(new Set([...defaultCats, ...customCategories, ...fromMenu]));
  }, [menu, customCategories]);

  const foodPresets = [
    { label: 'Spring Roll', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=60' },
    { label: 'Tikka/Curry', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=150&auto=format&fit=crop&q=60' },
    { label: 'Momos/Appetizer', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=150&auto=format&fit=crop&q=60' },
    { label: 'Biryani/Mains', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&auto=format&fit=crop&q=60' },
    { label: 'Beverage/Mojito', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=150&auto=format&fit=crop&q=60' },
    { label: 'Brownie/Icecream', url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=150&auto=format&fit=crop&q=60' },
  ];

  const clearForm = () => {
    setName('');
    setCategory('Starters');
    setPrice(100);
    setType('veg');
    setCode('');
    setAvailable(true);
    setGstRate(5);
    setImage('');
    setStockQuantity(15);
    setIsAdding(false);
    setEditingItem(null);
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleStartAdd = () => {
    soundEffects.playTick();
    clearForm();
    setIsAdding(true);
  };

  const handleStartEdit = (item: MenuItem) => {
    soundEffects.playTick();
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price);
    setType(item.type);
    setCode(item.code);
    setAvailable(item.available);
    setGstRate(item.gstRate !== undefined ? item.gstRate : 5);
    setImage(item.image || '');
    setStockQuantity(item.stockQuantity !== undefined ? item.stockQuantity : 15);
    setIsAdding(false);
  };

  // Helper to convert files to base64
  const processFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (png, jpg, jpeg, webp)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
        soundEffects.playTick();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Dish name cannot be blank.");
      return;
    }
    if (!code.trim()) {
      alert("Dish fast-code cannot be blank.");
      return;
    }

    soundEffects.playSuccessChime();

    const payload: MenuItem = {
      id: editingItem ? editingItem.id : `m-${Date.now()}`,
      name: name.trim(),
      category,
      price: Math.max(0, parseFloat(price as any) || 0),
      type,
      available,
      code: code.trim().toUpperCase(),
      gstRate: Math.max(0, parseFloat(gstRate as any) || 0),
      image: image.trim() || undefined,
      stockQuantity: Math.max(0, parseInt(stockQuantity as any, 10) || 0)
    };

    if (editingItem) {
      onUpdateMenuItem(payload);
    } else {
      onAddMenuItem(payload);
    }

    clearForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this dish from the active POS menu? Past invoices won't be modified.")) {
      soundEffects.playTick();
      onDeleteMenuItem(id);
    }
  };

  return (
    <div id="settings-menu-setup-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      
      {/* LEFT: Add or Edit form factor drawer */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 h-fit shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="font-bold text-sm tracking-wider uppercase font-mono text-slate-800 dark:text-white">
            {editingItem ? '✏️ Modify Dish' : isAdding ? '➕ Create New Dish' : '🔧 Select a Dish'}
          </h3>
          {(isAdding || editingItem) && (
            <button
              id="btn-cancel-menu-form"
              onClick={clearForm}
              className="text-xs font-mono text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded"
            >
              Cancel
            </button>
          )}
        </div>

        {isAdding || editingItem ? (
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs text-slate-755 dark:text-slate-300">
            <div>
              <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">Dish Name</label>
              <input
                id="form-dish-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Crispy Honey Chilli Potato"
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">POS Fast-Code</label>
                <input
                  id="form-dish-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CCP"
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">Price (₹)</label>
                <input
                  id="form-dish-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="240"
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold uppercase text-[10px] text-slate-400">Category</label>
                  {!isAddingCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setIsAddingCategory(true);
                        setNewCategoryName('');
                      }}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer border-none bg-transparent"
                    >
                      + Add New
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setIsAddingCategory(false);
                      }}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer border-none bg-transparent"
                    >
                      Select list
                    </button>
                  )}
                </div>
                
                {!isAddingCategory ? (
                  <select
                    id="form-dish-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white font-mono"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Soups"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCategoryName.trim();
                        if (!trimmed) {
                          alert('Category name cannot be blank.');
                          return;
                        }
                        if (!customCategories.includes(trimmed)) {
                          const updated = [...customCategories, trimmed];
                          setCustomCategories(updated);
                          localStorage.setItem('bitespeed_custom_categories', JSON.stringify(updated));
                        }
                        setCategory(trimmed);
                        setIsAddingCategory(false);
                        soundEffects.playSuccessChime();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 rounded-xl text-[11px] font-bold font-mono cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">Dish Type</label>
                <select
                  id="form-dish-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white font-mono"
                >
                  <option value="veg">🟢 Vegetarian</option>
                  <option value="non-veg">🔴 Non-Veg</option>
                  <option value="egg">🟡 Egg Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">Tax Rate (%)</label>
              <select
                id="form-dish-gstrate"
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white font-mono"
              >
                <option value="0">0% (Nil / Exempted)</option>
                <option value="5">5% (Standard Restaurant Slab)</option>
                <option value="12">12% (Packaged Drinks & Foods)</option>
                <option value="18">18% (Mocktails / Premium Bakery)</option>
                <option value="28">28% (Aerated Sodas / Luxury)</option>
              </select>
            </div>

            {/* Dish Photo Uploader */}
            <div className="space-y-2">
              <label className="block font-bold uppercase text-[10px] text-slate-400">Dish Photo / Image</label>
              
              {/* Drag/drop/click box */}
              <div
                id="dish-photo-dropzone"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[90px] relative overflow-hidden ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                    : image 
                      ? 'border-indigo-300 dark:border-indigo-800' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-850/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {image ? (
                  <div className="w-full flex items-center justify-between gap-3 text-left">
                    <img
                      src={image}
                      alt="Dish preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-emerald-600 truncate">Photo Loaded Successfully</p>
                      <p className="text-[9px] text-slate-400 truncate">{image.startsWith('data:') ? 'Base64 Local Image' : 'Remote Web URL'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage('');
                        soundEffects.playTick();
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg border border-rose-100 hover:border-rose-200 dark:border-rose-950 transition-colors cursor-pointer shrink-0"
                      title="Clear photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-650 dark:text-slate-350">
                      Drag & Drop or <span className="text-indigo-600 dark:text-indigo-400 decoration-dotted underline">Browse File</span>
                    </p>
                    <p className="text-[8px] text-slate-400">Supports PNG, JPG, JPEG, WEBP or Base64</p>
                  </div>
                )}
              </div>

              {/* Paste URL Input Option */}
              <div className="flex items-center space-x-1">
                <input
                  id="form-dish-image-url"
                  type="text"
                  placeholder="Or paste direct image URL (e.g. https://...)"
                  value={image.startsWith('data:') ? '' : image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-[10px] text-slate-900 dark:text-white"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {foodPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(preset.url);
                        soundEffects.playSuccessChime();
                      }}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[9px] font-semibold transition-all cursor-pointer ${
                        image === preset.url 
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300 font-extrabold' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-205 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-3.5 h-3.5 object-cover rounded-full shrink-0"
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 uppercase text-[10px] text-slate-400">Current Stock / Inventory Qty</label>
              <input
                id="form-dish-stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                placeholder="15"
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-900 dark:text-white"
                min="0"
                required
              />
            </div>

            {/* Availability */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="form-dish-available"
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 text-indigo-650 bg-slate-50 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="form-dish-available" className="font-bold text-slate-750 select-none cursor-pointer">
                Available in Stock (Active POS menu)
              </label>
            </div>

            <button
              id="btn-save-menu-item"
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md text-xs uppercase"
            >
              {editingItem ? 'Save Updates' : 'Add Item To Catalog'}
            </button>
          </form>
        ) : (
          <div className="text-center py-12 text-slate-400 font-mono space-y-4 select-none">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300" />
            <p>Select any item on the right to edit its parameters directly, or add a fresh recipe.</p>
            <button
              id="btn-click-start-add"
              onClick={handleStartAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm"
            >
              Add Fresh Dish
            </button>
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
          <button
            id="btn-factory-reset-menu"
            onClick={() => {
              if (confirm("Reset POS catalog back to standard preset menu database? All customized items will be overwritten.")) {
                soundEffects.playSuccessChime();
                onResetMenu();
                clearForm();
              }
            }}
            className="w-full py-2.5 border border-dashed border-red-200 dark:border-red-950/60 hover:border-red-300 dark:hover:border-red-900 bg-red-50/50 dark:bg-red-950/15 text-red-750 dark:text-red-400 rounded-xl text-[11px] font-bold font-mono tracking-wider flex items-center justify-center space-x-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESET TO FACTORY PRESETS</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Active listing of categories */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="font-bold text-sm tracking-wider uppercase font-mono text-slate-800 dark:text-white">Active Catalog Dishes ({menu.length})</h3>
          <div className="flex items-center space-x-2">
            <button
              id="btn-trigger-import-excel"
              onClick={() => {
                soundEffects.playTick();
                setShowImportModal(true);
              }}
              className="flex items-center space-x-1.5 text-xs font-mono text-slate-600 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-md transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
            >
              <UploadCloud className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
              <span>Import from Excel</span>
            </button>
            {!isAdding && !editingItem && (
              <button
                id="shortcut-top-add-dish"
                onClick={handleStartAdd}
                className="flex items-center space-x-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Compose Dish</span>
              </button>
            )}
          </div>
        </div>

        {/* Group by category and show compact table */}
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = menu.filter(item => item.category === cat);
            return (
              <div key={cat} id={`settings-cat-group-${cat.toLowerCase()}`} className="space-y-2">
                <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest border-l-2 border-indigo-600 pl-2 bg-slate-50 dark:bg-slate-800/40 py-1">{cat} ({items.length})</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <div
                      id={`list-setting-card-${item.id}`}
                      key={item.id}
                      className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/20 dark:bg-slate-950/10 hover:shadow-sm"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="relative shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              <UtensilsCrossed className="w-4.5 h-4.5 text-slate-400" />
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-950 ${item.type === 'veg' ? 'bg-emerald-500' : item.type === 'non-veg' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-slate-805 dark:text-white">{item.name}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">{item.code}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            ₹{item.price.toFixed(0)} • Tax: {item.gstRate !== undefined ? item.gstRate : 5}% • {' '}
                            {item.available ? <span className="text-emerald-600 font-bold">POS Available</span> : <span className="text-rose-500 font-bold">Suspended</span>} • {' '}
                            <span className={item.stockQuantity !== undefined && item.stockQuantity < 5 ? 'text-rose-500 font-mono font-extrabold' : 'text-indigo-600 font-mono'}>
                              Stock: {item.stockQuantity ?? 15}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          id={`btn-edit-dish-${item.id}`}
                          onClick={() => handleStartEdit(item)}
                          className="p-1 text-slate-400 hover:text-indigo-650 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-dish-${item.id}`}
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXCEL IMPORT MODAL OVERLAY */}
      {showImportModal && (
        <div id="dish-import-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <div className="p-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <UploadCloud className="w-4 h-4 animate-bounce" />
                  </div>
                  <span className="font-sans font-black">Bulk Import Dishes via Excel / CSV</span>
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pb-1">
                  Upload CSV or Excel data sheet to seed and fast-batch configure your active bistro POS catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowImportModal(false);
                  setImportPreviewList([]);
                  setImportError(null);
                }}
                className="p-1 px-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {importPreviewList.length === 0 ? (
                // Step 1: Upload Dropzone
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/55 dark:border-indigo-900/30">
                    <div className="space-y-0.5">
                      <p className="font-sans font-bold text-indigo-900 dark:text-indigo-305 text-xs">Need an Excel template layout?</p>
                      <p className="text-[10px] text-slate-500 font-sans">Download a standard pre-configured spreadsheet with demo dishes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSampleTemplate}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shrink-0 border-none"
                    >
                      <span>Download Excel CSV</span>
                    </button>
                  </div>

                  {/* Dropzone */}
                  <div
                    onDragEnter={handleImportDrag}
                    onDragOver={handleImportDrag}
                    onDragLeave={handleImportDrag}
                    onDrop={handleImportDrop}
                    onClick={() => importFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden ${
                      importDragActive 
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20' 
                        : 'border-slate-205 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/30 dark:bg-slate-900/30 font-sans'
                    }`}
                  >
                    <input
                      ref={importFileRef}
                      type="file"
                      onChange={handleImportFileChange}
                      accept=".csv,.txt"
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 text-indigo-500 dark:text-indigo-455 mb-2.5 animate-pulse" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Drag & Drop your Excel/CSV here or <span className="text-indigo-600 dark:text-indigo-400 underline decoration-dotted">Browse files</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports standard comma-separated grid formats (.csv, .txt)</p>
                  </div>

                  {importError && (
                    <div className="flex gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-450 text-[11px] font-bold">
                      <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>{importError}</div>
                    </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-150/40 dark:border-slate-850 rounded-xl space-y-2">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Supported Column Headers (Auto-Mapped):</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10.5px] text-slate-500 leading-relaxed font-sans font-medium">
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Dish Name:</strong> item / dish name</div>
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Fast-Code:</strong> code / sku / key</div>
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Price:</strong> rate / cost amount</div>
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Category:</strong> category / group</div>
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Dish Type:</strong> veg / non-veg / egg</div>
                      <div><strong className="text-slate-700 dark:text-slate-300 font-mono">Tax Rate:</strong> Tax % slab</div>
                      <div><strong className="text-slate-700 dark:text-slate-350 font-mono">Stock:</strong> stock qty / stock</div>
                      <div><strong className="text-slate-700 dark:text-slate-350 font-mono">Available:</strong> active / yes / no</div>
                    </div>
                  </div>
                </div>
              ) : (
                // Step 2: Live Preview list
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl">
                    <div>
                      <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-1.5 font-sans">
                        <Check className="w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5" />
                        <span>Ready to Import: {importPreviewList.length} Dishes</span>
                      </h4>
                      <p className="text-[9.5px] text-slate-550 dark:text-slate-400 mt-0.5 font-sans font-medium">Please review parsed data mappings before committing to active POS catalog.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setImportPreviewList([]);
                        setImportError(null);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg cursor-pointer border-none"
                    >
                      Clear File
                    </button>
                  </div>

                  {/* Duplicate Handle Strategy */}
                  <div className="flex items-center space-x-2.5 p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-150/45 dark:border-slate-850 rounded-xl">
                    <input
                      id="opt-overwrite-duplicates"
                      type="checkbox"
                      checked={overwriteDuplicates}
                      onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-slate-50 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="opt-overwrite-duplicates" className="font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer flex flex-col font-sans">
                      <span>Overwrite duplicate dishes if Code / Name matches</span>
                      <span className="text-[9.5px] text-slate-400 normal-case font-normal leading-normal">If active, existing items sharing the same Fast-Code will be fully updated. If off, duplicate records are skipped.</span>
                    </label>
                  </div>

                  {/* Scrollable Preview Grid */}
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase tracking-wider text-[9px] border-b border-slate-150 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5">Dish Title</th>
                          <th className="p-2.5 text-center">Code</th>
                          <th className="p-2.5 text-center">Category</th>
                          <th className="p-2.5 text-center">Type</th>
                          <th className="p-2.5 text-right font-bold">Price</th>
                          <th className="p-2.5 text-center font-bold">Stock</th>
                          <th className="p-2.5 text-center">Tax %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/65 animate-fade-in">
                        {importPreviewList.map((item, idx) => {
                          const isDuplicate = menu.some(m => m.code === item.code || m.name.toLowerCase() === item.name.toLowerCase());
                          return (
                            <tr key={idx} className={`${isDuplicate ? 'bg-amber-500/5 dark:bg-amber-500/2.5' : ''}`}>
                              <td className="p-2.5 font-bold text-slate-850 dark:text-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{item.name}</span>
                                  {isDuplicate && (
                                    <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-sans font-extrabold tracking-wide uppercase">
                                      Match
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-extrabold text-slate-500">{item.code}</td>
                              <td className="p-2.5 text-center font-bold text-indigo-650 dark:text-indigo-400">{item.category}</td>
                              <td className="p-2.5 text-center">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.type === 'veg' ? 'bg-emerald-500' : item.type === 'non-veg' ? 'bg-red-500' : 'bg-amber-500'}`} title={item.type}></span>
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-slate-800 dark:text-white">₹{item.price.toFixed(2)}</td>
                              <td className="p-2.5 text-center font-bold">{item.stockQuantity}</td>
                              <td className="p-2.5 text-center">{item.gstRate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-end">
              
              {importPreviewList.length > 0 && (
                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow-md border-none"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit Import of {importPreviewList.length} Dishes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  setShowImportModal(false);
                  setImportPreviewList([]);
                  setImportError(null);
                }}
                className="px-4 py-2 border border-slate-205 dark:border-slate-805 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-350 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
