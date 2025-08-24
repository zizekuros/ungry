import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlusCircle, Share2, ArrowLeft, Check, Copy, Eye, EyeOff, Trash, Trash2, ShoppingCart, LogOut, ArrowDownAZ, ArrowDownUp, LogIn, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import TurnstileWidget from './components/TurnstileWidget';

// Generate random math problem
const generateMathProblem = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer;
  switch (operator) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
    default:
      answer = 0;
  }
  
  return {
    question: `${num1} ${operator} ${num2} = ?`,
    answer: answer.toString()
  };
};

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      persistSession: true
    }
  }
);



function App() {
  const [lists, setLists] = useState<any[]>([]);
  const [currentList, setCurrentList] = useState<any>(null);
  const [listItems, setListItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [mathProblem, setMathProblem] = useState(generateMathProblem());
  const [mathAnswer, setMathAnswer] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const initializeAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setInitialLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Check URL for list ID
      const listId = new URLSearchParams(window.location.search).get('list');
      if (listId) {
        loadListById(listId);
      } else {
        loadLists();
      }
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if Turnstile is enabled and token is required
      const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true';
      if (turnstileEnabled && !turnstileToken) {
        toast.error('Please complete the security verification');
        setLoading(false);
        return;
      }

      if (authMode === 'signup') {
        if (mathAnswer !== mathProblem.answer) {
          toast.error('Incorrect answer to the math problem');
          setMathProblem(generateMathProblem());
          setMathAnswer('');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      setCurrentList(null);
      setListItems([]);
      window.history.pushState({}, '', '/');
      toast.success('Signed out successfully');
    }
  };

  const loadLists = async () => {
    if (!user) return;

    const { data: listsData, error: listsError } = await supabase
      .from('shopping_lists')
      .select('*');
    
    if (listsError) {
      toast.error('Failed to load lists');
      return;
    }

    // Load items count and membership status for each list
    const listsWithItems = await Promise.all((listsData || []).map(async (list) => {
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', list.id);
      
      // Check if user is a member of this list
      const { data: membership } = await supabase
        .from('list_members')
        .select('*')
        .eq('list_id', list.id)
        .eq('member_id', user.id)
        .maybeSingle();
      
      return {
        ...list,
        itemsCount: items?.filter(i => !i.bought).length || 0,
        boughtItemsCount: items?.filter(i => i.bought).length || 0,
        isMember: !!membership
      };
    }));

    setLists(listsWithItems);
  };

  const loadListById = async (id: string) => {
    if (!user) return;

    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (listError) {
      toast.error('Failed to load list');
      return;
    }

    if (list) {
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', id);

      setCurrentList(list);
      setListItems(items || []);
      // Update URL
      window.history.pushState({}, '', `?list=${list.id}`);
    }
  };

  const createNewList = async () => {
    if (!user) {
      toast.error('Please sign in to create a list');
      return;
    }

    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    const accessKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{
        name: newListName.trim(),
        access_key: accessKey,
        owner_id: user.id
      }])
      .select()
      .single();

    if (error) {
      toast.error('Failed to create list');
      return;
    }

    if (data) {
      await loadLists();
      setCurrentList(data);
      setListItems([]);
      window.history.pushState({}, '', `?list=${data.id}`);
      toast.success('New list created!');
      setNewListName('');
    }
  };

  const joinList = async () => {
    if (!user) {
      toast.error('Please sign in to join a list');
      return;
    }

    if (!accessKey.trim()) {
      toast.error('Please enter an access key');
      return;
    }

    // Use a raw query with match_phrase to find the list
    const { data: lists, error: listError } = await supabase
      .rpc('find_list_by_access_key', {
        key: accessKey.trim()
      });

    if (listError || !lists || lists.length === 0) {
      toast.error('Invalid access key');
      return;
    }

    const list = lists[0];

    // Check if user is already a member
    const { data: members, error: memberError } = await supabase
      .from('list_members')
      .select('*')
      .eq('list_id', list.id)
      .eq('member_id', user.id);

    if (memberError) {
      toast.error('Failed to check membership');
      return;
    }

    if (members && members.length > 0) {
      toast.error('You are already a member of this list');
      return;
    }

    // Add user as a list member
    const { error: insertError } = await supabase
      .from('list_members')
      .insert([{
        list_id: list.id,
        member_id: user.id
      }]);

    if (insertError) {
      toast.error('Failed to join list');
      return;
    }

    await loadLists();
    setCurrentList(list);
    const { data: items } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id);
    
    setListItems(items || []);
    window.history.pushState({}, '', `?list=${list.id}`);
    toast.success('Joined list successfully!');
    setAccessKey('');
  };

  const addItem = async (item: string) => {
    if (!item.trim() || !currentList || !user) return;

    const { data: itemData, error: itemError } = await supabase
      .from('list_items')
      .insert([{
        list_id: currentList.id,
        name: item.trim()
      }])
      .select()
      .single();

    if (itemError) {
      toast.error('Failed to add item');
      return;
    }

    // Update suggestions
    await supabase
      .from('item_suggestions')
      .upsert({
        name: item.trim(),
        usage_count: 1,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'name'
      });

    setNewItem('');
    setListItems([...listItems, itemData]);
    setShowSuggestions(false);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewItem(value);
    
    if (value.trim()) {
      const { data } = await supabase
        .from('item_suggestions')
        .select('name')
        .ilike('name', `%${value}%`)
        .order('usage_count', { ascending: false })
        .limit(5);

      setSuggestions(data?.map(s => s.name) || []);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const deleteList = async (listId: string) => {
    if (!user) return;

    if (!window.confirm('Are you sure you want to delete this list?')) {
      return;
    }

    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', listId)
      .eq('owner_id', user.id);

    if (error) {
      toast.error('Failed to delete list');
      return;
    }

    await loadLists();
    if (currentList?.id === listId) {
      setCurrentList(null);
      setListItems([]);
      window.history.pushState({}, '', '/');
    }
    toast.success('List deleted!');
  };

  const leaveList = async (listId: string) => {
    if (!user) return;

    if (!window.confirm('Are you sure you want to leave this list?')) {
      return;
    }

    const { error } = await supabase
      .from('list_members')
      .delete()
      .eq('list_id', listId)
      .eq('member_id', user.id);

    if (error) {
      toast.error('Failed to leave list');
      return;
    }

    await loadLists();
    if (currentList?.id === listId) {
      setCurrentList(null);
      setListItems([]);
      window.history.pushState({}, '', '/');
    }
    toast.success('Left the list successfully!');
  };

  const copyAccessKey = (list: any) => {
    navigator.clipboard.writeText(list.access_key);
    toast.success('Access key copied to clipboard!');
  };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const toggleItemBought = async (item: any) => {
    if (!user) return;

    const { error } = await supabase
      .from('list_items')
      .update({ bought: !item.bought })
      .eq('id', item.id);

    if (error) {
      toast.error('Failed to update item');
      return;
    }

    setListItems(listItems.map(i => 
      i.id === item.id ? { ...i, bought: !i.bought } : i
    ));
  };

  const clearBoughtItems = async () => {
    if (!user || !currentList) return;

    if (!window.confirm('Are you sure you want to clear all bought items?')) {
      return;
    }

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', currentList.id)
      .eq('bought', true);

    if (error) {
      toast.error('Failed to clear bought items');
      return;
    }

    setListItems(listItems.filter(item => !item.bought));
    toast.success('Bought items cleared!');
  };

  const navigateToList = async (list: any) => {
    setCurrentList(list);
    const { data: items } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id);
    
    setListItems(items || []);
    window.history.pushState({}, '', `?list=${list.id}`);
  };

  // Show loading spinner while checking authentication
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-amber-600">
            <ShoppingCart className="w-8 h-8" />
            <h1 className="text-2xl font-bold">ungry</h1>
          </div>
          <div className="flex items-center gap-2 text-amber-700">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="bg-yellow-50 p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-amber-900 mb-4 text-center">Welcome to ungry</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-amber-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-amber-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                required
              />
            </div>
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-amber-700">
                  Solve this problem to prove you're human
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-amber-900">{mathProblem.question}</span>
                  <input
                    type="text"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Turnstile Widget */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken(null);
                toast.error('Security verification failed. Please try again.');
              }}
              onExpire={() => {
                setTurnstileToken(null);
                toast.error('Security verification expired. Please verify again.');
              }}
            />
            
            <button
              type="submit"
              disabled={loading || (authMode === 'signup' && !mathAnswer)}
              className="w-full bg-amber-400 text-yellow-50 px-6 py-2 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setMathProblem(generateMathProblem());
                setMathAnswer('');
                setTurnstileToken(null);
              }}
              className="text-amber-600 hover:text-amber-700 text-sm"
            >
              {authMode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-amber-400 text-yellow-50 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            <h1 className="text-2xl font-bold">ungry</h1>
          </div>
          <div className="flex items-center gap-4">
            {!currentList && (
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New List"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="px-3 py-2 rounded-lg text-amber-900"
                />
                <button
                  onClick={createNewList}
                  className="bg-yellow-50 text-amber-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-50 transition-colors whitespace-nowrap"
                >
                  <PlusCircle size={20} />
                  <span className="hidden sm:inline">Create</span>
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-yellow-50 text-amber-600 p-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 hover:bg-amber-50 transition-colors"
              title="Sign out"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Create List Button */}
      {!currentList && (
        <div className="sm:hidden p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New List"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border"
            />
            <button
              onClick={createNewList}
              className="bg-amber-400 text-yellow-50 p-2 rounded-lg flex items-center"
            >
              <PlusCircle size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Join List Section */}
        {!currentList && (
          <div className="bg-yellow-50 p-4 rounded-lg shadow-md mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Join list with access key"
                className="flex-1 border rounded-lg px-4 py-2"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
              <button
                onClick={joinList}
                className="bg-amber-400 text-yellow-50 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-300 transition-colors"
              >
                <Share2 size={20} />
                Join
              </button>
            </div>
          </div>
        )}

        {/* Current List */}
        {currentList && (
          <div className="bg-yellow-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setCurrentList(null);
                    setListItems([]);
                    window.history.pushState({}, '', '/');
                    loadLists();
                  }}
                  className="text-amber-700"
                >
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-semibold text-amber-900">{currentList.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAccessKey(!showAccessKey)}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                  title={showAccessKey ? "Hide access key" : "Show access key"}
                >
                  {showAccessKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {showAccessKey && (
                  <span className="text-sm font-mono bg-amber-100 px-2 py-1 rounded">
                    {currentList.access_key}
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Sort items"
                  >
                    {sortBy === 'name' ? <ArrowDownAZ size={18} /> : <ArrowDownUp size={18} />}
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          setSortBy('date');
                          setShowSortMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-amber-50 rounded-t-lg"
                      >
                        Sort by Date
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('name');
                          setShowSortMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-amber-50 rounded-b-lg"
                      >
                        Sort by Name
                      </button>
                    </div>
                  )}
                </div>
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
                list="item-suggestions"
              />
              <datalist id="item-suggestions">
                {suggestions.map((suggestion, index) => (
                  <option key={index} value={suggestion} />
                ))}
              </datalist>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-yellow-50 border rounded-lg mt-1 shadow-lg z-10">
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
                {sortItems(listItems.filter(item => !item.bought)).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemBought(item)}
                    className="w-full flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg group text-left transition-colors active:bg-amber-100"
                  >
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 text-green-600 p-1 rounded-full transition-all">
                        <Check size={18} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bought Items */}
              {listItems.some(item => item.bought) && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-amber-900">Bought Items</h3>
                    <button
                      onClick={clearBoughtItems}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                    >
                      <Trash size={16} />
                      Clear bought items
                    </button>
                  </div>
                  <div className="space-y-2 opacity-75">
                    {sortItems(listItems.filter(item => item.bought)).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItemBought(item)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <span className="line-through">{item.name}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </button>
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
                onClick={() => navigateToList(list)}
                className="bg-yellow-50 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-amber-900">{list.name}</h3>
                  <div className="flex items-center gap-2">
                    {list.owner_id === user.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteList(list.id);
                        }}
                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                        title="Delete list"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : list.isMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveList(list.id);
                        }}
                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-amber-600 hover:text-amber-700"
                        title="Leave list"
                      >
                        <LogIn size={18} className="rotate-180" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAccessKey(list);
                      }}
                      className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                      title="Copy access key"
                    >
                      <Copy size={18} />
                    </button>
                    <span className="text-sm text-gray-500">
                      {new Date(list.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{list.itemsCount} items to buy</p>
                  {list.boughtItemsCount > 0 && (
                    <p>{list.boughtItemsCount} items bought</p>
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