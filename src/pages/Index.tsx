import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Github, Zap, TrendingUp, CheckCircle, Play, Settings, BarChart3, Clock, Target, Star, GitBranch, User, PlayCircle, Shield, Eye, Loader2, Activity, Calendar, GitCommit, ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = "https://ctjknzdjkqlqokryered.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0amtuemRqa3FscW9rcnllcmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTQ4MjMsImV4cCI6MjA2NjM3MDgyM30.ulCw7UKS4v-yItzoa-eDJkUe8vS0nT_ZwB9wRXKJViM";

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Webhooks
const gitWebhook = "https://n8n.srv850687.hstgr.cloud/webhook/gitmaxing";
const dataWebhook = "https://n8n.srv850687.hstgr.cloud/webhook/gitmaxingdata";

const Index = () => {
  // State management
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentialsConfirmed, setCredentialsConfirmed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  // Form data
  const [repoData, setRepoData] = useState({
    repoUrl: '',
    githubApi: '',
    triggerCount: 5,
    intervalSeconds: 5
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        toast({
          title: "Session error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        handleAuthState(session);
      }

      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        handleAuthState(session);
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to initialize authentication system",
        variant: "destructive",
      });
    }
  };

  // Handle authentication state changes
  const handleAuthState = async (session) => {
    if (session?.user) {
      setCurrentUser(session.user);
      setIsAuthenticated(true);
      await sendLoginData(session.user);
      await loadUserData(session.user);
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCredentialsConfirmed(false);
      setUserData(null);
      setIsDataLoaded(false);
      clearLocalStorage();
    }
  };

  // Send login data to backend
  const sendLoginData = async (user) => {
    try {
      const loginData = {
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        profile_image: user.user_metadata?.avatar_url || '',
        user_metadata: user.user_metadata,
        type: "login",
        timestamp: new Date().toISOString()
      };

      await fetch(dataWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });
    } catch (error) {
      console.error('Error sending login data:', error);
    }
  };

  // Load user data from backend
  const loadUserData = async (user) => {
    if (isDataLoaded) return;

    try {
      const requestData = {
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        user_metadata: user.user_metadata,
        type: "retrieveUserData",
        timestamp: new Date().toISOString()
      };

      const response = await fetch(dataWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim() !== '') {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (jsonError) {
            const jsonMatch = responseText.match(/\{.*\}/s);
            if (jsonMatch) {
              data = JSON.parse(jsonMatch[0]);
            }
          }

          if (Array.isArray(data) && data.length > 0) {
            setUserData(data[0]);
            fillFormWithUserData(data[0]);
          } else if (data && (data.user_email || data.email)) {
            setUserData(data);
            fillFormWithUserData(data);
          } else {
            loadFromLocalStorage(user);
          }
        } else {
          loadFromLocalStorage(user);
        }
      }
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      loadFromLocalStorage(user);
    }
  };

  // Fill form with user data
  const fillFormWithUserData = (data) => {
    if (!data) return;

    setRepoData(prev => ({
      ...prev,
      repoUrl: data.repo_url || '',
      githubApi: data.github_api || '',
      triggerCount: data.trigger_count || 5,
      intervalSeconds: data.interval_seconds || 5
    }));

    if (data.repo_url && data.github_api) {
      setCredentialsConfirmed(true);
    }
  };

  // Local storage functions
  const saveToLocalStorage = (data) => {
    if (!currentUser || !data) return;
    try {
      const dataToSave = { userData: data, timestamp: new Date().toISOString() };
      localStorage.setItem(`gitMaxingData_${currentUser.id}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = (user) => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`gitMaxingData_${user.id}`);
      if (saved) {
        const data = JSON.parse(saved);
        const savedTime = new Date(data.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - savedTime.getTime();

        // Only use cached data if it's less than 1 hour old
        if (timeDiff < 60 * 60 * 1000) {
          setUserData(data.userData);
          fillFormWithUserData(data.userData);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const clearLocalStorage = () => {
    if (!currentUser) return;
    try {
      localStorage.removeItem(`gitMaxingData_${currentUser.id}`);
      const execLogKey = `execLog_${currentUser.id}`;
      const execLog = localStorage.getItem(execLogKey);
      if (execLog) {
        setExecutionLog(JSON.parse(execLog));
      }
    } catch (error) {
      console.error('Error with localStorage:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        toast({
          title: "Google sign-in failed",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out successfully",
          description: "See you next time!",
        });
      }
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const confirmCredentials = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requestData = {
        user_id: currentUser.id,
        email: currentUser.email,
        name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
        profile_image: currentUser.user_metadata?.avatar_url || '',
        user_metadata: currentUser.user_metadata,
        type: "URLs",
        repoUrl: repoData.repoUrl,
        githubApi: repoData.githubApi,
        triggerCount: repoData.triggerCount,
        intervalSeconds: repoData.intervalSeconds,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(dataWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const updatedUserData = {
          ...userData,
          repo_url: repoData.repoUrl,
          github_api: repoData.githubApi,
          trigger_count: repoData.triggerCount,
          interval_seconds: repoData.intervalSeconds,
          user_email: currentUser.email,
          user_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]
        };
        
        setUserData(updatedUserData);
        setCredentialsConfirmed(true);
        saveToLocalStorage(updatedUserData);
        
        toast({
          title: "✅ Credentials confirmed!",
          description: "Your repository is now configured for Git Maxing",
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Error confirming credentials",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const manualTrigger = async () => {
    if (!credentialsConfirmed) {
      toast({
        title: "Credentials required",
        description: "Please confirm your credentials first",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(0);
    let successCount = 0;
    let failCount = 0;

    try {
      toast({
        title: "🚀 Starting Git Maxing",
        description: `Executing ${repoData.triggerCount} commits with ${repoData.intervalSeconds}s intervals`,
      });

      for (let i = 0; i < repoData.triggerCount; i++) {
        try {
          const response = await fetch(gitWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repoUrl: repoData.repoUrl,
              githubApi: repoData.githubApi,
              userEmail: currentUser.email,
              triggerType: "manual",
              timestamp: new Date().toISOString()
            })
          });

          if (response.ok) {
            successCount++;
            addToExecutionLog(repoData.repoUrl, "Success", "manual");
          } else {
            failCount++;
            addToExecutionLog(repoData.repoUrl, "Failed", "manual");
          }
        } catch (error) {
          failCount++;
          addToExecutionLog(repoData.repoUrl, "Error", "manual", error.message);
        }

        // Update progress
        setExecutionProgress(((i + 1) / repoData.triggerCount) * 100);

        if (i < repoData.triggerCount - 1) {
          await new Promise(resolve => setTimeout(resolve, repoData.intervalSeconds * 1000));
        }
      }

      toast({
        title: "🎉 Git Maxing completed!",
        description: `${successCount} successful commits, ${failCount} failed attempts`,
      });

    } catch (error) {
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      setExecutionProgress(0);
    }
  };

  const addToExecutionLog = (repoUrl, status, triggerType, errorMessage = null) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      repoUrl: repoUrl.substring(0, 50) + (repoUrl.length > 50 ? '...' : ''),
      status,
      triggerType,
      errorMessage
    };

    setExecutionLog(prev => {
      const newLog = [logEntry, ...prev].slice(0, 50);
      try {
        localStorage.setItem(`execLog_${currentUser.id}`, JSON.stringify(newLog));
      } catch (error) {
        console.error("Error saving execution log:", error);
      }
      return newLog;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-xl blur-sm opacity-50"></div>
              <div className="relative p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <Github className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Git Maxing
              </span>
              <div className="text-xs text-green-400 font-medium">Automated Commits</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-slate-400">{currentUser?.email}</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut} 
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button 
                onClick={signInWithGoogle}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-green-500/25 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Connecting...' : 'Get Started'}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <div className="py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-300 font-medium">Automate Your GitHub Contributions</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Build
            </span>
            <br />
            <span className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent">
              GitHub Profiles
            </span>
            <br />
            <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent text-5xl md:text-6xl">
              that impress
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Create consistent, professional commit patterns that showcase your dedication. 
            Automate your GitHub contributions with precision and style.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 text-lg shadow-xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              {isLoading ? 'Starting...' : 'Start Building'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-4 text-lg transition-all duration-200 backdrop-blur-sm"
            >
              <Eye className="h-5 w-5 mr-2" />
              View Examples
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2 group hover:text-green-400 transition-colors duration-200">
              <CheckCircle className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              <span>Manual Control</span>
            </div>
            <div className="flex items-center gap-2 group hover:text-green-400 transition-colors duration-200">
              <CheckCircle className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              <span>Real-time Monitoring</span>
            </div>
            <div className="flex items-center gap-2 group hover:text-green-400 transition-colors duration-200">
              <CheckCircle className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>

        {/* Before/After Section */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                See the Transformation
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Watch how Git Maxing transforms sparse contribution graphs into impressive patterns
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/40 transition-all duration-300 group">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2 group-hover:text-red-300 transition-colors duration-200">
                  <TrendingUp className="h-5 w-5 rotate-180 group-hover:scale-110 transition-transform duration-200" />
                  Before Git Maxing
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Sparse, inconsistent contribution pattern
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-1 mb-4">
                  {Array.from({ length: 84 }, (_, i) => (
                    <div 
                      key={i} 
                      className={`h-3 rounded-sm transition-all duration-200 ${
                        Math.random() > 0.8 ? 'bg-green-300/40 hover:bg-green-300/60' : 'bg-slate-700 hover:bg-slate-600'
                      }`} 
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Only 23 contributions</span>
                  <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                    Inconsistent
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-green-500/30 backdrop-blur-sm hover:bg-slate-800/40 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>
              <CardHeader className="relative">
                <CardTitle className="text-green-400 flex items-center gap-2 group-hover:text-green-300 transition-colors duration-200">
                  <TrendingUp className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  After Git Maxing
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Consistent, professional contribution pattern
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-12 gap-1 mb-4">
                  {Array.from({ length: 84 }, (_, i) => (
                    <div 
                      key={i} 
                      className={`h-3 rounded-sm transition-all duration-200 ${
                        Math.random() > 0.3 ? 'bg-green-500 hover:bg-green-400' : 'bg-green-400/60 hover:bg-green-400/80'
                      }`} 
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">147 contributions</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Consistent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tutorial Section */}
        <div className="py-20">
          <div className="bg-slate-800/20 rounded-3xl p-8 border border-slate-700/50 backdrop-blur-sm">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-6 py-3 mb-6">
                <PlayCircle className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">Step 1: Setup Tutorial</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Get Your GitHub Credentials
                </span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Follow this quick tutorial to generate your GitHub API token and start automating your commits
              </p>
            </div>
            
            <div className="max-w-5xl mx-auto">
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                <div className="aspect-video w-full mb-6">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/vE_S7b43CgI?start=38&autoplay=1&mute=1"
                    title="Git Maxing Setup Tutorial"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-xl"
                  ></iframe>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    Quick Setup Steps:
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 group">
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform duration-200">1</span>
                        <span className="group-hover:text-white transition-colors duration-200">
                          Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline transition-colors duration-200">GitHub Settings → Personal access tokens</a>
                        </span>
                      </div>
                      <div className="flex items-start gap-3 group">
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform duration-200">2</span>
                        <span className="group-hover:text-white transition-colors duration-200">Click "Generate new token" (classic)</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 group">
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform duration-200">3</span>
                        <span className="group-hover:text-white transition-colors duration-200">Select required scopes (repo access)</span>
                      </div>
                      <div className="flex items-start gap-3 group">
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform duration-200">4</span>
                        <span className="group-hover:text-white transition-colors duration-200">Copy the generated token (starts with "github_pat_")</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel Section */}
        {isAuthenticated && (
          <div className="py-20">
            <div className="bg-slate-800/20 rounded-3xl p-8 border border-slate-700/50 backdrop-blur-sm">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-6 py-3 mb-6">
                  <Settings className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">Step 2: Control Panel</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Configure & Execute Git Maxing
                  </span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Enter your credentials and start building your professional GitHub profile
                </p>
              </div>

              <div className="max-w-5xl mx-auto">
                <Tabs defaultValue="setup" className="space-y-8">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm p-1 rounded-xl">
                    <TabsTrigger 
                      value="setup" 
                      className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <Settings className="h-4 w-4" />
                      Setup
                    </TabsTrigger>
                    <TabsTrigger 
                      value="trigger" 
                      disabled={!credentialsConfirmed} 
                      className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700/50 disabled:opacity-50 rounded-lg transition-all duration-200"
                    >
                      <Play className="h-4 w-4" />
                      Execute
                    </TabsTrigger>
                    <TabsTrigger 
                      value="logs" 
                      className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Logs
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="setup" className="space-y-6">
                    <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Github className="h-5 w-5" />
                          Repository Configuration
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Configure your GitHub repository and API credentials for automated commits
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {credentialsConfirmed ? (
                          <div className="space-y-6">
                            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>
                              <div className="relative">
                                <div className="flex items-center gap-2 mb-4">
                                  <CheckCircle className="h-5 w-5 text-green-400" />
                                  <span className="font-medium text-green-300">Credentials Confirmed</span>
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
                                    Ready
                                  </Badge>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 text-sm text-green-200">
                                  <div className="space-y-2">
                                    <p><strong className="text-green-300">Repository:</strong> {repoData.repoUrl.split('/').slice(-2).join('/')}</p>
                                    <p><strong className="text-green-300">API Token:</strong> {repoData.githubApi.substring(0, 12)}...</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p><strong className="text-green-300">Commits:</strong> {repoData.triggerCount}x executions</p>
                                    <p><strong className="text-green-300">Interval:</strong> {repoData.intervalSeconds}s between commits</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              onClick={() => setCredentialsConfirmed(false)}
                              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Credentials
                            </Button>
                          </div>
                        ) : (
                          <form onSubmit={confirmCredentials} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <Github className="h-4 w-4" />
                                  GitHub Repository URL
                                </label>
                                <Input
                                  type="url"
                                  placeholder="https://github.com/username/repository"
                                  value={repoData.repoUrl}
                                  onChange={(e) => setRepoData(prev => ({ ...prev, repoUrl: e.target.value }))}
                                  required
                                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 transition-all duration-200"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  GitHub API Token
                                </label>
                                <Input
                                  type="password"
                                  placeholder="github_pat_..."
                                  value={repoData.githubApi}
                                  onChange={(e) => setRepoData(prev => ({ ...prev, githubApi: e.target.value }))}
                                  required
                                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 transition-all duration-200"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  Number of Commits
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={repoData.triggerCount}
                                  onChange={(e) => setRepoData(prev => ({ ...prev, triggerCount: parseInt(e.target.value) }))}
                                  required
                                  className="bg-slate-800/50 border-slate-600 text-white focus:border-green-500 transition-all duration-200"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Interval (seconds)
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={repoData.intervalSeconds}
                                  onChange={(e) => setRepoData(prev => ({ ...prev, intervalSeconds: parseInt(e.target.value) }))}
                                  required
                                  className="bg-slate-800/50 border-slate-600 text-white focus:border-green-500 transition-all duration-200"
                                />
                              </div>
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 shadow-lg hover:shadow-green-500/25 transition-all duration-200" 
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm Credentials
                                </>
                              )}
                            </Button>
                          </form>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="trigger" className="space-y-6">
                    <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Zap className="h-5 w-5" />
                          Execute Git Maxing
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Start your automated GitHub contribution sequence
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div className="group">
                              <div className="flex items-center justify-center gap-2 text-blue-300 mb-3 group-hover:text-blue-200 transition-colors duration-200">
                                <Target className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                                <span className="text-sm font-medium">Commits</span>
                              </div>
                              <p className="text-3xl font-bold text-blue-200">{repoData.triggerCount}</p>
                            </div>
                            <div className="group">
                              <div className="flex items-center justify-center gap-2 text-blue-300 mb-3 group-hover:text-blue-200 transition-colors duration-200">
                                <Clock className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                                <span className="text-sm font-medium">Interval</span>
                              </div>
                              <p className="text-3xl font-bold text-blue-200">{repoData.intervalSeconds}s</p>
                            </div>
                            <div className="group">
                              <div className="flex items-center justify-center gap-2 text-blue-300 mb-3 group-hover:text-blue-200 transition-colors duration-200">
                                <Activity className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                                <span className="text-sm font-medium">Total Time</span>
                              </div>
                              <p className="text-3xl font-bold text-blue-200">
                                {Math.ceil((repoData.triggerCount * repoData.intervalSeconds) / 60)}min
                              </p>
                            </div>
                          </div>
                        </div>

                        {isExecuting && (
                          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Loader2 className="h-5 w-5 text-green-400 animate-spin" />
                              <span className="text-green-300 font-medium">Executing Git Maxing...</span>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
                                {Math.round(executionProgress)}%
                              </Badge>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${executionProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <Button 
                          onClick={manualTrigger} 
                          className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105" 
                          disabled={isExecuting}
                        >
                          {isExecuting ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin" />
                              Executing Git Maxing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Play className="h-6 w-6" />
                              Start Git Maxing
                              <ArrowRight className="h-6 w-6" />
                            </div>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-6">
                    <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <BarChart3 className="h-5 w-5" />
                          Execution History
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Track your Git Maxing execution history and results
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {executionLog.length === 0 ? (
                          <div className="text-center py-16 text-slate-500">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-slate-700/20 rounded-full blur-xl"></div>
                              <BarChart3 className="relative h-16 w-16 mx-auto opacity-30" />
                            </div>
                            <p className="text-xl mb-2 text-slate-400">No executions yet</p>
                            <p className="text-sm">Start your first Git Maxing session to see logs here!</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {executionLog.map((entry, index) => (
                              <div 
                                key={entry.id}
                                className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                                  entry.status === 'Success' 
                                    ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' 
                                    : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                                }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <GitCommit className="h-4 w-4 text-slate-400" />
                                    <p className="font-medium text-sm text-slate-300">{entry.repoUrl}</p>
                                  </div>
                                  {entry.errorMessage && (
                                    <p className="text-xs text-red-400 mt-1">{entry.errorMessage}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant={entry.status === 'Success' ? 'default' : 'destructive'}
                                    className={`mb-2 ${
                                      entry.status === 'Success' 
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}
                                  >
                                    {entry.status}
                                  </Badge>
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action for Non-Authenticated Users */}
        {!isAuthenticated && (
          <div className="py-20 text-center">
            <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl p-12 border border-slate-700/50 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
              <div className="relative">
                <h2 className="text-4xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent">
                    Ready to Transform Your GitHub?
                  </span>
                </h2>
                <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-lg">
                  Join thousands of developers who have already enhanced their GitHub profiles with Git Maxing
                </p>
                <Button 
                  size="lg" 
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-10 py-5 text-lg shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-6 w-6 mr-2" />
                  )}
                  {isLoading ? 'Starting...' : 'Get Started Now'}
                  <ArrowRight className="h-6 w-6 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-12 text-center border-t border-slate-700/50 mt-20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Github className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-300">Git Maxing</span>
          </div>
          <p className="text-slate-500 text-sm">
            Automate your GitHub contributions with precision and style.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;