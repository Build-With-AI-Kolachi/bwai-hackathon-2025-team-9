
import Chat from "@/components/Chat";
import PlanPanel from "@/components/PlanPanel";
import PlanSidebar from "@/components/PlanSidebar";
import { PlanProvider } from "@/contexts/PlanContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  return (
    <PlanProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-background flex w-full">
          <PlanSidebar />
          <div className="flex-1 flex flex-col">
            <header className="py-4 px-6 border-b shadow-sm bg-gradient-to-r from-background to-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <h1 className="font-extrabold text-2xl tracking-tight text-primary">Chat Planner</h1>
                </div>
                <span className="text-muted-foreground text-sm hidden sm:inline">Your conversational daily planning assistant</span>
              </div>
            </header>
            <main className="flex-1 flex flex-row items-stretch justify-center bg-background overflow-hidden max-w-7xl mx-auto w-full py-8 px-4 gap-6">
              <section className="flex-1 flex flex-col justify-center min-w-[380px] max-w-2xl">
                <Chat />
              </section>
              <aside className="flex-shrink-0 min-w-[350px] max-w-md hidden lg:flex items-center">
                <PlanPanel />
              </aside>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PlanProvider>
  );
};

export default Index;
