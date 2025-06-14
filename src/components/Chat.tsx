import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, X, MapPin, AlertTriangle, Heart, HelpCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { usePlan, TodoItem, Plan, TravelRoute } from "@/contexts/PlanContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type QuestionnaireState = {
  active: boolean;
  currentQuestion: number;
  answers: Record<string, string>;
  questions: Array<{
    id: string;
    question: string;
    placeholder?: string;
  }>;
};

const TRAVEL_QUESTIONS = [
  {
    id: "destination",
    question: "Where would you like to travel to? (e.g., Hunza Valley, Khunjerab Pass)",
    placeholder: "Enter your destination..."
  },
  {
    id: "startLocation",
    question: "Where will you be starting your journey from?",
    placeholder: "e.g., Karachi, Islamabad..."
  },
  {
    id: "travelMethod",
    question: "How do you prefer to travel? (flight, road trip, train, or combination)",
    placeholder: "e.g., Flight to Gilgit then road to Hunza..."
  },
  {
    id: "accommodation",
    question: "What type of accommodation do you prefer? (hotel, guesthouse, camping, etc.)",
    placeholder: "e.g., Budget hotels, luxury resorts..."
  },
  {
    id: "duration",
    question: "How long is your trip? (number of days/weeks)",
    placeholder: "e.g., 7 days, 2 weeks..."
  },
  {
    id: "budget",
    question: "What's your approximate budget range?",
    placeholder: "e.g., Budget-friendly, mid-range, luxury..."
  },
  {
    id: "experience",
    question: "What's your experience with high-altitude travel? (beginner, experienced, expert)",
    placeholder: "This helps with health and safety planning..."
  },
  {
    id: "interests",
    question: "What activities interest you most? (sightseeing, adventure, culture, photography, etc.)",
    placeholder: "e.g., Mountain climbing, cultural tours..."
  }
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

function getLocalKey() {
  return "AIzaSyBVMBLd4aCnPB2BivydMd81VaCTyYMB398";
}

async function sendToGemini(messages: Message[], apiKey: string, questionnaireData?: Record<string, string>) {
  const systemPrompt = {
    role: "user",
    parts: [{ 
      text: `You are an advanced AI travel and planning assistant specialized in comprehensive planning including travel itineraries, route planning, health & safety considerations, emergency preparedness, and general life planning.

${questionnaireData ? `
QUESTIONNAIRE DATA PROVIDED:
${Object.entries(questionnaireData).map(([key, value]) => `${key}: ${value}`).join('\n')}

Use this information to create a highly personalized and detailed travel plan.
` : ''}

TRAVEL PLANNING EXPERTISE:
- Route optimization with altitude, weather, and safety considerations
- Transportation planning (flights, road trips, train travel)
- Accommodation recommendations with safety ratings
- Health advisories for altitude changes and medical conditions
- Emergency planning and risk assessment
- Cultural and local insights
- Weather-dependent activities and alternatives

SAFETY & HEALTH FOCUS:
- Altitude sickness prevention and monitoring
- Risk assessment for different routes and locations
- Emergency contact planning
- Medical preparation for travel
- Weather-related safety alerts
- Political/security situation awareness

GENERAL PLANNING:
- Daily schedules and time management
- Event planning and organization
- Project planning and goal setting
- Task prioritization and breakdown

When creating travel plans, always include:
1. Detailed route breakdown with stopovers
2. Risk levels and safety considerations
3. Health advisories (especially for altitude changes)
4. Weather dependencies and alternatives
5. Emergency contacts and backup plans
6. Accommodation and transport booking details

Format your responses with clear, actionable items that can be tracked as todos. Include specific locations, altitudes, risk levels, and health considerations where relevant.` 
    }],
  };

  const mapped = [systemPrompt, ...messages.map(({ role, content }) => ({
    role: role === "assistant" ? "model" : "user",
    parts: [{ text: content }],
  }))];

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: mapped }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response from Gemini."
  );
}

