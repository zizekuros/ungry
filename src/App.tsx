import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlusCircle, Share2, Trash2, ShoppingCart, ArrowLeft, Check, Copy } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
);

function App() {
  const [lists, setLists] = useState<any[]>([]);
  const [currentList, setCurrentList] = useState<any>(null);
  const [listItems, setListItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [accessKey, setAccessKey] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
      if (authMode === 'signup') {
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

  const loadLists = async () => {
    if (!user) return;

    const { data: listsData, error: listsError } = await supabase
      .from('shopping_lists')
      .select('*');
    
    if (listsError) {
      toast.error('Failed to load lists');
      return;
    }

    // Load items count for each list
    const listsWithItems = await Promise.all((listsData || []).map(async (list) => {
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', list.id);
      
      return {
        ...list,
        itemsCount: items?.filter(i => !i.bought).length || 0,
        boughtItemsCount: items?.filter(i => i.bought).length || 0
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

    const accessKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{
        name: `Shopping List ${lists.length + 1}`,
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
      setLists([...lists, { ...data, itemsCount: 0, boughtItemsCount: 0 }]);
      setCurrentList(data);
      setListItems([]);
      window.history.pushState({}, '', `?list=${data.id}`);
      toast.success('New list created!');
    }
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
      .upsert([{
        name: item.trim(),
        usage_count: 1
      }]);

    setNewItem('');
    setListItems([...listItems, itemData]);
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

  const joinList = async () => {
    if (!user) {
      toast.error('Please sign in to join a list');
      return;
    }

    if (!accessKey.trim()) {
      toast.error('Please enter an access key');
      return;
    }

    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('access_key', accessKey.trim())
      .single();

    if (error || !data) {
      toast.error('Invalid access key');
      return;
    }

    // Add user as a list member
    const { error: memberError } = await supabase
      .from('list_members')
      .insert([{
        list_id: data.id,
        member_id: user.id
      }]);

    if (memberError) {
      toast.error('Failed to join list');
      return;
    }

    setCurrentList(data);
    const { data: items } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', data.id);
    
    setListItems(items || []);
    window.history.pushState({}, '', `?list=${data.id}`);
    toast.success('Joined list successfully!');
    setAccessKey('');
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

    const updatedLists = lists.filter(l => l.id !== listId);
    setLists(updatedLists);
    setCurrentList(null);
    setListItems([]);
    window.history.pushState({}, '', '/');
    toast.success('List deleted!');
  };

  const copyInviteLink = (list: any) => {
    const url = `${window.location.origin}?list=${list.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard!');
  };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const markItemAsBought = async (item: any) => {
    if (!user) return;

    const { error } = await supabase
      .from('list_items')
      .update({ bought: true })
      .eq('id', item.id);

    if (error) {
      toast.error('Failed to update item');
      return;
    }

    setListItems(listItems.map(i => 
      i.id === item.id ? { ...i, bought: true } : i
    ));
  };

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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-yellow-50 px-6 py-2 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
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
            <div className="w-8 h-8">
              <ShoppingCart className="w-full h-full" />
            </div>
            {currentList ? (
              <button
                onClick={() => {
                  setCurrentList(null);
                  setListItems([]);
                  window.history.pushState({}, '', '/');
                }}
                className="flex items-center gap-2 hover:bg-amber-300 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
                <span className="hidden sm:inline">Back to Lists</span>
              </button>
            ) : (
              <h1 className="text-2xl font-bold">ungry</h1>
            )}
          </div>
          {!currentList && (
            <button
              onClick={createNewList}
              className="bg-yellow-50 text-amber-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-50 transition-colors"
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
          <div className="bg-yellow-50 p-4 rounded-lg shadow-md mb-4">
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
                {currentList.owner_id === user.id && (
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
                    onClick={() => markItemAsBought(item)}
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
                  <h3 className="font-medium text-amber-900 mb-2">Bought Items</h3>
                  <div className="space-y-2 opacity-75">
                    {sortItems(listItems.filter(item => item.bought)).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg"
                      >
                        <span className="line-through">{item.name}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
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
                className="bg-yellow-50 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-amber-900">{list.name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyInviteLink(list);
                      }}
                      className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                      title="Copy invite link"
                    >
                      <Copy size={18} />
                    </button>
                    <span className="text-sm text-gray-500">
                      {new Date(list.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div 
                  className="text-sm text-gray-600 cursor-pointer"
                  onClick={() => {
                    setCurrentList(list);
                    window.history.pushState({}, '', `?list=${list.id}`);
                  }}
                >
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