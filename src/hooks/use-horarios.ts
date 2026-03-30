import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Horario = {
  id: string; hora: string; ativo: boolean; ordem: number; created_at: string; barbeiro?: string;
};

const DEFAULT_TIME_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30","12:00",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00",
];

function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function useHorarios(barbeiro?: string) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [slots, setSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHorarios = useCallback(async () => {
    if (!barbeiro) {
      setHorarios([]);
      setSlots(DEFAULT_TIME_SLOTS);
      return;
    }
    setLoading(true); setError(null);
    try {
      if (barbeiro === "todos") {
        setHorarios([]);
        setSlots(DEFAULT_TIME_SLOTS);
        setLoading(false);
        return;
      }

      const { data, error: err } = await (supabase.from("horarios_disponiveis") as any)
        .select("*")
        .eq("barbeiro", barbeiro)
        .order("ordem", { ascending: true });

      if (err) { 
        console.error("Fetch horarios error:", err);
        setError(err.message); 
        setSlots(DEFAULT_TIME_SLOTS); 
      } else if (data && data.length > 0) {
        const sorted = (data as Horario[]).sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
        setHorarios(sorted);
        const active = sorted.filter(h => h.ativo).map(h => h.hora);
        setSlots(active.length > 0 ? active : DEFAULT_TIME_SLOTS);
      } else { 
        setHorarios([]);
        setSlots(DEFAULT_TIME_SLOTS); 
      }
    } catch (e: any) { 
      console.error("Fetch horarios unexpected error:", e);
      setError(e.message); 
      setSlots(DEFAULT_TIME_SLOTS); 
    }
    setLoading(false);
  }, [barbeiro]);

  useEffect(() => { fetchHorarios(); }, [fetchHorarios]);

  // ================================================================
  // FIX: syncHorarios — verificar delete + verificar insert
  // ================================================================
  const syncHorarios = async (newSlots: string[]) => {
    if (!barbeiro || barbeiro === "todos") {
      throw new Error("Selecione um barbeiro específico para editar.");
    }
    
    // 1. Apagar horários existentes desse barbeiro — COM verificação
    const { error: deleteError } = await (supabase.from("horarios_disponiveis") as any)
      .delete()
      .eq("barbeiro", barbeiro)
      .select();

    // Nota: deleteError pode ser null mesmo que 0 linhas foram deletadas (tabela vazia),
    // então só checamos erro real aqui
    if (deleteError) {
      console.error("syncHorarios delete error:", deleteError);
      throw new Error("Erro ao limpar horários antigos: " + deleteError.message);
    }
      
    // 2. Inserir os novos
    const sorted = [...newSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    const rows = sorted.map((hora, idx) => ({ hora, ordem: idx + 1, ativo: true, barbeiro }));
    
    if (rows.length > 0) {
      const { data, error: insertError } = await (supabase.from("horarios_disponiveis") as any)
        .insert(rows)
        .select();

      if (insertError) {
        console.error("syncHorarios insert error:", insertError);
        throw new Error("Erro ao gravar novos horários: " + insertError.message);
      }
      if (!data || data.length === 0) {
        console.error("syncHorarios insert: nenhuma linha inserida (provável bloqueio RLS)");
        throw new Error("Não foi possível gravar os horários. Verifique as permissões (RLS) no Supabase.");
      }

      const s = (data as Horario[]).sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
      setHorarios(s);
      setSlots(s.map(h => h.hora));
    } else { 
      setHorarios([]); 
      setSlots([]); 
    }
  };

  return { horarios, slots, loading, error, refetch: fetchHorarios, syncHorarios, DEFAULT_TIME_SLOTS };
}

export function useHorariosBloqueados(data?: string, barbeiro?: string) {
  const [bloqueados, setBloqueados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBloqueados = useCallback(async () => {
    if (!data || !barbeiro || barbeiro === "todos") { 
      setBloqueados([]); 
      return; 
    }
    setLoading(true);
    try {
      const { data: rows, error } = await (supabase.from("horarios_bloqueados") as any)
        .select("hora")
        .eq("data", data)
        .eq("barbeiro", barbeiro);
        
      if (error) {
        console.error("Fetch bloqueados error:", error);
        setBloqueados([]);
      } else if (rows) {
        setBloqueados(rows.map((r: any) => r.hora));
      } else {
        setBloqueados([]);
      }
    } catch (e) { 
      console.error("Fetch bloqueados unexpected error:", e);
      setBloqueados([]); 
    }
    setLoading(false);
  }, [data, barbeiro]);

  useEffect(() => { fetchBloqueados(); }, [fetchBloqueados]);

  // ================================================================
  // FIX: bloquear — adicionado .select() + verificação
  // ================================================================
  const bloquear = async (hora: string) => {
    if (!data || !barbeiro || barbeiro === "todos") return;

    const { data: inserted, error } = await (supabase.from("horarios_bloqueados") as any)
      .insert([{ data, hora, barbeiro }])
      .select();

    if (error) {
      // 23505 = unique violation (já existe) — não é erro real
      if (error.code === "23505") {
        // Já estava bloqueado, atualizar estado local
        setBloqueados(prev => prev.includes(hora) ? prev : [...prev, hora]);
        return;
      }
      console.error("Bloquear error:", error);
      throw new Error("Erro ao bloquear horário: " + error.message);
    }
    if (!inserted || inserted.length === 0) {
      console.error("Bloquear: nenhuma linha inserida (provável bloqueio RLS)");
      throw new Error("Não foi possível bloquear. Verifique as permissões (RLS) no Supabase.");
    }

    setBloqueados(prev => prev.includes(hora) ? prev : [...prev, hora]);
  };

  // ================================================================
  // FIX: desbloquear — adicionado .select() + verificação
  // ================================================================
  const desbloquear = async (hora: string) => {
    if (!data || !barbeiro || barbeiro === "todos") return;

    const { data: deleted, error } = await (supabase.from("horarios_bloqueados") as any)
      .delete()
      .eq("data", data)
      .eq("hora", hora)
      .eq("barbeiro", barbeiro)
      .select();

    if (error) {
      console.error("Desbloquear error:", error);
      throw new Error("Erro ao desbloquear horário: " + error.message);
    }
    if (!deleted || deleted.length === 0) {
      console.error("Desbloquear: nenhuma linha removida (provável bloqueio RLS)");
      throw new Error("Não foi possível desbloquear. Verifique as permissões (RLS) no Supabase.");
    }

    setBloqueados(prev => prev.filter(h => h !== hora));
  };

  return { bloqueados, loading, refetch: fetchBloqueados, bloquear, desbloquear };
}