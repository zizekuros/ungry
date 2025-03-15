import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlusCircle, Share2, Trash2, ShoppingBasket, ArrowLeft, Check } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
);

function App() {
  const [lists, setLists] = useState<any[]>([]);
  const [currentList, setCurrentList] = useState<any>(null);
  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [accessKey, setAccessKey] = useState('');

  useEffect(() => {
    // Load lists from local storage
    const savedLists = localStorage.getItem('ungry_lists');
    if (savedLists) {
      setLists(JSON.parse(savedLists));
    }
  }, []);

  const createNewList = () => {
    const newList = {
      id: Date.now(),
      name: `Shopping List ${lists.length + 1}`,
      items: [],
      boughtItems: [],
      accessKey: Math.random().toString(36).substring(2, 8).toUpperCase(),
      owner: true,
      created: new Date().toISOString()
    };
    
    setLists([...lists, newList]);
    setCurrentList(newList);
    localStorage.setItem('ungry_lists', JSON.stringify([...lists, newList]));
    toast.success('New list created!');
  };

  const addItem = (item: string) => {
    if (!item.trim() || !currentList) return;

    const newItems = [...currentList.items, {
      id: Date.now(),
      name: item.trim(),
      added: new Date().toISOString()
    }];

    const updatedList = { ...currentList, items: newItems };
    const updatedLists = lists.map(l => 
      l.id === currentList.id ? updatedList : l
    );

    setLists(updatedLists);
    setCurrentList(updatedList);
    setNewItem('');
    localStorage.setItem('ungry_lists', JSON.stringify(updatedLists));

    // Add to suggestions if not exists
    const savedSuggestions = JSON.parse(localStorage.getItem('ungry_suggestions') || '[]');
    if (!savedSuggestions.includes(item.trim())) {
      const newSuggestions = [...savedSuggestions, item.trim()];
      localStorage.setItem('ungry_suggestions', JSON.stringify(newSuggestions));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewItem(value);
    
    if (value.trim()) {
      const savedSuggestions = JSON.parse(localStorage.getItem('ungry_suggestions') || '[]');
      const filtered = savedSuggestions.filter((s: string) => 
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const joinList = () => {
    if (!accessKey.trim()) {
      toast.error('Please enter an access key');
      return;
    }

    // In a real app, this would verify with the backend
    toast.success('Joined list successfully!');
    setAccessKey('');
  };

  const deleteList = (listId: number) => {
    const updatedLists = lists.filter(l => l.id !== listId);
    setLists(updatedLists);
    setCurrentList(null);
    localStorage.setItem('ungry_lists', JSON.stringify(updatedLists));
    toast.success('List deleted!');
  };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.added).getTime() - new Date(a.added).getTime();
    });
  };

  const markItemAsBought = (item: any) => {
    const updatedList = { 
      ...currentList,
      items: currentList.items.filter((i: any) => i.id !== item.id),
      boughtItems: [...(currentList.boughtItems || []), { ...item, boughtAt: new Date().toISOString() }]
    };
    
    const updatedLists = lists.map(l => 
      l.id === currentList.id ? updatedList : l
    );

    setLists(updatedLists);
    setCurrentList(updatedList);
    localStorage.setItem('ungry_lists', JSON.stringify(updatedLists));
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-amber-400 text-amber-900 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M4 7V5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 7H20V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V7Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            {currentList ? (
              <button
                onClick={() => setCurrentList(null)}
                className="flex items-center gap-2 hover:bg-amber-300 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
                <span className="hidden sm:inline">Back to Lists</span>
              </button>
            ) : (
              <h1 className="text-2xl font-bold">Ungry</h1>
            )}
          </div>
          {!currentList && (
            <button
              onClick={createNewList}
              className="bg-white text-amber-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-50 transition-colors"
            >
              <PlusCircle size={20} />
              New List
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Join List Section */}
        {!currentList && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter access key to join a list"
                className="flex-1 border rounded-lg px-4 py-2"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
              <button
                onClick={joinList}
                className="bg-amber-400 text-amber-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-300 transition-colors"
              >
                <Share2 size={20} />
                Join
              </button>
            </div>
          </div>
        )}

        {/* Current List */}
        {currentList && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-amber-900">{currentList.name}</h2>
              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                </select>
                {currentList.owner && (
                  <button
                    onClick={() => deleteList(currentList.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Add Item Form */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Add new item..."
                className="w-full border rounded-lg px-4 py-2"
                value={newItem}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && addItem(newItem)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 shadow-lg z-10">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-amber-50 cursor-pointer"
                      onClick={() => {
                        addItem(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items List */}
            <div>
              <h3 className="font-medium text-amber-900 mb-2">To Buy</h3>
              <div className="space-y-2 mb-6">
                {sortItems(currentList.items).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => markItemAsBought(item)}
                    className="w-full flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg group text-left transition-colors active:bg-amber-100"
                  >
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(item.added).toLocaleDateString()}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 text-green-600 p-1 rounded-full transition-all">
                        <Check size={18} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bought Items */}
              {currentList.boughtItems?.length > 0 && (
                <>
                  <h3 className="font-medium text-amber-900 mb-2">Bought Items</h3>
                  <div className="space-y-2 opacity-75">
                    {sortItems(currentList.boughtItems).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg"
                      >
                        <span className="line-through">{item.name}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.boughtAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Lists Overview */}
        {!currentList && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lists.map(list => (
              <div
                key={list.id}
                className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setCurrentList(list)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-amber-900">{list.name}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(list.created).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{list.items.length} items to buy</p>
                  {list.boughtItems?.length > 0 && (
                    <p>{list.boughtItems.length} items bought</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;