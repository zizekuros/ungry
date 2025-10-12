import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlusCircle, Share2, ArrowLeft, Check, Copy, Eye, EyeOff, Trash, Trash2, ShoppingCart, LogOut, ArrowDownAZ, ArrowDownUp, LogIn, Loader2, User, X } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import TurnstileWidget from './components/TurnstileWidget';



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
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  
  // Password reset states
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Function to process temp subscription after signup
  const processTempSubscriptionAfterSignup = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .rpc('process_user_temp_subscription', {
          user_email: userEmail
        });

      if (error) {
        console.error('Failed to process temp subscription:', error);
        return;
      }

      if (data?.success) {
        console.log('Temp subscription processed:', data.subscription_data);
        toast.success('Subscription activated!');
        
        // Refresh user data to get updated app_metadata
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        if (refreshedUser) {
          setUser(refreshedUser);
          console.log('User refreshed with updated metadata:', refreshedUser.app_metadata);
        }
      } else {
        console.log('No temp subscription found for user');
      }
    } catch (error) {
      console.error('Error processing temp subscription:', error);
    }
  };
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Check for password reset token in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    
    // Handle email confirmation errors (e.g., expired or already confirmed links)
    if (error && errorCode) {
      if (errorCode === 'otp_expired' && error === 'access_denied') {
        const message = errorDescription 
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'Email confirmation link has expired or is invalid';
        toast.error(message, { duration: 6000 });
        // Clear the error parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    
    if (type === 'recovery') {
      setShowUpdatePassword(true);
    }

    // Check if user is authenticated and fetch fresh data
    const initializeAuth = async () => {
      try {
        // Get session first to check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch fresh user data from server to get latest app_metadata (including subscription)
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          });
          
          if (response.ok) {
            const freshUserData = await response.json();
            setUser(freshUserData);
          } else {
            // Fallback to cached user if fetch fails
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      
      if (session?.user) {
        // Fetch fresh user data from server to avoid using cached/stale data
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          });
          
          if (response.ok) {
            const freshUserData = await response.json();
            setUser(freshUserData);
            console.log('Fresh user data loaded on auth state change');
          } else {
            // Fallback to session user if fetch fails
            setUser(session.user);
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data on auth state change:', error);
          // Fallback to session user if fetch fails
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
      
      setInitialLoading(false);

      // Process temp subscription when user signs in after email confirmation
      // The SIGNED_IN event fires when user clicks the confirmation link
      // Only process if user doesn't already have a subscription (edge case, happens once)
      if (session?.user?.email && _event === 'SIGNED_IN' && !session.user.app_metadata?.subscription) {
        // Run in background without blocking UI
        processTempSubscriptionAfterSignup(session.user.email).catch(err => {
          console.error('Subscription processing failed:', err);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Turnstile callback handlers
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    toast.error('Security verification failed. Please try again.');
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    toast.error('Security verification expired. Please verify again.');
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!email.trim()) {
        toast.error('Please enter your email address');
        setLoading(false);
        return;
      }

      if (!password) {
        toast.error('Please enter your password');
        setLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Password length validation for signup
      if (authMode === 'signup' && password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      // Check if Turnstile is enabled and token is required for both signin and signup
      const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true';

      if (turnstileEnabled && !turnstileToken) {
        toast.error('Please complete the security verification');
        setLoading(false);
        return;
      }

      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          // Handle manually created users who already exist
          if (error.message?.includes('User already registered')) {
            throw new Error('Account already exists. Please use "Sign In" instead, or contact support if you need help accessing your account.');
          }

          throw error;
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation is required
          toast.success('Account created! Please check your email to confirm your account.', {
            duration: 10000, // 10 seconds
          });
          setEmail('');
          setPassword('');
          setAuthMode('signin');
          return;
        }

        // Normal new user registration (auto-confirmed)
        if (data.user?.app_metadata) {
          console.log('New user app_metadata.subscription:', data.user.app_metadata.subscription);
        }

        // Process temp subscription for new user
        await processTempSubscriptionAfterSignup(email);

        toast.success('Registration successful!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Log app_metadata.subscription for signed in user
        if (data.user?.app_metadata) {
          console.log('Signed in user app_metadata.subscription:', data.user.app_metadata.subscription);
        }

        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      // Handle authentication errors with user-friendly messages
      let errorMessage = 'An error occurred. Please try again.';

      // Check for Supabase error code first, then message
      if (error.code || error.message) {
        const errorCode = error.code;
        const errorMsg = error.message || '';

        // Handle specific Supabase error codes
        if (errorCode === 'invalid_credentials' ||
          errorMsg.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (errorCode === 'email_not_confirmed' ||
          errorMsg.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account';
        } else if (errorCode === 'too_many_requests' ||
          errorMsg.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (errorMsg.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long';
        } else if (errorMsg.includes('Unable to validate email address') ||
          errorCode === 'invalid_email') {
          errorMessage = 'Please enter a valid email address';
        } else if (errorMsg.includes('User already registered') ||
          errorCode === 'user_already_exists') {
          errorMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (errorMsg.includes('Signup is disabled') ||
          errorCode === 'signup_disabled') {
          errorMessage = 'Account registration is currently disabled';
        } else if (errorCode === 'weak_password') {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (authMode === 'signin') {
          // For any other signin errors, use generic message for security
          errorMessage = 'Invalid email or password';
        } else {
          // For signup, we can be more specific about other errors
          errorMessage = errorMsg || 'Registration failed. Please try again.';
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim()) {
        toast.error('Please enter your email address');
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Check Turnstile
      const turnstileEnabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true';
      if (turnstileEnabled && !turnstileToken) {
        toast.error('Please complete the security verification');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      toast.success('Password reset link sent! Check your email.', { duration: 10000 });
      setEmail('');
      setAuthMode('signin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!newPassword) {
        toast.error('Please enter a new password');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setShowUpdatePassword(false);
      setNewPassword('');
      window.location.hash = ''; // Clear the hash
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
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
      setAuthMode('signin');
      setEmail('');
      setPassword('');
      window.history.pushState({}, '', '/');
      toast.success('Signed out successfully');
    }
  };

  const loadLists = useCallback(async () => {
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
  }, [user]);

  const loadListById = useCallback(async (id: string) => {
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
  }, [user]);

  // Load lists/items when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // Only load if user ID actually changed
    if (currentUserId && currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
      
      // Check URL for list ID
      const listId = new URLSearchParams(window.location.search).get('list');
      if (listId) {
        loadListById(listId);
      } else {
        loadLists();
      }
    } else if (!currentUserId) {
      prevUserIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createNewList = async () => {
    if (!user) {
      toast.error('Please sign in to create a list');
      return;
    }

    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    // Check subscription limits before creating list
    const { data: limitCheck, error: limitError } = await supabase.rpc('check_user_subscription_limit', {
      user_id_param: user.id,
      action_type: 'create_list'
    });

    if (limitError) {
      toast.error('Failed to check subscription limits');
      console.error('Limit check error:', limitError);
      return;
    }

    if (!limitCheck.allowed) {
      toast.error(limitCheck.message || 'Cannot create list due to subscription limits');
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

    // Check subscription limits before adding item
    const { data: limitCheck, error: limitError } = await supabase.rpc('check_user_subscription_limit', {
      user_id_param: user.id,
      action_type: 'add_item'
    });

    if (limitError) {
      toast.error('Failed to check subscription limits');
      console.error('Limit check error:', limitError);
      return;
    }

    if (!limitCheck.allowed) {
      toast.error(limitCheck.message || 'Cannot add item due to subscription limits');
      return;
    }

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

    // Log analytics event
    await supabase
      .from('user_item_analytics')
      .insert([{
        user_id: user.id,
        list_id: currentList.id,
        item_id: itemData.id,
        action: 'added'
      }]);

    setNewItem('');
    setListItems([...listItems, itemData]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewItem(e.target.value);
  };

  // Helper function to calculate effective subscription plan and status
  const getSubscriptionStatus = () => {
    const subscription = user?.app_metadata?.subscription;
    
    if (!subscription) {
      return {
        plan: 'free',
        effectivePlan: 'free',
        period: null,
        renewed: null,
        isActive: true,
        validUntil: null,
        isExpired: false
      };
    }

    const plan = subscription.plan || 'free';
    const period = subscription.period;
    const renewed = subscription.renewed;

    // Free plan is always active
    if (plan === 'free' || !renewed || !period) {
      return {
        plan,
        effectivePlan: plan,
        period,
        renewed,
        isActive: true,
        validUntil: null,
        isExpired: false
      };
    }

    // Forever period never expires
    if (period === 'forever') {
      return {
        plan,
        effectivePlan: plan,
        period,
        renewed,
        isActive: true,
        validUntil: null,
        isExpired: false
      };
    }

    // Calculate expiration date for monthly/annual
    const renewedDate = new Date(renewed);
    let validUntil: Date;

    if (period === 'annual') {
      validUntil = new Date(renewedDate);
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      validUntil.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      validUntil = new Date(renewedDate);
      validUntil.setMonth(validUntil.getMonth() + 1);
      validUntil.setHours(23, 59, 59, 999);
    } else {
      // Unknown period, treat as expired
      return {
        plan,
        effectivePlan: 'free',
        period,
        renewed,
        isActive: false,
        validUntil: renewedDate,
        isExpired: true
      };
    }

    const now = new Date();
    const isActive = now <= validUntil;

    return {
      plan,
      effectivePlan: isActive ? plan : 'free',
      period,
      renewed,
      isActive,
      validUntil,
      isExpired: !isActive
    };
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
            <h1 className="text-2xl font-bold">Ungry</h1>
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
        <Toaster position="top-center" />
        <div className="bg-yellow-50 p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-amber-900 mb-4 text-center">
            {authMode === 'reset' ? 'Reset Password' : 'Welcome to Ungry'}
          </h1>
          <form onSubmit={authMode === 'reset' ? handlePasswordReset : handleAuth} className="space-y-4">
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
            {authMode !== 'reset' && (
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
                  minLength={6}
                />
                {authMode === 'signup' && (
                  <div className="mt-1 text-xs text-amber-600">
                    <p>Password requirements:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li className={password.length >= 6 ? 'text-green-600' : 'text-amber-600'}>
                        At least 6 characters long
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {authMode === 'reset' && (
              <p className="text-sm text-gray-600">
                We'll send you a link to reset your password.
              </p>
            )}

            {/* Turnstile Widget - For signin, signup, and reset */}
            <TurnstileWidget
              key={authMode}
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                authMode === 'signin' 
                  ? 'bg-amber-400 text-yellow-50 hover:bg-amber-300' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
            </button>
          </form>
          <div className="mt-4 text-center space-y-2">
            {authMode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('reset');
                  setTurnstileToken(null);
                }}
                className="text-amber-600 hover:text-amber-700 text-sm block w-full"
              >
                Forgot password?
              </button>
            )}
            {authMode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setTurnstileToken(null);
                }}
                className="text-amber-600 hover:text-amber-700 text-sm block w-full"
              >
                Back to Sign In
              </button>
            )}
            {authMode !== 'reset' && (
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setTurnstileToken(null); // Reset token when switching modes
                }}
                className="text-amber-600 hover:text-amber-700 text-sm"
              >
                {authMode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <Toaster position="top-center" />

      {/* Update Password Modal */}
      {showUpdatePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-900">Update Password</h2>
              <button
                onClick={() => {
                  setShowUpdatePassword(false);
                  setNewPassword('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-amber-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  disabled={loading}
                  minLength={6}
                />
                <div className="mt-1 text-xs text-amber-600">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li className={newPassword.length >= 6 ? 'text-green-600' : 'text-amber-600'}>
                      At least 6 characters long
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdatePassword(false);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 text-yellow-50 px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-900">Profile Information</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-1">
                  Email
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {user?.email || 'Not available'}
                </div>
              </div>

              {(() => {
                const status = getSubscriptionStatus();
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-1">
                        Current Plan
                      </label>
                      <div className={`p-3 rounded-lg font-medium bg-gray-100 text-gray-700`}>
                        {status.effectivePlan.charAt(0).toUpperCase() + status.effectivePlan.slice(1)}
                        {status.isExpired && status.plan !== 'free' && (
                          <span className="ml-2 text-xs text-red-600">(Subscription Expired)</span>
                        )}
                      </div>
                    </div>

                    {status.plan !== 'free' && status.plan !== status.effectivePlan && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <p className="text-sm text-amber-800">
                          ⚠️ Your <strong>{status.plan}</strong> subscription has expired. You're currently using the app with <strong>Free plan</strong> limits until you renew.
                        </p>
                      </div>
                    )}

                    {status.plan !== 'free' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-amber-700 mb-1">
                            Subscription Plan
                          </label>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {status.plan.charAt(0).toUpperCase() + status.plan.slice(1)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-amber-700 mb-1">
                            Subscription Period
                          </label>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {status.period ? status.period.charAt(0).toUpperCase() + status.period.slice(1) : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-amber-700 mb-1">
                            Renewed Date
                          </label>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {status.renewed ? new Date(status.renewed).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </div>
                        </div>

                        {status.validUntil && status.isActive && (
                          <div>
                            <label className="block text-sm font-medium text-amber-700 mb-1">
                              Valid Until
                            </label>
                            <div className="bg-green-50 p-3 rounded-lg text-green-700">
                              {status.validUntil.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        )}

                        {status.validUntil && !status.isActive && (
                          <div>
                            <label className="block text-sm font-medium text-amber-700 mb-1">
                              Expired On
                            </label>
                            <div className="bg-red-50 p-3 rounded-lg text-red-700">
                              {status.validUntil.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        )}

                        {status.period === 'forever' && (
                          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                            <p className="text-sm text-purple-800">
                              ✨ You have a <strong>lifetime subscription</strong>. Your subscription never expires!
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) {
                      toast.error('No active session');
                      return;
                    }
                    
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                      }
                    });
                    
                    if (response.ok) {
                      const userData = await response.json();
                      setUser(userData);
                      toast.success('Profile data refreshed!');
                    } else {
                      toast.error('Failed to refresh profile data');
                    }
                  } catch (error) {
                    console.error('Failed to refresh user metadata:', error);
                    toast.error('Error refreshing profile data');
                  }
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Refresh Profile
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="bg-amber-400 text-yellow-50 px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-amber-400 text-yellow-50 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Ungry</h1>
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
              onClick={() => setShowProfileModal(true)}
              className="bg-yellow-50 text-amber-600 p-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 hover:bg-amber-50 transition-colors"
              title="Profile"
            >
              <User size={20} />
              <span className="hidden sm:inline">Profile</span>
            </button>
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
              />
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