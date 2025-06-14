
import React from "react";
import { Calendar, Clock, MapPin, AlertTriangle, Plane } from "lucide-react";
import { usePlan } from "@/contexts/PlanContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function PlanSidebar() {
  const { plans } = usePlan();

  // Group plans by date and type
  const plansByDate = plans.reduce((acc, plan) => {
    const dateKey = plan.createdAt.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = { travel: [], general: [] };
    }
    if (plan.type === 'travel') {
      acc[dateKey].travel.push(plan);
    } else {
      acc[dateKey].general.push(plan);
    }
    return acc;
  }, {} as Record<string, { travel: typeof plans, general: typeof plans }>);

  const sortedDates = Object.keys(plansByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (plans.length === 0) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Clock size={16} />
              Planning History
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-4 text-center text-muted-foreground text-sm">
                No plans created yet. Start planning your travels and daily tasks to see your history here!
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Clock size={16} />
            Planning History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedDates.map((dateKey) => {
                const { travel: travelPlans, general: generalPlans } = plansByDate[dateKey];
                const date = new Date(dateKey);
                const isToday = date.toDateString() === new Date().toDateString();
                const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
                
                let displayDate;
                if (isToday) {
                  displayDate = "Today";
                } else if (isYesterday) {
                  displayDate = "Yesterday";
                } else {
                  displayDate = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  });
                }

                return (
                  <div key={dateKey} className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      <Calendar size={12} />
                      {displayDate}
                    </div>
                    
                    {/* Travel Plans */}
                    {travelPlans.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600">
                          <Plane size={10} />
                          Travel Plans
                        </div>
                        {travelPlans.map((plan) => {
                          const highRiskTasks = plan.todos.filter(t => t.riskLevel === 'high').length;
                          const healthAlerts = plan.todos.filter(t => t.healthAlert).length;
                          
                          return (
                            <SidebarMenuItem key={plan.id}>
                              <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
                                <div className="flex items-center gap-2 w-full">
                                  <span className="font-medium text-sm truncate flex-1 text-left">
                                    {plan.title}
                                  </span>
                                  {highRiskTasks > 0 && (
                                    <AlertTriangle className="text-red-500" size={12} />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                                  <span>{plan.todos.length} task{plan.todos.length !== 1 ? 's' : ''}</span>
                                  {plan.startLocation && plan.endLocation && (
                                    <span className="flex items-center gap-1">
                                      <MapPin size={10} />
                                      {plan.startLocation} → {plan.endLocation}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  {highRiskTasks > 0 && (
                                    <Badge variant="destructive" className="text-xs px-1 py-0">
                                      {highRiskTasks} high risk
                                    </Badge>
                                  )}
                                  {healthAlerts > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-800">
                                      {healthAlerts} health alert{healthAlerts !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">
                                  {plan.createdAt.toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* General Plans */}
                    {generalPlans.length > 0 && (
                      <div>
                        {travelPlans.length > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                            General Plans
                          </div>
                        )}
                        {generalPlans.map((plan) => (
                          <SidebarMenuItem key={plan.id}>
                            <SidebarMenuButton className="flex flex-col items-start gap-1 h-auto py-2">
                              <span className="font-medium text-sm truncate w-full text-left">
                                {plan.title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {plan.todos.length} task{plan.todos.length !== 1 ? 's' : ''} • {
                                  plan.createdAt.toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })
                                }
                              </span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
