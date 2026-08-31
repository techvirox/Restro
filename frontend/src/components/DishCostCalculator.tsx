import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, RecipeIngredient, DishRecipe } from '../types';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Edit2, 
  Coins, 
  Flame, 
  TrendingUp, 
  Briefcase, 
  AlertCircle, 
  Check, 
  Sparkles,
  Search,
  ShoppingCart
} from 'lucide-react';
import { soundEffects } from './SoundUtility';

interface DishCostCalculatorProps {
  menu: MenuItem[];
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
}

// Pre-defined template raw ingredients list for quick autocomplete autocomplete
const RAW_INGREDIENTS_LIBRARY = [
  { name: 'Paneer / Cottage Cheese', unit: 'g', purchasePrice: 400, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Chicken Breast fillet', unit: 'g', purchasePrice: 320, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Butter / Cream', unit: 'g', purchasePrice: 480, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Onion & Tomatoes', unit: 'g', purchasePrice: 40, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Fresh Mint Leaves', unit: 'g', purchasePrice: 100, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Lemons / Citrons', unit: 'pcs', purchasePrice: 100, purchaseQty: 20, purchaseUnit: 'pcs' },
  { name: 'Club Soda / Carbonated mix', unit: 'ml', purchasePrice: 40, purchaseQty: 750, purchaseUnit: 'ml' },
  { name: 'Basmati Rice Premium', unit: 'g', purchasePrice: 120, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Whole & Ground Spices', unit: 'g', purchasePrice: 500, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'LPG / Cooking Fuel unit', unit: 'pcs', purchasePrice: 15, purchaseQty: 1, purchaseUnit: 'pcs' },
  { name: 'Chocolate & Flour', unit: 'g', purchasePrice: 180, purchaseQty: 1, purchaseUnit: 'kg' },
  { name: 'Milk / Dairy pack', unit: 'ml', purchasePrice: 65, purchaseQty: 1000, purchaseUnit: 'ml' },
  { name: 'Cooking Oil / Ghee', unit: 'ml', purchasePrice: 170, purchaseQty: 1000, purchaseUnit: 'ml' },
];

const INITIAL_RECIPES: DishRecipe[] = [
  {
    id: 'recipe-1',
    menuItemId: 'm6', // Matches Paneer Butter Masala
    dishName: 'Paneer Butter Masala',
    ingredients: [
      { id: 'ing-1', name: 'Paneer / Cottage Cheese', quantityUsed: 200, unit: 'g', purchasePrice: 420, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 84 },
      { id: 'ing-2', name: 'Butter / Cream', quantityUsed: 50, unit: 'g', purchasePrice: 480, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 24 },
      { id: 'ing-3', name: 'Onion & Tomatoes', quantityUsed: 150, unit: 'g', purchasePrice: 40, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 6 },
      { id: 'ing-4', name: 'Whole & Ground Spices', quantityUsed: 15, unit: 'g', purchasePrice: 500, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 7.5 },
      { id: 'ing-5', name: 'Milk / Dairy pack', quantityUsed: 100, unit: 'ml', purchasePrice: 65, purchaseQty: 1000, purchaseUnit: 'ml', calculatedCost: 6.5 },
    ],
    additionalPrepCost: 15,
    labourCost: 20,
    wastagePercent: 5,
    targetPrice: 280,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'recipe-2',
    menuItemId: 'm15', // Matches Mint Virgin Mojito
    dishName: 'Mint Virgin Mojito',
    ingredients: [
      { id: 'ing-6', name: 'Fresh Mint Leaves', quantityUsed: 15, unit: 'g', purchasePrice: 100, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 1.5 },
      { id: 'ing-7', name: 'Lemons / Citrons', quantityUsed: 1, unit: 'pcs', purchasePrice: 100, purchaseQty: 20, purchaseUnit: 'pcs', calculatedCost: 5 },
      { id: 'ing-8', name: 'Club Soda / Carbonated mix', quantityUsed: 250, unit: 'ml', purchasePrice: 45, purchaseQty: 750, purchaseUnit: 'ml', calculatedCost: 15 },
      { id: 'ing-9', name: 'Whole & Ground Spices', quantityUsed: 5, unit: 'g', purchasePrice: 500, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 2.5 },
    ],
    additionalPrepCost: 5,
    labourCost: 8,
    wastagePercent: 3,
    targetPrice: 140,
    lastUpdated: new Date().toISOString()
  }
];

export const DishCostCalculator: React.FC<DishCostCalculatorProps> = ({
  menu,
  onAddMenuItem,
  onUpdateMenuItem
}) => {
  // Recipes list state
  const [recipes, setRecipes] = useState<DishRecipe[]>(() => {
    const saved = localStorage.getItem('bitespeed_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  // Editor states
  const [activeRecipe, setActiveRecipe] = useState<DishRecipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Toast notice state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Custom modal for creating menu item
  const [addMenuModal, setAddMenuModal] = useState<{
    dishName: string;
    price: number;
    category: 'Starters' | 'Mains' | 'Desserts' | 'Beverages';
    type: 'veg' | 'non-veg' | 'egg';
    code: string;
    gstRate: number;
  } | null>(null);

  // Auto-dismiss helper for toasts
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    // Sound highlights
    if (type === 'success') {
      soundEffects.playSuccessChime();
    } else {
      soundEffects.playTick();
    }
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Delete a recipe sheet from DB
  const handleDeleteRecipeSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRecipe?.id === id) {
      setActiveRecipe(null);
    }
    setRecipes(prev => prev.filter(r => r.id !== id));
    showToast('Recipe sheet deleted successfully', 'info');
  };

  // Save recipes to localStorage
  useEffect(() => {
    localStorage.setItem('bitespeed_recipes', JSON.stringify(recipes));
  }, [recipes]);

  // Helper utility to convert grams/ml to kilograms/liters and calculate raw costing
  const convertAndCalculateCost = (
    qtyUsed: number,
    usedUnit: string,
    purchasePrice: number,
    purchaseQty: number,
    purchaseUnit: string
  ): number => {
    if (qtyUsed <= 0 || purchasePrice <= 0 || purchaseQty <= 0) return 0;

    // Convert both used qty and purchase qty to equivalent values in base metric values
    let usedBase = qtyUsed;
    let purchaseBase = purchaseQty;

    // Standard metric modifiers of mass and fluids
    const toBaseMap: { [key: string]: number } = {
      'kg': 1000,
      'g': 1,
      'l': 1000,
      'ml': 1,
      'pcs': 1,
      'piece': 1,
      'pieces': 1,
      'box': 1,
    };

    const uUnit = usedUnit.toLowerCase().trim();
    const pUnit = purchaseUnit.toLowerCase().trim();

    const usedWeight = toBaseMap[uUnit] || 1;
    const purchaseWeight = toBaseMap[pUnit] || 1;

    usedBase = qtyUsed * usedWeight;
    purchaseBase = purchaseQty * purchaseWeight;

    const baseUnitCost = purchasePrice / purchaseBase;
    return parseFloat((usedBase * baseUnitCost).toFixed(2));
  };

  // Preset list helper filtered by search
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => 
      r.dishName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery]);

  // Initialize a blank recipe form
  const handleAddNewRecipe = () => {
    soundEffects.playTick();
    const newRecipe: DishRecipe = {
      id: `recipe-${Date.now()}`,
      dishName: 'New Dish Masterpiece',
      ingredients: [
        { id: 'new-1', name: 'Paneer / Cottage Cheese', quantityUsed: 150, unit: 'g', purchasePrice: 400, purchaseQty: 1, purchaseUnit: 'kg', calculatedCost: 60 }
      ],
      additionalPrepCost: 10,
      labourCost: 15,
      wastagePercent: 5,
      targetPrice: 200,
      lastUpdated: new Date().toISOString()
    };
    setActiveRecipe(newRecipe);
    showToast('New draft recipe sheet created!', 'info');
  };

  // Select a recipe from master list to view/edit
  const handleSelectRecipe = (recipe: DishRecipe) => {
    soundEffects.playTick();
    setActiveRecipe(JSON.parse(JSON.stringify(recipe))); // deep copy
  };

  // Update a field inside the active editing recipe sheet
  const handleUpdateActiveField = (field: keyof DishRecipe, value: any) => {
    if (!activeRecipe) return;
    setActiveRecipe(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  // Adjust specific ingredient row properties in real-time
  const handleUpdateIngredientRow = (ingId: string, updates: Partial<RecipeIngredient>) => {
    if (!activeRecipe) return;

    setActiveRecipe(prev => {
      if (!prev) return null;
      const updatedIngredients = prev.ingredients.map(ing => {
        if (ing.id === ingId) {
          const merged = { ...ing, ...updates };
          // Recompute cost auto-magically
          merged.calculatedCost = convertAndCalculateCost(
            merged.quantityUsed,
            merged.unit,
            merged.purchasePrice,
            merged.purchaseQty,
            merged.purchaseUnit
          );
          return merged;
        }
        return ing;
      });

      return {
        ...prev,
        ingredients: updatedIngredients
      };
    });
  };

  // Add a new raw ingredient item line
  const handleAddIngredientRow = (presetIng?: typeof RAW_INGREDIENTS_LIBRARY[0]) => {
    if (!activeRecipe) return;
    soundEffects.playTick();

    const newIng: RecipeIngredient = presetIng ? {
      id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: presetIng.name,
      quantityUsed: presetIng.purchaseUnit === 'kg' ? 100 : (presetIng.purchaseUnit === 'l' ? 100 : 1),
      unit: presetIng.unit,
      purchasePrice: presetIng.purchasePrice,
      purchaseQty: presetIng.purchaseQty,
      purchaseUnit: presetIng.purchaseUnit,
      calculatedCost: convertAndCalculateCost(
        presetIng.purchaseUnit === 'kg' ? 100 : (presetIng.purchaseUnit === 'l' ? 100 : 1),
        presetIng.unit,
        presetIng.purchasePrice,
        presetIng.purchaseQty,
        presetIng.purchaseUnit
      )
    } : {
      id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: 'Sugar or Condiment',
      quantityUsed: 10,
      unit: 'g',
      purchasePrice: 50,
      purchaseQty: 1,
      purchaseUnit: 'kg',
      calculatedCost: 0.50
    };

    setActiveRecipe(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ingredients: [...prev.ingredients, newIng]
      };
    });
  };

  // Delete an ingredient row
  const handleDeleteIngredientRow = (ingId: string) => {
    if (!activeRecipe) return;
    soundEffects.playTick();
    setActiveRecipe(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ingredients: prev.ingredients.filter(i => i.id !== ingId)
      };
    });
  };

  // Master computations for the recipe cost summary cards
  const summaryMetrics = useMemo(() => {
    if (!activeRecipe) return { rawCost: 0, wastageCost: 0, totalRecipeCost: 0, foodCostPercent: 0, gpAmount: 0, gpPercent: 0, health: 'unknown' };

    const rawCost = activeRecipe.ingredients.reduce((acc, curr) => acc + curr.calculatedCost, 0);
    const wastageCost = (rawCost * activeRecipe.wastagePercent) / 100;
    const totalRecipeCost = rawCost + wastageCost + activeRecipe.additionalPrepCost + activeRecipe.labourCost;
    const targetPrice = activeRecipe.targetPrice || 1;

    // Food Cost percentage evaluates raw material cost + loss margins over the net price
    const foodCostPercent = parseFloat(((rawCost + wastageCost) / targetPrice * 100).toFixed(1));
    const gpAmount = Math.max(0, targetPrice - totalRecipeCost);
    const gpPercent = parseFloat((gpAmount / targetPrice * 100).toFixed(1));

    // Health state classification
    let health: 'green' | 'yellow' | 'red' = 'green';
    if (foodCostPercent > 40) {
      health = 'red'; // Loss making or extremely low margin
    } else if (foodCostPercent > 30) {
      health = 'yellow'; // Low marginal safety
    } else {
      health = 'green'; // Exceptional margin standard
    }

    return {
      rawCost,
      wastageCost,
      totalRecipeCost,
      foodCostPercent,
      gpAmount,
      gpPercent,
      health
    };
  }, [activeRecipe]);

  // Saves calculation to LocalStorage Recipes DB
  const handleSaveRecipeToDB = () => {
    if (!activeRecipe) return;

    setRecipes(prev => {
      const exists = prev.some(r => r.id === activeRecipe.id);
      if (exists) {
        return prev.map(r => r.id === activeRecipe.id ? activeRecipe : r);
      } else {
        return [activeRecipe, ...prev];
      }
    });
    showToast(`"${activeRecipe.dishName}" Recipe sheet saved successfully!`, 'success');
  };

  // Direct export - Update the price of linked MenuItem in active POS system
  const handleExportPriceToPOS = () => {
    if (!activeRecipe) return;

    // Check if we can find associated item in menu by name matching or existing link
    let linkedItem = menu.find(item => 
      item.id === activeRecipe.menuItemId || 
      item.name.toLowerCase().trim() === activeRecipe.dishName.toLowerCase().trim()
    );

    if (linkedItem) {
      const updatedItem: MenuItem = {
        ...linkedItem,
        price: activeRecipe.targetPrice
      };
      
      onUpdateMenuItem(updatedItem);

      // Save linkage
      const finalRecipe = {
        ...activeRecipe,
        menuItemId: linkedItem.id
      };
      setActiveRecipe(finalRecipe);
      setRecipes(prev => prev.map(r => r.id === activeRecipe.id ? finalRecipe : r));

      showToast(`Successfully synchronized Price for "${linkedItem.name}" in POS Menu. New selling price set to ₹${activeRecipe.targetPrice}!`, 'success');
    } else {
      // Show visual modal to customize the menu item code, category, and diet type cleanly!
      const generatedCode = activeRecipe.dishName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) + Math.floor(10 + Math.random() * 89);

      setAddMenuModal({
        dishName: activeRecipe.dishName,
        price: activeRecipe.targetPrice,
        category: 'Mains',
        type: 'veg',
        code: generatedCode,
        gstRate: 5
      });
    }
  };

  // Handle confirming of the newly added menu item inside custom interactive modal
  const handleConfirmAddMenuItem = () => {
    if (!addMenuModal || !activeRecipe) return;

    const newItem: MenuItem = {
      id: `m-${Date.now()}`,
      name: addMenuModal.dishName,
      category: addMenuModal.category,
      price: addMenuModal.price,
      type: addMenuModal.type,
      available: true,
      code: addMenuModal.code,
      gstRate: addMenuModal.gstRate
    };

    onAddMenuItem(newItem);

    const finalRecipe = {
      ...activeRecipe,
      dishName: addMenuModal.dishName,
      targetPrice: addMenuModal.price,
      menuItemId: newItem.id
    };

    setActiveRecipe(finalRecipe);
    setRecipes(prev => {
      const exists = prev.some(r => r.id === activeRecipe.id);
      if (exists) {
        return prev.map(r => r.id === activeRecipe.id ? finalRecipe : r);
      } else {
        return [finalRecipe, ...prev];
      }
    });

    setAddMenuModal(null);
    showToast(`Successfully added "${newItem.name}" as a new Menu Item in POS! Code: ${newItem.code}`, 'success');
  };

  // Find linked item description
  const linkedPOSItem = useMemo(() => {
    if (!activeRecipe) return null;
    return menu.find(m => m.id === activeRecipe.menuItemId || m.name.toLowerCase().trim() === activeRecipe.dishName.toLowerCase().trim());
  }, [activeRecipe, menu]);

  // Typical ingredients filter
  const filteredLibrary = useMemo(() => {
    if (!ingredientSearch) return RAW_INGREDIENTS_LIBRARY;
    return RAW_INGREDIENTS_LIBRARY.filter(i => 
      i.name.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
  }, [ingredientSearch]);

  return (
    <div id="dish-cost-calculator-root" className="space-y-6">
      
      {/* Upper Utility Header with Info Alerts */}
      <div id="calculator-lead-header" className="bg-[#fcf8f2] border border-amber-200/60 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Dish Cost & Profit Margin Audit</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Evaluate real culinary profit margins using the Food Cost index. Industry gold standard mandates Food Cost under **30%** of selling price to cover rent, staffing & operational overheads successfully.
            </p>
          </div>
        </div>
        <button
          id="btn-add-new-recipe"
          onClick={handleAddNewRecipe}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Recipe Sheet</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Recipe Selector Master Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs space-y-3.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                id="recipe-search-bar"
                type="text"
                placeholder="Search recipe sheets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white text-slate-800"
              />
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((item) => {
                  // Compute brief active percentages for subitem list
                  const rawSum = item.ingredients.reduce((acc, curr) => acc + curr.calculatedCost, 0);
                  const waste = (rawSum * item.wastagePercent) / 100;
                  const totalMat = rawSum + waste;
                  const percent = parseFloat((totalMat / (item.targetPrice || 1) * 100).toFixed(0));

                  const isSelected = activeRecipe?.id === item.id;

                  return (
                    <div
                      id={`recipe-selector-item-card-${item.id}`}
                      key={item.id}
                      onClick={() => handleSelectRecipe(item)}
                      className={`group w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between text-xs cursor-pointer relative ${
                        isSelected 
                        ? 'bg-indigo-50 border-indigo-200 shadow-2xs' 
                        : 'bg-white border-gray-150 hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-1.5">
                        <p className="font-bold text-slate-800 text-xs truncate">{item.dishName}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">
                          Prep Costs: ₹{item.additionalPrepCost + item.labourCost} • Selling: ₹{item.targetPrice}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono ${
                          percent > 40 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          percent > 30 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {percent}% FC
                        </span>
                        
                        {/* Interactive sheet deletion */}
                        <button
                          onClick={(e) => handleDeleteRecipeSheet(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-650 rounded transition-all cursor-pointer"
                          title="Delete Recipe Sheet"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                  <p className="text-xs text-slate-400 font-mono">No auditing sheets saved.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Library helper box */}
          {activeRecipe && (
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-450 flex items-center justify-between">
                <span>RAW INGREDIENT COMMODITIES</span>
                <span className="text-indigo-600 font-mono text-[9px]">Quick Tap Add</span>
              </h4>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                <input
                  id="ingredient-library-search"
                  type="text"
                  placeholder="Filter raw items..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full bg-gray-50 pl-7 pr-2 py-1 border border-gray-200 rounded text-[10px] outline-none text-slate-800"
                />
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {filteredLibrary.map((item, idx) => (
                  <button
                    id={`ing-quick-add-${idx}`}
                    key={idx}
                    onClick={() => handleAddIngredientRow(item)}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-indigo-50 border border-gray-150 transition-all text-[10px] flex justify-between items-center text-slate-700 hover:text-indigo-700 cursor-pointer"
                  >
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="font-mono text-[9px] text-slate-500 shrink-0">₹{item.purchasePrice}/{item.purchaseQty}{item.purchaseUnit}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Active Recipe Pricing Evaluation Sheet */}
        <div className="lg:col-span-8">
          {activeRecipe ? (
            <div className="space-y-6">
              
              {/* Main parameters header form */}
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="flex-1">
                    <label className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Dish / Product Name</label>
                    <input
                      id="input-recipe-dish-name"
                      type="text"
                      value={activeRecipe.dishName}
                      onChange={(e) => handleUpdateActiveField('dishName', e.target.value)}
                      className="w-full bg-transparent font-black text-lg tracking-tight text-slate-900 border-b border-dashed border-gray-300 focus:border-indigo-600 outline-none pb-0.5"
                      placeholder="e.g. Garlic Naan Special"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      id="btn-save-recipe-sheet"
                      onClick={handleSaveRecipeToDB}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Sheet</span>
                    </button>
                    
                    <button
                      id="btn-export-price-pos"
                      onClick={handleExportPriceToPOS}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{linkedPOSItem ? 'Update POS Price' : 'Sync to POS Menu'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Linked POS item status */}
                  <div className="flex flex-col p-2.5 bg-slate-50 rounded-lg border border-gray-150 text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1 text-slate-550 bg-white shadow-2xs rounded">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 uppercase tracking-wide text-[9px]">Linked POS Product</p>
                        {linkedPOSItem ? (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-bold text-slate-800 truncate">
                              {linkedPOSItem.name} <span className="font-mono font-normal text-slate-400">({linkedPOSItem.code})</span>
                            </span>
                            <button 
                              onClick={() => {
                                handleUpdateActiveField('menuItemId', undefined);
                                showToast('Recipe sheet unlinked from POS item', 'info');
                              }}
                              className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline shrink-0 ml-2"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-400 italic mt-0.5">Not linked in menu catalog</p>
                        )}
                      </div>
                    </div>

                    {!linkedPOSItem && (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-500 uppercase font-black shrink-0 font-mono">Link existing:</span>
                        <select
                          id="select-link-pos-item"
                          className="flex-1 p-1 bg-white border border-gray-200 rounded text-[10px] outline-none text-slate-705"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const targetItem = menu.find(m => m.id === val);
                              if (targetItem) {
                                handleUpdateActiveField('menuItemId', targetItem.id);
                                handleUpdateActiveField('dishName', targetItem.name); // sync dish name
                                handleUpdateActiveField('targetPrice', targetItem.price); // sync target selling price
                                showToast(`Linked recipe sheet to "${targetItem.name}"`, 'success');
                              }
                            }
                          }}
                        >
                          <option value="">-- Choose Menu Item --</option>
                          {menu.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.code}) - ₹{m.price}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Pricing Input Sheet */}
                  <div>
                    <label className="block text-[9px] text-gray-450 uppercase font-extrabold tracking-wider mb-1">Target Selling Retail Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 font-extrabold">₹</span>
                      <input
                        id="input-recipe-target-price"
                        type="number"
                        min="1"
                        value={activeRecipe.targetPrice}
                        onChange={(e) => handleUpdateActiveField('targetPrice', Math.max(1, parseFloat(e.target.value) || 0))}
                        className="w-full bg-gray-50 font-black pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients cost sheet table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">RAW MATERIALS & COMMODITY USAGES</h4>
                  <button
                    id="btn-add-ingredient-inline"
                    onClick={() => handleAddIngredientRow()}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Row</span>
                  </button>
                        <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 text-[9px] uppercase font-bold font-mono">
                        <th className="px-2 py-1.5 w-1/3">Ingredient Item</th>
                        <th className="px-2 py-1.5 text-right">Usage Qty</th>
                        <th className="px-2 py-1.5 text-left">Unit</th>
                        <th className="px-2 py-1.5 text-right">Purchase Cost (Bulk)</th>
                        <th className="px-2 py-1.5 text-center text-rose-600">Delete</th>
                        <th className="px-2 py-1.5 text-right">Yielded Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {activeRecipe.ingredients.map((ing) => (
                        <tr id={`ing-row-${ing.id}`} key={ing.id} className="hover:bg-slate-55/40 text-slate-700">
                          
                          {/* Name Input */}
                          <td className="px-2 py-1">
                            <input
                              id={`ing-name-input-${ing.id}`}
                              type="text"
                              value={ing.name}
                              onChange={(e) => handleUpdateIngredientRow(ing.id, { name: e.target.value })}
                              className="w-full bg-transparent font-medium focus:bg-white border-b border-transparent focus:border-indigo-400 outline-none p-0.5 text-slate-900 text-[10.5px]"
                              placeholder="Ingredient name..."
                            />
                          </td>

                          {/* Used Qty */}
                          <td className="px-2 py-1 text-right">
                            <input
                              id={`ing-qtyused-input-${ing.id}`}
                              type="number"
                              min="0"
                              step="any"
                              value={ing.quantityUsed || ''}
                              onChange={(e) => handleUpdateIngredientRow(ing.id, { quantityUsed: parseFloat(e.target.value) || 0 })}
                              className="w-14 bg-gray-50 text-right p-0.5 rounded font-mono text-slate-900 focus:bg-white border border-gray-200 outline-none text-[10.5px]"
                            />
                          </td>

                          {/* Used Unit */}
                          <td className="px-2 py-1">
                            <select
                              id={`ing-unit-select-${ing.id}`}
                              value={ing.unit}
                              onChange={(e) => {
                                const newUnit = e.target.value;
                                handleUpdateIngredientRow(ing.id, { 
                                  unit: newUnit,
                                  purchaseUnit: newUnit === 'g' ? 'kg' : (newUnit === 'ml' ? 'l' : newUnit)
                                });
                              }}
                              className="p-0.5 bg-transparent/5 rounded border border-gray-200 text-slate-800 outline-none text-[10px] font-semibold cursor-pointer font-sans"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </td>

                          {/* Purchase Price and Packaging Qty purchase block */}
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-end space-x-1">
                              <span className="text-[9px] text-slate-400">₹</span>
                              <input
                                id={`ing-pPrice-input-${ing.id}`}
                                type="number"
                                min="0"
                                value={ing.purchasePrice || ''}
                                onChange={(e) => handleUpdateIngredientRow(ing.id, { purchasePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                                className="w-14 bg-gray-50 text-right p-0.5 rounded outline-none font-mono focus:bg-white border border-gray-200 text-[10.5px]"
                              />
                              <span className="text-[9px] text-slate-400">for</span>
                              <input
                                id={`ing-pQty-input-${ing.id}`}
                                type="number"
                                min="0.01"
                                value={ing.purchaseQty || ''}
                                onChange={(e) => handleUpdateIngredientRow(ing.id, { purchaseQty: Math.max(0.01, parseFloat(e.target.value) || 1) })}
                                className="w-10 bg-gray-50 text-center p-0.5 rounded outline-none font-mono focus:bg-white border border-gray-200 text-[10.5px]"
                              />
                              <span className="text-[9.5px] font-bold text-slate-500 font-mono">{ing.purchaseUnit}</span>
                            </div>
                          </td>

                          {/* Trash Delete Icon */}
                          <td className="px-2 py-1 text-center">
                            <button
                              id={`btn-del-ing-${ing.id}`}
                              onClick={() => handleDeleteIngredientRow(ing.id)}
                              className="p-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-rose-600 transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>

                          {/* Calculated Cost Output */}
                          <td className="px-2 py-1 text-right font-mono font-black text-slate-900 border-l border-gray-100">
                            ₹{ing.calculatedCost.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>              </div>
              </div>

              {/* Utility / Preparation overhead block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Cooking fuel LPG */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
                  <div className="flex items-center space-x-2 text-amber-600 font-black mb-2 text-xs uppercase tracking-wide">
                    <Flame className="w-4 h-4" />
                    <span>LPG & Utility Fuel</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 font-mono text-[11px] text-slate-400 font-black">₹</span>
                    <input
                      id="input-prep-overhead-cost"
                      type="number"
                      min="0"
                      value={activeRecipe.additionalPrepCost}
                      onChange={(e) => handleUpdateActiveField('additionalPrepCost', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-gray-50 pl-6 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 font-mono">Electricity, gas, charcoal used</p>
                </div>

                {/* Support/Chef Labour overhead */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
                  <div className="flex items-center space-x-2 text-indigo-600 font-black mb-2 text-xs uppercase tracking-wide">
                    <Briefcase className="w-4 h-4" />
                    <span>Chef & Crew Time Labour</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 font-mono text-[11px] text-slate-400 font-black">₹</span>
                    <input
                      id="input-labour-cost"
                      type="number"
                      min="0"
                      value={activeRecipe.labourCost}
                      onChange={(e) => handleUpdateActiveField('labourCost', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-gray-50 pl-6 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 font-mono">Preparation prep payroll split charge</p>
                </div>

                {/* Wastage factor percentage */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
                  <div className="flex items-center space-x-2 text-rose-600 font-extrabold mb-2 text-xs uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4" />
                    <span>Raw Spoilage / Wastage</span>
                  </div>
                  <div className="relative">
                    <span className="absolute right-2.5 top-2.5 font-mono text-[11px] text-slate-400 font-bold">%</span>
                    <input
                      id="input-wastage-multiplier"
                      type="number"
                      min="0"
                      max="100"
                      value={activeRecipe.wastagePercent}
                      onChange={(e) => handleUpdateActiveField('wastagePercent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full bg-gray-50 pl-3 pr-6 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 font-mono">Wastage / decay margin index charge</p>
                </div>

              </div>

              {/* Master Financial Summary Evaluation Card */}
              <div className="bg-[#111217] text-white p-5 rounded-2xl border border-gray-800 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-3.5 gap-2">
                  <h4 className="text-xs font-black tracking-widest uppercase text-gray-500 font-mono">FINANCIAL AUDIT RESULTS</h4>
                  {summaryMetrics.foodCostPercent > 0 && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                      summaryMetrics.health === 'green' ? 'bg-emerald-500/20 text-emerald-400' :
                      summaryMetrics.health === 'yellow' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {summaryMetrics.health === 'green' ? '🟢 Optimum Food Cost Margin' :
                       summaryMetrics.health === 'yellow' ? '🟡 Low Safety Threshold' :
                       '🔴 Critical: Overpriced Ingredients or Underpriced Dish'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Raw material aggregate */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-semibold font-mono uppercase">Raw Cost</span>
                    <p className="text-xl font-bold font-mono tracking-tight text-white">₹{summaryMetrics.rawCost.toFixed(1)}</p>
                    <p className="text-[9px] text-gray-550 font-mono">Ing. subtotal cost</p>
                  </div>

                  {/* Wastage penalty */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-semibold font-mono uppercase">Wastage (+{activeRecipe.wastagePercent}%)</span>
                    <p className="text-xl font-bold font-mono tracking-tight text-rose-400">₹{summaryMetrics.wastageCost.toFixed(1)}</p>
                    <p className="text-[9px] text-rose-500/80 font-mono">Decay cost impact</p>
                  </div>

                  {/* Total Prime cost */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-semibold font-mono uppercase">Total Prime Cost</span>
                    <p className="text-xl font-bold font-mono tracking-tight text-indigo-400">₹{summaryMetrics.totalRecipeCost.toFixed(1)}</p>
                    <p className="text-[9px] text-indigo-300 font-mono">Ing. + margins + labor</p>
                  </div>

                  {/* GP Margin (%) */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-450 font-semibold font-mono uppercase text-teal-400">Net GP Margins</span>
                    <p className="text-xl font-extrabold font-mono tracking-tight text-teal-400">{summaryMetrics.gpPercent}%</p>
                    <p className="text-[9px] text-teal-300/80 font-mono">₹{summaryMetrics.gpAmount.toFixed(0)} Profitable margin</p>
                  </div>
                </div>

                {/* Visual margin gauge */}
                <div className="space-y-1.5 pt-3 border-t border-gray-800">
                  <div className="flex justify-between text-[10px] tracking-wide text-gray-400 uppercase font-mono font-bold">
                    <span>Menu Price: ₹{activeRecipe.targetPrice}</span>
                    <span className={
                      summaryMetrics.health === 'green' ? 'text-emerald-400' :
                      summaryMetrics.health === 'yellow' ? 'text-amber-400' :
                      'text-rose-400'
                    }>
                      Culinary Food Cost ratio: {summaryMetrics.foodCostPercent}%
                    </span>
                  </div>
                  
                  {/* Multi-layered custom bar gauge */}
                  <div className="relative w-full h-3 bg-gray-850 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        summaryMetrics.health === 'green' ? 'bg-emerald-500' :
                        summaryMetrics.health === 'yellow' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, summaryMetrics.foodCostPercent)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>Optimum Scale: 15% - 30% FC</span>
                    <span>Industry threshold standard: Limit &lt; 35%</span>
                  </div>
                </div>

                {/* Intelligent recommendation AI text */}
                <div className="bg-[#181a22] p-3 rounded-lg border border-gray-800 text-[10px] space-y-1 leading-relaxed text-slate-350">
                  <span className="font-bold text-gray-100 flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Profit Optimizer Audit Recommendations:</span>
                  </span>
                  
                  {summaryMetrics.health === 'green' ? (
                    <p>
                      Excellent pricing layout! Your raw material and wastage cost is fully optimized within the Golden Ratio ({summaryMetrics.foodCostPercent}%). This pricing allows superb resilience to cover standard overhead indices. No adjustments necessary.
                    </p>
                  ) : summaryMetrics.health === 'yellow' ? (
                    <p>
                      Your food cost is reaching standard limits ({summaryMetrics.foodCostPercent}%). Consider cutting down portion weights slightly or increasing selling price to **₹{Math.ceil(summaryMetrics.totalRecipeCost / 0.28)}** to re-secure a premier 28% Food Cost standard.
                    </p>
                  ) : (
                    <p className="text-rose-350 font-semibold bg-rose-950/20 p-2.5 rounded border border-rose-900/30">
                      ⚠️ Critical warning: Food cost is extremely high ({summaryMetrics.foodCostPercent}%) leading to minimal operations profitability. We strongly recommend immediate review of raw materials purchase channels, reducing portion overhead, or raising the POS menu retail price up to **₹{Math.ceil(summaryMetrics.totalRecipeCost / 0.30)}** to regain a healthy business state.
                    </p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-[460px] flex flex-col items-center justify-center border border-dashed border-gray-200 bg-white rounded-xl shadow-xs text-center p-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Select Recipe Auditing Sheet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Tap an auditing sheet from the sidebar or click "New Recipe Sheet" to build custom recipes and calculate raw profit margins instantly.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Dynamic customizable modal for establishing a new POS menu entry */}
      {addMenuModal && (
        <div id="add-to-pos-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-gray-150 dark:border-slate-805 shadow-2xl space-y-4 text-slate-805 dark:text-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-indigo-500 hover:scale-110 duration-200 transition-all" />
                <span>New POS Menu Catalog Entry</span>
              </h3>
              <button 
                onClick={() => setAddMenuModal(null)}
                className="text-gray-450 hover:text-gray-600 font-bold cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[9px] text-gray-450 uppercase font-bold tracking-wider mb-1">Item Title / Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800 dark:text-slate-100"
                  value={addMenuModal.dishName}
                  onChange={(e) => setAddMenuModal({ ...addMenuModal, dishName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-gray-450 uppercase font-bold tracking-wider mb-1">POS Category</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-255 dark:border-slate-700 p-2 rounded-lg text-xs outline-none cursor-pointer text-slate-850 dark:text-slate-150"
                    value={addMenuModal.category}
                    onChange={(e) => setAddMenuModal({ ...addMenuModal, category: e.target.value as any })}
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-gray-455 uppercase font-bold tracking-wider mb-1">Diet Type</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-255 dark:border-slate-700 p-2 rounded-lg text-xs outline-none cursor-pointer font-bold text-slate-800 dark:text-slate-100"
                    value={addMenuModal.type}
                    onChange={(e) => setAddMenuModal({ ...addMenuModal, type: e.target.value as any })}
                  >
                    <option value="veg">🟢 Pure Veg</option>
                    <option value="non-veg">🔴 Non-Veg</option>
                    <option value="egg">🟡 Contains Egg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[9px] text-gray-450 uppercase font-bold tracking-wider mb-1">Item Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 p-2 rounded-lg text-xs text-center outline-none font-mono font-bold text-slate-800 dark:text-slate-100"
                    value={addMenuModal.code}
                    onChange={(e) => setAddMenuModal({ ...addMenuModal, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[9px] text-gray-450 uppercase font-bold tracking-wider mb-1">Tax Slab (GST)</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-255 dark:border-slate-700 p-2 rounded-lg text-xs outline-none cursor-pointer text-slate-800 dark:text-slate-100"
                    value={addMenuModal.gstRate}
                    onChange={(e) => setAddMenuModal({ ...addMenuModal, gstRate: parseInt(e.target.value) || 0 })}
                  >
                    <option value={0}>0% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[9px] text-gray-455 uppercase font-bold tracking-wider mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 p-2 rounded-lg text-xs outline-none font-mono font-extrabold text-right text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                    value={addMenuModal.price}
                    onChange={(e) => setAddMenuModal({ ...addMenuModal, price: Math.max(1, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setAddMenuModal(null)}
                className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddMenuItem}
                className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Add & Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded non-blocking sliding toast */}
      {toast && (
        <div id="calculator-toast" className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs" style={{ borderLeft: toast.type === 'success' ? '4px solid #10b981' : '4px solid #6366f1' }}>
          <div className="flex-1">
            <span className="font-semibold">{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white font-bold pl-2 cursor-pointer transition-all"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
};
