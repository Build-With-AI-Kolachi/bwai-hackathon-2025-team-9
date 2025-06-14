
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  type?: 'general' | 'accommodation' | 'transport' | 'health' | 'emergency' | 'weather';
  location?: string;
  altitude?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  healthAlert?: boolean;
}

export interface TravelRoute {
  id: string;
  from: string;
  to: string;
  distance?: string;
  estimatedTime?: string;
  transportMode: 'flight' | 'road' | 'train';
  altitude?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  weatherDependent?: boolean;
}

export interface Plan {
  id: string;
  title: string;
  todos: TodoItem[];
  createdAt: Date;
  type?: 'general' | 'travel' | 'business' | 'personal';
  routes?: TravelRoute[];
  startLocation?: string;
  endLocation?: string;
  travelDates?: {
    start: Date;
    end: Date;
  };
}

interface PlanContextType {
  plans: Plan[];
  addPlan: (title: string, todos: TodoItem[], planData?: Partial<Plan>) => void;
  toggleTodo: (planId: string, todoId: string) => void;
  addTodoToChat: (todo: TodoItem) => void;
  selectedTodo: TodoItem | null;
  addRoute: (planId: string, route: TravelRoute) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);

  const addPlan = (title: string, todos: TodoItem[], planData?: Partial<Plan>) => {
    const newPlan: Plan = {
      id: Math.random().toString(36).slice(2),
      title,
      todos,
      createdAt: new Date(),
      type: 'general',
      ...planData
    };
    setPlans(prev => [newPlan, ...prev]);
  };

  const toggleTodo = (planId: string, todoId: string) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? {
            ...plan,
            todos: plan.todos.map(todo =>
              todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
            )
          }
        : plan
    ));
  };

  const addTodoToChat = (todo: TodoItem) => {
    setSelectedTodo(todo);
  };

  const addRoute = (planId: string, route: TravelRoute) => {
    setPlans(prev => prev.map(plan =>
      plan.id === planId
        ? {
            ...plan,
            routes: [...(plan.routes || []), route]
          }
        : plan
    ));
  };

  return (
    <PlanContext.Provider value={{ 
      plans, 
      addPlan, 
      toggleTodo, 
      addTodoToChat, 
      selectedTodo,
      addRoute
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
