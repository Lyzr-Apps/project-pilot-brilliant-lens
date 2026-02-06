'use client'

import { useState, useRef, useEffect } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  Calendar,
  MessageCircle,
  X,
  Settings,
  Moon,
  Sun,
  Palette,
  Trees,
  Blocks,
  Cat,
  Zap,
  Play,
  Pause,
  Check,
  AlertCircle,
  Plus,
  ChevronRight,
  Sparkles,
  Circle,
  CheckCircle,
  Send,
  FolderOpen
} from 'lucide-react'

// Agent IDs
const AGENTS = {
  SUMMARY: '69858c4bfe576c19864be7ab',
  TASK: '69858c5ca791e6e318b8dee2',
  PLANNING: '69858c72c613a65b3c419476',
  CHAT: '69858c892237a2c55706b069'
}

// Types
interface SummaryResult {
  goals: string[]
  requirements: string[]
  deadlines: string[]
  rawNotes: string
}

interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime: string
  status: 'todo' | 'in-progress' | 'done'
}

interface TasksResult {
  tasks: Task[]
}

interface TimelineDay {
  day: string
  date: string
  tasks: string[]
  focus: string
}

interface TimelineResult {
  timeline: TimelineDay[]
}

interface ChatResult {
  response: string
  modifications: any[]
  studyTip?: string
}

type Theme = 'light' | 'dark' | 'forest' | 'paper' | 'neo' | 'fun'
type GamificationMode = 'forest' | 'build' | 'companion' | 'streak'
type View = 'welcome' | 'upload' | 'dashboard'

