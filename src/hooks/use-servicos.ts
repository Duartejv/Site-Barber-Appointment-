import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Servico = {
  id: string;
  nome: string;
  preco: number;
  duracao: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export function useServicos(includeInactive = false) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServicos = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("servicos")
        .select("*")
        .order("ordem", { ascending: true });

      if (!includeInactive) {
        query = query.eq("ativo", true);
      }

      const { data, error: supaError } = await query;

      if (supaError) {
        console.error("Erro Supabase ao buscar serviços:", supaError.message, supaError.code, supaError.details);
        setError(supaError.message);
        setServicos([]);
      } else {
        console.log(`Serviços carregados: ${(data || []).length} encontrados`);
        setServicos(data || []);
      }
    } catch (err: any) {
      console.error("Erro inesperado ao buscar serviços:", err);
      setError(err.message || "Erro desconhecido");
      setServicos([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchServicos();
  }, [includeInactive]);

  return { servicos, loading, error, refetch: fetchServicos };
}