function shouldStartQuestionnaire(userMessage: string): boolean {
  const triggerPhrases = [
    'plan a trip',
    'travel plan',
    'going to',
    'visit',
    'trip to',
    'travel to',
    'planning to go',
    'want to travel',
    'journey to',
    'vacation to'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  return triggerPhrases.some(phrase => lowerMessage.includes(phrase));
}

function extractTravelPlanFromResponse(content: string): { title: string; todos: TodoItem[]; planData?: Partial<Plan> } | null {
  const lines = content.split('\n').filter(line => line.trim());
  const todos: TodoItem[] = [];
  let title = "New Travel Plan";
  let planData: Partial<Plan> = { type: 'travel' };
  
  // Extract title
  const titleLine = lines.find(line => 
    !line.match(/^\d+\.|^-|^\*/) && 
    line.trim().length > 5 && 
    !line.includes('**') &&
    (line.toLowerCase().includes('route') || line.toLowerCase().includes('travel') || line.toLowerCase().includes('plan'))
  );
  if (titleLine) {
    title = titleLine.trim().replace(/^#+\s*/, '');
  }
  
  // Extract locations
  const locationKeywords = ['karachi', 'islamabad', 'gilgit', 'hunza', 'naran', 'kaghan', 'chilas', 'khunjerab'];
  const startLoc = content.toLowerCase().includes('karachi') ? 'Karachi' : undefined;
  const endLoc = content.toLowerCase().includes('khunjerab') ? 'Khunjerab Pass' : undefined;
  
  if (startLoc) planData.startLocation = startLoc;
  if (endLoc) planData.endLocation = endLoc;
  
  // Extract todos with travel-specific categorization
  lines.forEach(line => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:\d+\.|[-*])\s*(.+)/);
    if (match) {
      const todoText = match[1].replace(/\*\*/g, '').trim();
      if (todoText.length > 3) {
        let type: TodoItem['type'] = 'general';
        let riskLevel: TodoItem['riskLevel'] = 'low';
        let healthAlert = false;
        let altitude: number | undefined;
        let location: string | undefined;
        
        // Categorize based on content
        const lowerText = todoText.toLowerCase();
        if (lowerText.includes('book') || lowerText.includes('hotel') || lowerText.includes('accommodation')) {
          type = 'accommodation';
        } else if (lowerText.includes('flight') || lowerText.includes('transport') || lowerText.includes('ticket') || lowerText.includes('bus') || lowerText.includes('drive')) {
          type = 'transport';
        } else if (lowerText.includes('health') || lowerText.includes('altitude') || lowerText.includes('medical') || lowerText.includes('oxygen')) {
          type = 'health';
          healthAlert = true;
        } else if (lowerText.includes('emergency') || lowerText.includes('contact') || lowerText.includes('sos') || lowerText.includes('safety')) {
          type = 'emergency';
          riskLevel = 'high';
        } else if (lowerText.includes('weather') || lowerText.includes('alert') || lowerText.includes('forecast')) {
          type = 'weather';
        }
        
        // Extract risk level
        if (lowerText.includes('high risk') || lowerText.includes('dangerous') || lowerText.includes('extreme')) {
          riskLevel = 'high';
        } else if (lowerText.includes('medium risk') || lowerText.includes('caution') || lowerText.includes('careful')) {
          riskLevel = 'medium';
        }
        
        // Extract location and altitude
        locationKeywords.forEach(keyword => {
          if (lowerText.includes(keyword)) {
            location = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          }
        });
        
        if (lowerText.includes('15000') || lowerText.includes('15,000')) altitude = 15000;
        if (lowerText.includes('4700') || lowerText.includes('4,700')) altitude = 4700;
        
        todos.push({
          id: Math.random().toString(36).slice(2),
          title: todoText,
          completed: false,
          createdAt: new Date(),
          type,
          location,
          altitude,
          riskLevel,
          healthAlert
        });
      }
    }
  });
  
  return todos.length > 0 ? { title, todos, planData } : null;
}