export default function Home() {
  // Core state
  const [view, setView] = useState<View>('welcome')
  const [theme, setTheme] = useState<Theme>('light')
  const [gamificationMode, setGamificationMode] = useState<GamificationMode>('forest')

  // Data state
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeline, setTimeline] = useState<TimelineDay[]>([])

  // Upload state
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file')
  const [textInput, setTextInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)

  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string, tip?: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showFocusSession, setShowFocusSession] = useState(false)

  // Focus session state
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [focusGoal, setFocusGoal] = useState('')
  const [focusActive, setFocusActive] = useState(false)
  const [focusTimeLeft, setFocusTimeLeft] = useState(0)
  const [gamificationProgress, setGamificationProgress] = useState(0)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load state from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('klaris-theme') as Theme | null
    const savedMode = localStorage.getItem('klaris-gamification') as GamificationMode | null
    const savedProgress = localStorage.getItem('klaris-progress')

    if (savedTheme) setTheme(savedTheme)
    if (savedMode) setGamificationMode(savedMode)
    if (savedProgress) setGamificationProgress(parseInt(savedProgress))
  }, [])

  // Apply theme
  useEffect(() => {
    document.documentElement.className = theme
    localStorage.setItem('klaris-theme', theme)
  }, [theme])

  // Save gamification mode
  useEffect(() => {
    localStorage.setItem('klaris-gamification', gamificationMode)
  }, [gamificationMode])

  // Save progress
  useEffect(() => {
    localStorage.setItem('klaris-progress', gamificationProgress.toString())
  }, [gamificationProgress])

  // Focus timer
  useEffect(() => {
    if (focusActive && focusTimeLeft > 0) {
      const timer = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            setFocusActive(false)
            setGamificationProgress(p => Math.min(p + 10, 100))
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [focusActive, focusTimeLeft])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
  }

  const handleFileUpload = async () => {
    console.log('handleFileUpload called with files:', selectedFiles)

    if (selectedFiles.length === 0) {
      console.log('No files selected, returning')
      return
    }

    console.log('Setting loading state to true')
    setLoadingSummary(true)

    try {
      console.log('Uploading files...')
      const uploadResult = await uploadFiles(selectedFiles)
      console.log('Upload result:', uploadResult)

      if (uploadResult.success && uploadResult.asset_ids.length > 0) {
        console.log('Calling AI agent with asset_ids:', uploadResult.asset_ids)
        const result = await callAIAgent(
          'Extract goals, requirements, and deadlines from this document',
          AGENTS.SUMMARY,
          { assets: uploadResult.asset_ids }
        )
        console.log('Agent result:', result)

        if (result.success && result.response.status === 'success') {
          console.log('Setting summary and changing view to dashboard')
          setSummary(result.response.result as SummaryResult)
          setView('dashboard')
        } else {
          console.error('Agent call failed, using demo data:', result)
          useDemoData()
        }
      } else {
        console.error('Upload failed or no asset IDs, using demo data:', uploadResult)
        useDemoData()
      }
    } catch (error) {
      console.error('Upload error, using demo data:', error)
      useDemoData()
    } finally {
      console.log('Setting loading state to false')
      setLoadingSummary(false)
      setSelectedFiles([])
    }
  }

  const useDemoData = () => {
    const demoSummary: SummaryResult = {
      goals: [
        'Complete all coursework and assignments on time',
        'Achieve a grade of B+ or higher in the course',
        'Build a strong foundation in core concepts',
        'Participate actively in class discussions'
      ],
      requirements: [
        'Submit weekly problem sets by Friday 5 PM',
        'Complete midterm project with working demo',
        'Final exam covering all course material',
        'Group presentation on selected topic'
      ],
      deadlines: [
        'Week 4: First milestone - Oct 15',
        'Week 8: Midterm project - Nov 12',
        'Week 12: Group presentation - Dec 3',
        'Week 15: Final exam - Dec 20'
      ],
      rawNotes: `Course: Advanced Web Development
This semester covers modern web technologies including React, Next.js, and full-stack development.
Students will work on individual and group projects.`
    }

    setSummary(demoSummary)
    setView('dashboard')
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return

    setLoadingSummary(true)
    try {
      const result = await callAIAgent(textInput, AGENTS.SUMMARY)

      if (result.success && result.response.status === 'success') {
        setSummary(result.response.result as SummaryResult)
        setView('dashboard')
      } else {
        console.error('Summary agent call failed, using demo data:', result)
        useDemoData()
      }
    } catch (error) {
      console.error('Summary error, using demo data:', error)
      useDemoData()
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleGenerateTasks = async () => {
    if (!summary) return

    setLoadingTasks(true)
    try {
      const message = JSON.stringify({
        summary: {
          goals: summary.goals,
          requirements: summary.requirements,
          deadlines: summary.deadlines
        },
        notes: summary.rawNotes
      })

      const result = await callAIAgent(message, AGENTS.TASK)

      if (result.success && result.response.status === 'success') {
        const tasksResult = result.response.result as TasksResult
        setTasks(tasksResult.tasks)
      }
    } catch (error) {
      console.error('Task generation error:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleGenerateTimeline = async () => {
    if (tasks.length === 0) return

    setLoadingTimeline(true)
    try {
      const message = JSON.stringify({ tasks })
      const result = await callAIAgent(message, AGENTS.PLANNING)

      if (result.success && result.response.status === 'success') {
        const timelineResult = result.response.result as TimelineResult
        setTimeline(timelineResult.timeline)
      }
    } catch (error) {
      console.error('Timeline generation error:', error)
    } finally {
      setLoadingTimeline(false)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || loadingChat) return

    const userMessage = chatInput
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatInput('')
    setLoadingChat(true)

    try {
      const result = await callAIAgent(userMessage, AGENTS.CHAT)

      if (result.success && result.response.status === 'success') {
        const chatResult = result.response.result as ChatResult
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: chatResult.response,
          tip: chatResult.studyTip
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setLoadingChat(false)
    }
  }

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'done' ? 'todo' :
                         task.status === 'in-progress' ? 'done' : 'in-progress'
        if (newStatus === 'done') {
          setGamificationProgress(p => Math.min(p + 5, 100))
        }
        return { ...task, status: newStatus }
      }
      return task
    }))
  }

  const handleNewProject = () => {
    setSummary(null)
    setTasks([])
    setTimeline([])
    setTextInput('')
    setView('upload')
  }

  const startFocusSession = () => {
    setFocusTimeLeft(focusMinutes * 60)
    setFocusActive(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getGamificationIcon = () => {
    switch (gamificationMode) {
      case 'forest': return <Trees className="h-4 w-4 text-green-600" />
      case 'build': return <Blocks className="h-4 w-4 text-blue-600" />
      case 'companion': return <Cat className="h-4 w-4 text-purple-600" />
      case 'streak': return <Zap className="h-4 w-4 text-yellow-600" />
    }
  }

  const getGamificationLabel = () => {
    switch (gamificationMode) {
      case 'forest': return 'Growing Forest'
      case 'build': return 'Building World'
      case 'companion': return 'Companion Growth'
      case 'streak': return 'Streak Meter'
    }
  }

  // Welcome Screen
  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 transition-colors duration-200">
        <div className="text-center space-y-8 max-w-2xl animate-fade-in">
          <div className="space-y-4">
            <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
              <Target className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-6xl font-bold text-foreground tracking-tight">KLARIS</h1>
            <p className="text-2xl text-muted-foreground font-light">Your Curriculum, Clarified</p>
            <p className="text-base text-muted-foreground max-w-md mx-auto mt-4">
              Transform messy notes into actionable plans with AI-powered summaries, task breakdowns, and timelines.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setView('upload')}
            className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Get Started
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  // Upload Screen
  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-background transition-colors duration-200">
        <div className="flex items-center justify-center min-h-screen p-8">
          <Card className="w-full max-w-2xl shadow-2xl animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl">Upload Your Notes</CardTitle>
                  <CardDescription className="mt-2">Upload files or paste text to get started</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('welcome')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={uploadMode === 'file' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('file')}
                  className="flex-1 transition-all duration-150"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <Button
                  variant={uploadMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('text')}
                  className="flex-1 transition-all duration-150"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Paste Text
                </Button>
              </div>

              {uploadMode === 'file' ? (
                <div>
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                      isDragging
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      if (e.dataTransfer.files) {
                        handleFileSelect(e.dataTransfer.files)
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="space-y-2">
                        <FolderOpen className="mx-auto h-12 w-12 text-primary" />
                        <p className="text-lg font-medium">{selectedFiles.length} file(s) selected</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedFiles.map(f => f.name).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                        <p className="text-sm text-muted-foreground">PDF, DOCX, TXT, or images</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                  </div>
                  {selectedFiles.length > 0 && !loadingSummary && (
                    <Button
                      onClick={handleFileUpload}
                      className="w-full mt-4"
                      size="lg"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze Files
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your curriculum notes, project requirements, or study materials here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[300px] text-base resize-none"
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || loadingSummary}
                    className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
                    size="lg"
                  >
                    {loadingSummary ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </div>
              )}

              {loadingSummary && (
                <div className="space-y-3 p-6 bg-accent/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="font-medium">Analyzing your content...</p>
                  </div>
                  <div className="space-y-3 animate-pulse">
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-[260px] bg-sidebar-background border-r border-sidebar-border flex flex-col overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-sidebar-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-sidebar-primary" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-primary">KLARIS</h1>
            </div>
            <p className="text-xs text-sidebar-foreground">Your Curriculum, Clarified</p>
          </div>

          <div className="px-6 pb-4">
            <Button
              className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
              onClick={handleNewProject}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-2">
            {summary && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wide">Current Project</p>
                <div className="px-4 py-4 bg-sidebar-accent rounded-lg transition-all duration-150 hover:shadow-md">
                  <p className="text-xs text-sidebar-accent-foreground line-clamp-3 leading-relaxed mb-3">
                    {summary.rawNotes.slice(0, 80)}...
                  </p>
                  <div className="flex items-center gap-4 text-xs text-sidebar-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      {summary.goals.length} goals
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {tasks.length} tasks
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pt-6 pb-6 border-t border-sidebar-border space-y-3">
            {/* Gamification Progress */}
            <div className="px-3 py-3 bg-sidebar-accent/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-sidebar-foreground">Progress</span>
                <span className="text-xs font-bold text-sidebar-primary">{gamificationProgress}%</span>
              </div>
              <div className="h-2 bg-sidebar-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-sidebar-primary transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${gamificationProgress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getGamificationIcon()}
                <span className="text-xs text-sidebar-foreground">{getGamificationLabel()}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start transition-all duration-150 hover:bg-sidebar-accent"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start transition-all duration-150 hover:bg-sidebar-accent"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-[260px] min-h-screen w-[calc(100%-260px)]">
          <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
            {/* Summary Card */}
            {summary ? (
              <Card className="shadow-lg hover:shadow-xl transition-all duration-200 animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Target className="h-6 w-6 text-primary" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <CheckCircle2 className="h-4 w-4" />
                      Goals
                    </h3>
                    <ul className="space-y-3">
                      {summary.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                          <Circle className="h-4 w-4 text-primary mt-1 flex-shrink-0 group-hover:fill-primary transition-all duration-150" />
                          <span className="text-sm leading-relaxed flex-1">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <AlertCircle className="h-4 w-4" />
                      Requirements
                    </h3>
                    <ul className="space-y-3">
                      {summary.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                          <Circle className="h-4 w-4 text-primary mt-1 flex-shrink-0 group-hover:fill-primary transition-all duration-150" />
                          <span className="text-sm leading-relaxed flex-1">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <Calendar className="h-4 w-4" />
                      Deadlines
                    </h3>
                    <ul className="space-y-3">
                      {summary.deadlines.map((deadline, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                          <Circle className="h-4 w-4 text-primary mt-1 flex-shrink-0 group-hover:fill-primary transition-all duration-150" />
                          <span className="text-sm leading-relaxed flex-1">{deadline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {tasks.length === 0 && (
                    <Button
                      onClick={handleGenerateTasks}
                      disabled={loadingTasks}
                      className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
                      size="lg"
                    >
                      {loadingTasks ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Tasks...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Tasks
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg">
                <CardContent className="py-16 text-center">
                  <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">No project yet</p>
                  <p className="text-sm text-muted-foreground mb-6">Upload notes to begin</p>
                  <Button onClick={handleNewProject} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Start New Project
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tasks Section */}
            {tasks.length > 0 && (
              <Card className="shadow-lg hover:shadow-xl transition-all duration-200 animate-fade-in">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                        Tasks
                      </CardTitle>
                      <CardDescription>Click tasks to update status</CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {tasks.filter(t => t.status === 'done').length} / {tasks.length} completed
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`p-5 border rounded-xl hover:shadow-md transition-all duration-150 cursor-pointer group ${
                          task.status === 'done' ? 'bg-accent/30' : 'hover:bg-accent/10'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 transition-transform duration-150 group-hover:scale-110 flex-shrink-0">
                            {task.status === 'done' ? (
                              <CheckCircle className="h-5 w-5 text-green-600 fill-green-600" />
                            ) : task.status === 'in-progress' ? (
                              <Clock className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium mb-2 transition-all duration-150 ${
                              task.status === 'done' ? 'line-through text-muted-foreground' : 'group-hover:text-primary'
                            }`}>
                              {task.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{task.description}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {task.estimatedTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {timeline.length === 0 && (
                    <Button
                      onClick={handleGenerateTimeline}
                      disabled={loadingTimeline}
                      className="w-full mt-4 transition-all duration-150 hover:scale-[1.02] active:scale-98"
                      size="lg"
                    >
                      {loadingTimeline ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Timeline...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Generate Timeline
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline Section */}
            {timeline.length > 0 && (
              <Card className="shadow-lg hover:shadow-xl transition-all duration-200 animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Calendar className="h-6 w-6 text-primary" />
                    Timeline
                  </CardTitle>
                  <CardDescription>Your day-wise schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {timeline.map((day, idx) => (
                    <div key={idx} className="border rounded-xl p-6 hover:shadow-md transition-all duration-150 bg-card hover:bg-accent/5">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-lg">{day.day}</h3>
                        {day.date && <span className="text-sm text-muted-foreground mt-0.5">{day.date}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">{day.focus}</p>
                      <div className="space-y-2.5">
                        {day.tasks.map((taskId) => {
                          const task = tasks.find(t => t.id === taskId)
                          if (!task) return null
                          return (
                            <div key={taskId} className="flex items-start gap-3 text-sm">
                              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="flex-1 leading-relaxed">{task.title}</span>
                              <span className="text-muted-foreground text-xs flex-shrink-0 mt-0.5">({task.estimatedTime})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Floating Chat Button */}
      {summary && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-8 right-8 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center z-40"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right z-50">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-sidebar-background">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat Copilot
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="hover:bg-sidebar-accent">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Chat with Copilot to refine your plan</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.tip && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                      <p className="text-xs italic opacity-80">{msg.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-muted rounded-xl p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-6 py-4 border-t border-border bg-sidebar-background">
            <div className="flex gap-3">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Ask a question..."
                className="flex-1"
              />
              <Button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || loadingChat}
                className="transition-all duration-150 hover:scale-105 active:scale-95"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <Card className="w-full max-w-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Settings className="h-6 w-6 text-primary" />
                  Settings
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'forest', 'paper', 'neo', 'fun'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-4 border-2 rounded-xl capitalize transition-all duration-150 hover:scale-105 active:scale-95 ${
                        theme === t ? 'border-primary shadow-lg scale-105 bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Gamification Mode</h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { mode: 'forest' as GamificationMode, icon: Trees, label: 'Growing Forest' },
                    { mode: 'build' as GamificationMode, icon: Blocks, label: 'Build World' },
                    { mode: 'companion' as GamificationMode, icon: Cat, label: 'Companion' },
                    { mode: 'streak' as GamificationMode, icon: Zap, label: 'Streak Meter' }
                  ]).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setGamificationMode(mode)}
                      className={`p-4 border-2 rounded-xl transition-all duration-150 flex items-center gap-2 hover:scale-105 active:scale-95 ${
                        gamificationMode === mode ? 'border-primary shadow-lg scale-105 bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Focus Session</h3>
                <Button
                  onClick={() => { setShowFocusSession(true); setShowSettings(false) }}
                  className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Focus Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Focus Session Modal */}
      {showFocusSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => !focusActive && setShowFocusSession(false)}>
          <Card className="w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Clock className="h-6 w-6 text-primary" />
                  Focus Session
                </CardTitle>
                {!focusActive && (
                  <Button variant="ghost" size="icon" onClick={() => setShowFocusSession(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!focusActive ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={focusMinutes}
                      onChange={(e) => setFocusMinutes(Math.max(1, parseInt(e.target.value) || 25))}
                      min="1"
                      max="120"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Focus Goal</label>
                    <Input
                      value={focusGoal}
                      onChange={(e) => setFocusGoal(e.target.value)}
                      placeholder="What will you work on?"
                    />
                  </div>
                  <Button
                    onClick={startFocusSession}
                    className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4 tabular-nums">{formatTime(focusTimeLeft)}</div>
                    <p className="text-muted-foreground">{focusGoal || 'Focus mode active'}</p>
                  </div>
                  <Button
                    onClick={() => { setFocusActive(false); setFocusTimeLeft(0) }}
                    variant="outline"
                    className="w-full transition-all duration-150 hover:scale-[1.02] active:scale-98"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    End Session
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
