
import React from "react";
import { Calendar, CheckCircle, Circle, MessageCircle, MapPin, AlertTriangle, Heart, Cloud, Plane, Building } from "lucide-react";
import { usePlan } from "@/contexts/PlanContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'accommodation': return <Building size={12} />;
    case 'transport': return <Plane size={12} />;
    case 'health': return <Heart size={12} />;
    case 'emergency': return <AlertTriangle size={12} />;
    case 'weather': return <Cloud size={12} />;
    default: return <Circle size={12} />;
  }
};

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
    case 'medium': return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Medium Risk</Badge>;
    case 'low': return <Badge variant="outline" className="text-xs">Low Risk</Badge>;
    default: return null;
  }
};

export default function PlanPanel() {
  const { plans, toggleTodo, addTodoToChat } = usePlan();

  if (plans.length === 0) {
    return (
      <aside className="w-full max-w-md p-6 rounded-lg bg-popover shadow border flex flex-col items-center min-h-[250px]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="text-primary" size={24} />
          <span className="font-semibold text-lg">Your Plans</span>
        </div>
        <p className="text-muted-foreground text-sm text-center">
          Create travel itineraries, daily schedules, or any planning tasks via chat.
          <br />
          I'll organize everything with safety alerts, health advisories, and smart categorization!
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-full max-w-md p-4 rounded-lg bg-popover shadow border max-h-[85vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="text-primary" size={24} />
        <span className="font-semibold text-lg">Your Plans</span>
      </div>
      
      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={`border-l-4 ${
            plan.type === 'travel' ? 'border-l-blue-500' : 'border-l-primary'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{plan.title}</CardTitle>
                {plan.type === 'travel' && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    Travel Plan
                  </Badge>
                )}
              </div>
              {plan.type === 'travel' && (plan.startLocation || plan.endLocation) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin size={12} />
                  {plan.startLocation && plan.endLocation 
                    ? `${plan.startLocation} → ${plan.endLocation}`
                    : plan.startLocation || plan.endLocation
                  }
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plan.todos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-5 w-5 mt-0.5"
                      onClick={() => toggleTodo(plan.id, todo.id)}
                    >
                      {todo.completed ? (
                        <CheckCircle className="text-green-600" size={16} />
                      ) : (
                        <Circle className="text-muted-foreground" size={16} />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {todo.type && todo.type !== 'general' && (
                          <span className="text-muted-foreground">
                            {getTypeIcon(todo.type)}
                          </span>
                        )}
                        <p className={`text-sm flex-1 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </p>
                        {todo.healthAlert && (
                          <Heart className="text-orange-500" size={12} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {todo.location && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            📍 {todo.location}
                          </Badge>
                        )}
                        {todo.altitude && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            ⛰️ {todo.altitude}m
                          </Badge>
                        )}
                        {todo.riskLevel && todo.riskLevel !== 'low' && getRiskBadge(todo.riskLevel)}
                      </div>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6 opacity-60 hover:opacity-100"
                      onClick={() => addTodoToChat(todo)}
                      title="Ask about this task"
                    >
                      <MessageCircle size={12} />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Travel plan summary */}
              {plan.type === 'travel' && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Tasks: {plan.todos.length}</div>
                    <div>Completed: {plan.todos.filter(t => t.completed).length}</div>
                    <div>High Risk: {plan.todos.filter(t => t.riskLevel === 'high').length}</div>
                    <div>Health Alerts: {plan.todos.filter(t => t.healthAlert).length}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </aside>
  );
}