function formatMessageContent(content: string) {
  const lines = content.split('\n');
  const formattedLines = lines.map((line, index) => {
    const trimmedLine = line.trim();
    
    // Travel-specific formatting
    if (/🔵|🔶|🔹|🛣️|📍|🧭/.test(trimmedLine)) {
      return (
        <div key={index} className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <div className="text-blue-800 font-medium">{trimmedLine}</div>
        </div>
      );
    }
    
    // Risk level indicators
    if (trimmedLine.toLowerCase().includes('high risk') || trimmedLine.toLowerCase().includes('danger')) {
      return (
        <div key={index} className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={16} />
          <span className="text-red-800">{trimmedLine}</span>
        </div>
      );
    }
    
    // Health alerts
    if (trimmedLine.toLowerCase().includes('altitude') || trimmedLine.toLowerCase().includes('health')) {
      return (
        <div key={index} className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-center gap-2">
          <Heart className="text-orange-600" size={16} />
          <span className="text-orange-800">{trimmedLine}</span>
        </div>
      );
    }
    
    // Location indicators
    if (trimmedLine.toLowerCase().includes('karachi') || trimmedLine.toLowerCase().includes('islamabad') || 
        trimmedLine.toLowerCase().includes('gilgit') || trimmedLine.toLowerCase().includes('hunza')) {
      return (
        <div key={index} className="mb-2 flex items-center gap-2">
          <MapPin className="text-green-600" size={16} />
          <span className="text-green-800 font-medium">{trimmedLine}</span>
        </div>
      );
    }
    
    if (/^\d+\.\s*\*\*/.test(trimmedLine)) {
      const questionMatch = trimmedLine.match(/^\d+\.\s*\*\*(.+?)\*\*(.*)$/);
      if (questionMatch) {
        return (
          <div key={index} className="mb-3">
            <div className="font-semibold text-primary mb-1">{questionMatch[1].trim()}</div>
            <div className="text-sm text-muted-foreground pl-4">{questionMatch[2].trim()}</div>
          </div>
        );
      }
    }
    
    if (/^\d+\.\s+/.test(trimmedLine)) {
      return (
        <div key={index} className="mb-2 pl-4">
          <span className="font-medium text-primary">{trimmedLine}</span>
        </div>
      );
    }
    
    if (trimmedLine.includes('**')) {
      const parts = trimmedLine.split(/(\*\*.*?\*\*)/);
      return (
        <div key={index} className="mb-2">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <span key={partIndex} className="font-semibold text-primary">{part.slice(2, -2)}</span>;
            }
            return part;
          })}
        </div>
      );
    }
    
    if (trimmedLine) {
      return <div key={index} className="mb-2">{trimmedLine}</div>;
    }
    
    return <div key={index} className="mb-2"></div>;
  });
  
  return <div>{formattedLines}</div>;
}

