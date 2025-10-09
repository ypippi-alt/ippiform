import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Shield, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            IPPI FORM
          </h1>
          <Button onClick={() => navigate("/auth")}>
            Admin Login
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16 space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            IPPI FORM
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            membuat form sesuai kebutuhan anda
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border hover:shadow-lg transition-shadow">
            <FileText className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Easy Builder</h3>
            <p className="text-muted-foreground">
              Drag and drop fields to create forms in minutes
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border hover:shadow-lg transition-shadow">
            <Users className="h-10 w-10 text-accent mb-4" />
            <h3 className="text-xl font-semibold mb-2">Public Forms</h3>
            <p className="text-muted-foreground">
              Share forms publicly without requiring login
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border hover:shadow-lg transition-shadow">
            <Shield className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Admin</h3>
            <p className="text-muted-foreground">
              Protected admin panel for managing forms
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border hover:shadow-lg transition-shadow">
            <Zap className="h-10 w-10 text-accent mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Data</h3>
            <p className="text-muted-foreground">
              View and export responses instantly
            </p>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Index;
