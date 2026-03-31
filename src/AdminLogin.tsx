// src/pages/AdminLogin.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Scissors, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Sessão iniciada com sucesso!");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "E-mail ou palavra-passe incorretos."
          : "Ocorreu um erro ao tentar iniciar sessão."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Voltar */}
        <Button
          variant="ghost"
          asChild
          className="mb-8 -ml-2 text-muted-foreground hover:text-gold"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao site
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 border border-gold/20 mb-4">
            <Scissors className="h-6 w-6 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Acesso <span className="text-gold italic">Restrito</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Painel de gestão do barbeiro
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-background border-b-2 border-x-0 border-t-0 border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gold text-base transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Palavra-passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 bg-background border-b-2 border-x-0 border-t-0 border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gold text-base transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 gradient-gold text-primary-foreground font-semibold tracking-widest uppercase text-sm shadow-gold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "A entrar..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