export default function Chat() {
  const { addPlan, selectedTodo } = usePlan();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "🧭 Welcome to your comprehensive AI Travel & Planning Assistant! I'm powered by Gemini 2.5 Flash and specialized in:\n\n🗺️ **Travel Planning**: Route optimization, accommodation booking, transport coordination\n⛰️ **Safety & Health**: Altitude monitoring, risk assessment, emergency planning\n🌤️ **Weather Intelligence**: Real-time alerts, seasonal planning, backup routes\n📋 **General Planning**: Daily schedules, project management, goal setting\n\nI can help you plan everything from a Karachi to Khunjerab Pass adventure to your daily work schedule. What would you like to plan today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireState>({
    active: false,
    currentQuestion: 0,
    answers: {},
    questions: TRAVEL_QUESTIONS
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (selectedTodo) {
      const todoMessage = `I have a specific question about this ${selectedTodo.type || 'task'}: "${selectedTodo.title}"${selectedTodo.description ? ` (${selectedTodo.description})` : ''}${selectedTodo.location ? ` in ${selectedTodo.location}` : ''}${selectedTodo.altitude ? ` at ${selectedTodo.altitude}m altitude` : ''}. `;
      setInput(todoMessage);
    }
  }, [selectedTodo]);

  const startQuestionnaire = () => {
    setQuestionnaire({
      active: true,
      currentQuestion: 0,
      answers: {},
      questions: TRAVEL_QUESTIONS
    });
    
    const questionnaireMessage: Message = {
      id: Math.random().toString(36).slice(2),
      role: "assistant",
      content: `🗺️ **Travel Planning Questionnaire**\n\nI'd like to ask you a few questions to create the perfect travel plan for you. This will help me provide personalized recommendations for routes, accommodations, and safety considerations.\n\n**Question 1 of ${TRAVEL_QUESTIONS.length}**\n\n${TRAVEL_QUESTIONS[0].question}`
    };
    
    setMessages(m => [...m, questionnaireMessage]);
  };

  const handleQuestionnaireAnswer = (answer: string) => {
    const currentQ = questionnaire.questions[questionnaire.currentQuestion];
    const newAnswers = { ...questionnaire.answers, [currentQ.id]: answer };
    
    // Add user's answer to messages
    const userMessage: Message = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: answer
    };
    setMessages(m => [...m, userMessage]);

    if (questionnaire.currentQuestion < questionnaire.questions.length - 1) {
      // Move to next question
      const nextQuestionIndex = questionnaire.currentQuestion + 1;
      const nextQuestion = questionnaire.questions[nextQuestionIndex];
      
      setQuestionnaire({
        ...questionnaire,
        currentQuestion: nextQuestionIndex,
        answers: newAnswers
      });

      const nextQuestionMessage: Message = {
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: `**Question ${nextQuestionIndex + 1} of ${TRAVEL_QUESTIONS.length}**\n\n${nextQuestion.question}`
      };
      
      setMessages(m => [...m, nextQuestionMessage]);
    } else {
      // Questionnaire complete, generate travel plan
      setQuestionnaire({ ...questionnaire, active: false, answers: newAnswers });
      
      const summaryMessage = `Perfect! I have all the information I need. Let me create a comprehensive travel plan based on your preferences:\n\n${Object.entries(newAnswers).map(([key, value]) => `• ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join('\n')}\n\nGenerating your personalized travel itinerary...`;
      
      const completionMessage: Message = {
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: summaryMessage
      };
      
      setMessages(m => [...m, completionMessage]);
      
      // Generate the actual travel plan
      generateTravelPlan(newAnswers);
    }
  };

  const generateTravelPlan = async (answers: Record<string, string>) => {
    const apiKey = getLocalKey();
    if (!apiKey) {
      toast({
        title: "Gemini API key required",
        description: "Please enter your Gemini API key above.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const planningPrompt = `Based on the questionnaire responses, create a detailed travel plan for a trip from ${answers.startLocation} to ${answers.destination}. Include specific tasks for booking ${answers.travelMethod} transportation, finding ${answers.accommodation} accommodation, and safety considerations for ${answers.experience} level travelers. Duration: ${answers.duration}, Budget: ${answers.budget}, Interests: ${answers.interests}.`;
      
      const responseText = await sendToGemini([
        {
          id: "planning",
          role: "user",
          content: planningPrompt
        }
      ], apiKey, answers);
      
      const assistantMessage = { 
        id: Math.random().toString(36).slice(2), 
        role: "assistant" as const, 
        content: responseText 
      };
      setMessages(m => [...m, assistantMessage]);
      
      // Extract travel plan
      const extractedPlan = extractTravelPlanFromResponse(responseText);
      if (extractedPlan) {
        addPlan(extractedPlan.title, extractedPlan.todos, extractedPlan.planData);
        toast({
          title: "Travel plan created!",
          description: `Added ${extractedPlan.todos.length} personalized tasks to your itinerary.`,
        });
      }
    } catch (err) {
      console.error("Gemini API Error:", err);
      toast({
        title: "Error generating travel plan",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Check if we should start questionnaire
    if (!questionnaire.active && shouldStartQuestionnaire(input)) {
      const userMessage: Message = {
        id: Math.random().toString(36).slice(2),
        role: "user",
        content: input,
      };
      setMessages(m => [...m, userMessage]);
      setInput("");
      startQuestionnaire();
      return;
    }

    // Handle questionnaire responses
    if (questionnaire.active) {
      handleQuestionnaireAnswer(input);
      setInput("");
      return;
    }

    // Regular chat flow
    const apiKey = getLocalKey();
    if (!apiKey) {
      toast({
        title: "Gemini API key required",
        description: "Please enter your Gemini API key above.",
        variant: "destructive",
      });
      return;
    }
    const nextMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: input,
    };
    setMessages(m => [...m, nextMsg]);
    setLoading(true);
    setInput("");
    try {
      const responseText = await sendToGemini([...messages, nextMsg], apiKey);
      const assistantMessage = { 
        id: Math.random().toString(36).slice(2), 
        role: "assistant" as const, 
        content: responseText 
      };
      setMessages(m => [...m, assistantMessage]);
      
      // Extract travel plan
      const extractedPlan = extractTravelPlanFromResponse(responseText);
      if (extractedPlan) {
        addPlan(extractedPlan.title, extractedPlan.todos, extractedPlan.planData);
        toast({
          title: "Travel plan created!",
          description: `Added ${extractedPlan.todos.length} tasks to your itinerary.`,
        });
      }
    } catch (err) {
      console.error("Gemini API Error:", err);
      toast({
        title: "Error contacting Gemini API",
        description:
          err instanceof Error ? err.message : "Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const skipQuestionnaire = () => {
    setQuestionnaire({ ...questionnaire, active: false });
    
    const skipMessage: Message = {
      id: Math.random().toString(36).slice(2),
      role: "assistant",
      content: "No problem! You can still ask me to plan your trip, and I'll create a plan based on the information you provide in your message."
    };
    
    setMessages(m => [...m, skipMessage]);
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] w-full max-w-2xl mx-auto bg-card shadow-xl rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-bold text-lg">
          <MessageCircle className="text-primary" />
          Travel & Planning Assistant
        </span>
        <span className="text-xs text-muted-foreground">Gemini 2.5 Flash</span>
      </div>
      
      {selectedTodo && (
        <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
          <span className="text-sm text-blue-700">
            Asking about: <strong>{selectedTodo.title}</strong>
            {selectedTodo.location && <span className="ml-2 text-xs">📍 {selectedTodo.location}</span>}
            {selectedTodo.riskLevel === 'high' && <span className="ml-2 text-xs text-red-600">⚠️ High Risk</span>}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setInput("")}
            className="h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {questionnaire.active && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-blue-800">Travel Planning Questionnaire</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipQuestionnaire}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Skip questionnaire
            </Button>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((questionnaire.currentQuestion + 1) / questionnaire.questions.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Question {questionnaire.currentQuestion + 1} of {questionnaire.questions.length}
          </div>
        </div>
      )}
      
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-4 space-y-2"
        style={{ minHeight: 300 }}
      >
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={
              msg.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                "max-w-[70%] px-4 py-3 rounded-2xl shadow text-base transition-all " +
                (msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-secondary-foreground rounded-bl-sm")
              }
            >
              {msg.role === "assistant" ? formatMessageContent(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary px-4 py-2 rounded-2xl text-secondary-foreground animate-pulse flex items-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              Planning your journey...
            </div>
          </div>
        )}
      </div>
      <form
        className="p-4 border-t flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Input
          disabled={loading}
          placeholder={
            questionnaire.active 
              ? questionnaire.questions[questionnaire.currentQuestion]?.placeholder || "Enter your answer..."
              : "Plan your travel route, ask about safety, or organize any project..."
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : questionnaire.active ? (
            "Next"
          ) : (
            "Send"
          )}
        </Button>
      </form>
    </div>
  );
}
