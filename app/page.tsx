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
  Sparkles
} from 'lucide-react'

// Agent IDs
const AGENTS = {
  SUMMARY: '69858c4bfe576c19864be7ab',
  TASK: '69858c5ca791e6e318b8dee2',
  PLANNING: '69858c72c613a65b3c419476',
  CHAT: '69858c892237a2c55706b069'
}

// Types based on actual response structures
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
type Screen = 'landing' | 'upload' | 'dashboard'

export default function Home() {
  // Core state
  const [screen, setScreen] = useState<Screen>('landing')
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

  // Apply theme
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  // Focus timer
  useEffect(() => {
    if (focusActive && focusTimeLeft > 0) {
      const timer = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            setFocusActive(false)
            setGamificationProgress(prev => Math.min(prev + 10, 100))
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
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setLoadingSummary(true)
    try {
      const uploadResult = await uploadFiles(Array.from(files))
      if (uploadResult.success && uploadResult.asset_ids.length > 0) {
        // Call summary agent with uploaded file
        const result = await callAIAgent(
          'Extract goals, requirements, and deadlines from this document',
          AGENTS.SUMMARY,
          { assets: uploadResult.asset_ids }
        )

        if (result.success && result.response.status === 'success') {
          setSummary(result.response.result as SummaryResult)
          setScreen('dashboard')
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return

    setLoadingSummary(true)
    try {
      const result = await callAIAgent(textInput, AGENTS.SUMMARY)

      if (result.success && result.response.status === 'success') {
        setSummary(result.response.result as SummaryResult)
        setScreen('dashboard')
      }
    } catch (error) {
      console.error('Summary error:', error)
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

  // Landing Screen
  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-background transition-colors duration-200">
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-foreground">KLARIS</h1>
              <p className="text-2xl text-muted-foreground">Your Curriculum, Clarified</p>
            </div>
            <Button
              size="lg"
              onClick={() => setScreen('upload')}
              className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Upload Screen
  if (screen === 'upload') {
    return (
      <div className="min-h-screen bg-background transition-colors duration-200">
        <div className="flex items-center justify-center min-h-screen p-8">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-3xl">Upload Your Curriculum</CardTitle>
              <CardDescription>Upload files or paste your notes to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={uploadMode === 'file' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('file')}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <Button
                  variant={uploadMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('text')}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Paste Text
                </Button>
              </div>

              {uploadMode === 'file' ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-primary bg-primary/5 scale-105'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    handleFileSelect(e.dataTransfer.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">PDF, DOCX, TXT, or images</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your curriculum notes, project requirements, or study materials here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[300px] text-base"
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || loadingSummary}
                    className="w-full"
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
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar-background border-r border-sidebar-border p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-sidebar-primary">KLARIS</h1>
          <p className="text-sm text-sidebar-foreground mt-1">Your Curriculum, Clarified</p>
        </div>

        <Button
          className="mb-6 w-full"
          onClick={() => {
            setScreen('upload')
            setSummary(null)
            setTasks([])
            setTimeline([])
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>

        <div className="flex-1 overflow-y-auto">
          {summary && (
            <div className="space-y-2">
              <div className="px-3 py-2 bg-sidebar-accent rounded-lg">
                <p className="text-sm font-medium text-sidebar-accent-foreground">Current Project</p>
                <p className="text-xs text-sidebar-foreground mt-1 line-clamp-2">
                  {summary.rawNotes.slice(0, 50)}...
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-sidebar-border">
          {/* Gamification Progress */}
          <div className="px-3 py-3 bg-sidebar-accent/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-sidebar-foreground">Progress</span>
              <span className="text-xs text-sidebar-foreground">{gamificationProgress}%</span>
            </div>
            <div className="h-2 bg-sidebar-background rounded-full overflow-hidden">
              <div
                className="h-full bg-sidebar-primary transition-all duration-500"
                style={{ width: `${gamificationProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {gamificationMode === 'forest' && <Trees className="h-4 w-4 text-green-600" />}
              {gamificationMode === 'build' && <Blocks className="h-4 w-4 text-blue-600" />}
              {gamificationMode === 'companion' && <Cat className="h-4 w-4 text-purple-600" />}
              {gamificationMode === 'streak' && <Zap className="h-4 w-4 text-yellow-600" />}
              <span className="text-xs text-sidebar-foreground">
                {gamificationMode === 'forest' && 'Growing Forest'}
                {gamificationMode === 'build' && 'Building World'}
                {gamificationMode === 'companion' && 'Companion Growth'}
                {gamificationMode === 'streak' && 'Streak Meter'}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Summary Card */}
          {summary && (
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Goals
                  </h3>
                  <ul className="space-y-2">
                    {summary.goals.map((goal, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {summary.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Deadlines
                  </h3>
                  <ul className="space-y-2">
                    {summary.deadlines.map((deadline, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{deadline}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {tasks.length === 0 && (
                  <Button
                    onClick={handleGenerateTasks}
                    disabled={loadingTasks}
                    className="w-full"
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
          )}

          {/* Tasks Section */}
          {tasks.length > 0 && (
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Tasks
                </CardTitle>
                <CardDescription>Click tasks to update status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskStatus(task.id)}
                      className="p-4 border rounded-lg hover:shadow-md transition-all duration-150 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : task.status === 'in-progress' ? (
                            <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                          ) : (
                            <div className="h-5 w-5 border-2 rounded-full border-muted-foreground/30 group-hover:border-primary transition-colors" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium mb-1 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
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
                    className="w-full mt-4"
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
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
                <CardDescription>Your day-wise schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((day, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{day.day}</h3>
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 italic">{day.focus}</p>
                      <div className="space-y-2">
                        {day.tasks.map((taskId) => {
                          const task = tasks.find(t => t.id === taskId)
                          if (!task) return null
                          return (
                            <div key={taskId} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary" />
                              <span>{task.title}</span>
                              <span className="text-muted-foreground">({task.estimatedTime})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-8 right-8 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 flex items-center justify-center"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right z-50">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat Copilot
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.tip && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                      <p className="text-xs italic opacity-80">{msg.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask a question..."
                className="flex-1"
              />
              <Button onClick={handleChatSend} disabled={!chatInput.trim() || loadingChat}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSettings(false)}>
          <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
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
                      className={`p-4 border-2 rounded-lg capitalize transition-all ${
                        theme === t ? 'border-primary shadow-md scale-105' : 'border-border hover:border-primary/50'
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
                      className={`p-4 border-2 rounded-lg transition-all flex items-center gap-2 ${
                        gamificationMode === mode ? 'border-primary shadow-md scale-105' : 'border-border hover:border-primary/50'
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
                <Button onClick={() => { setShowFocusSession(true); setShowSettings(false) }} className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Start Focus Session
                </Button>
              </div>

              <Button variant="outline" onClick={() => setShowSettings(false)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Focus Session Modal */}
      {showFocusSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !focusActive && setShowFocusSession(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Focus Session
              </CardTitle>
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
                  <Button onClick={startFocusSession} className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4">{formatTime(focusTimeLeft)}</div>
                    <p className="text-muted-foreground">{focusGoal || 'Focus mode active'}</p>
                  </div>
                  <Button
                    onClick={() => { setFocusActive(false); setFocusTimeLeft(0) }}
                    variant="outline"
                    className="w-full"
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

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }

        /* Theme CSS Variables */
        .forest {
          --background: 140 30% 97%;
          --foreground: 140 50% 10%;
          --primary: 140 70% 35%;
          --primary-foreground: 0 0% 100%;
          --muted: 140 20% 90%;
          --muted-foreground: 140 30% 40%;
          --sidebar-background: 140 25% 95%;
          --sidebar-foreground: 140 40% 20%;
          --sidebar-primary: 140 70% 30%;
        }

        .paper {
          --background: 40 40% 98%;
          --foreground: 40 20% 10%;
          --primary: 40 60% 50%;
          --primary-foreground: 0 0% 100%;
          --muted: 40 30% 92%;
          --muted-foreground: 40 20% 40%;
          --sidebar-background: 40 35% 96%;
          --sidebar-foreground: 40 25% 20%;
          --sidebar-primary: 40 60% 45%;
        }

        .neo {
          --background: 280 100% 99%;
          --foreground: 280 20% 5%;
          --primary: 280 100% 60%;
          --primary-foreground: 0 0% 100%;
          --muted: 280 30% 95%;
          --muted-foreground: 280 15% 40%;
          --sidebar-background: 280 40% 97%;
          --sidebar-foreground: 280 20% 15%;
          --sidebar-primary: 280 100% 55%;
        }

        .fun {
          --background: 350 100% 98%;
          --foreground: 350 20% 10%;
          --primary: 350 100% 65%;
          --primary-foreground: 0 0% 100%;
          --muted: 350 30% 93%;
          --muted-foreground: 350 15% 40%;
          --sidebar-background: 350 40% 96%;
          --sidebar-foreground: 350 25% 20%;
          --sidebar-primary: 350 100% 60%;
        }
      `}</style>
    </div>
  )
}
