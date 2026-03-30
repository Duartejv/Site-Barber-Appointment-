import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useServicos } from "@/hooks/use-servicos";
import { useHorarios } from "@/hooks/use-horarios";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPreco(preco: number) {
  return `R$ ${preco.toFixed(0).replace(".", ",")}`;
}

export function BookingModal({ open, onOpenChange }: BookingModalProps) {
  const { servicos, loading: loadingServicos } = useServicos();
  const { slots: AVAILABLE_TIMES, loading: loadingHorarios, DEFAULT_TIME_SLOTS } = useHorarios();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [dynamicSlots, setDynamicSlots] = useState<string[]>([]);

  // 1. Buscar Horários Base Dinâmicos
  useEffect(() => {
    async function fetchBaseSlots() {
      const { data } = await supabase.from("horarios_disponiveis").select("hora").eq("ativo", true);
      if (data && data.length > 0) {
        const uniqueSlots = Array.from(new Set(data.map(d => d.hora))).sort();
        setDynamicSlots(uniqueSlots);
      } else {
        setDynamicSlots(DEFAULT_TIME_SLOTS || AVAILABLE_TIMES);
      }
    }
    fetchBaseSlots();
  }, [DEFAULT_TIME_SLOTS, AVAILABLE_TIMES]);

  // 2. Buscar Horários Bloqueados e Agendados para o dia selecionado
  useEffect(() => {
    async function fetchUnavailable() {
      if (!date) {
        setUnavailableTimes([]);
        return;
      }
      
      const [agendamentosRes, bloqueadosRes] = await Promise.all([
        supabase.from("agendamentos").select("hora").eq("data", date),
        supabase.from("horarios_bloqueados").select("hora").eq("data", date)
      ]);

      const ocupados = new Set<string>();
      if (agendamentosRes.data) agendamentosRes.data.forEach(a => ocupados.add(a.hora));
      if (bloqueadosRes.data) bloqueadosRes.data.forEach(b => ocupados.add(b.hora));

      setUnavailableTimes(Array.from(ocupados));
    }
    fetchUnavailable();
  }, [date]);

  const serviceScrollRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const timeScrollRef = useRef<HTMLDivElement>(null);

  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const label = nextDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const rawWeekday = nextDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const day = nextDate.getDate();
      const rawMonth = nextDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      dates.push({ id: nextDate.toISOString(), label, displayWeekday: rawWeekday, displayDay: day, displayMonth: rawMonth });
    }
    return dates;
  }, []);

  const scroll = (direction: "left" | "right", ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    const container = ref.current;
    const scrollAmount = 150;
    if (direction === "left") {
      if (container.scrollLeft <= 0) container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
      else container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) container.scrollTo({ left: 0, behavior: "smooth" });
      else container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !service) { toast.error("Preencha todos os campos!"); return; }
    const WHATSAPP_NUMBER = "5583900000000";
    const message = `Olá! Gostaria de agendar um horário.%0A%0A*Nome:* ${name}%0A*Telefone:* ${phone}%0A*Serviço:* ${service}%0A*Data:* ${date}%0A*Hora:* ${time}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    toast.success("A redirecionar para o WhatsApp...");
    window.open(whatsappUrl, "_blank");
    setName(""); setPhone(""); setService(""); setDate(""); setTime("");
    onOpenChange(false);
  };

  const availableTimesFiltered = dynamicSlots.filter(t => {
    // Esconde os horários que já foram agendados ou bloqueados pelo admin
    if (unavailableTimes.includes(t)) return false;

    // Esconde os horários que já passaram no relógio se o dia selecionado for hoje
    const isToday = date === availableDates[0]?.label;
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [hour, minute] = t.split(':').map(Number);
      if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) return false;
    }
    return true;
  });

  const isLoadingAny = loadingServicos || loadingHorarios;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass border-gold/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gold">Agendar Serviço</DialogTitle>
          <DialogDescription className="text-muted-foreground">Escolha o seu serviço e o melhor horário para si.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="O seu nome" className="bg-background/50 border-border/50" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="O seu número de telemóvel" className="bg-background/50 border-border/50" />
          </div>
          
          {/* Serviço */}
          <div className="flex flex-col gap-2 min-w-0 w-full">
            <Label>Serviço</Label>
            {isLoadingAny ? (
              <div className="h-10 flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> A carregar...</div>
            ) : (
              <div className="relative group w-full">
                <Button type="button" variant="outline" size="icon" onClick={() => scroll("left", serviceScrollRef)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-4 w-4" /></Button>
                <div ref={serviceScrollRef} className="flex gap-3 overflow-x-auto pb-2 w-full snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {servicos.map((s) => {
                    const isSelected = service === s.nome;
                    return (
                      <button key={s.id} type="button" onClick={() => setService(s.nome)}
                        className={`relative flex flex-col text-left rounded-lg border p-3 transition-all duration-200 flex-shrink-0 w-36 snap-start ${isSelected ? "border-gold bg-gold/10" : "border-border/50 bg-background/50 hover:border-gold/50"}`}>
                        <span className={`font-medium text-sm mb-2 ${isSelected ? "text-gold" : "text-foreground"}`}>{s.nome}</span>
                        <div className="flex items-center justify-between gap-1 w-full mt-auto">
                          <span className={`font-bold text-sm ${isSelected ? "text-gold" : "text-muted-foreground"}`}>{formatPreco(s.preco)}</span>
                          <span className="text-muted-foreground text-[10px]">{s.duracao}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => scroll("right", serviceScrollRef)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          
          {/* Dia */}
          <div className="flex flex-col gap-2 min-w-0 w-full">
            <Label>Dia</Label>
            <div className="relative group w-full">
              <Button type="button" variant="outline" size="icon" onClick={() => scroll("left", dateScrollRef)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-4 w-4" /></Button>
              <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {availableDates.map((d) => {
                  const isSelected = date === d.label;
                  return (
                    <button key={d.id} type="button" onClick={() => setDate(d.label)}
                      className={`relative flex flex-col items-center justify-center rounded-lg border py-2 px-3 transition-all duration-200 flex-shrink-0 w-20 snap-start ${isSelected ? "border-gold bg-gold/10" : "border-border/50 bg-background/50 hover:border-gold/50"}`}>
                      <span className={`text-[9px] uppercase font-semibold ${isSelected ? "text-gold" : "text-muted-foreground"}`}>{d.displayWeekday}</span>
                      <span className={`text-xl font-bold my-0.5 ${isSelected ? "text-gold" : "text-foreground"}`}>{d.displayDay}</span>
                      <span className={`text-[9px] uppercase font-semibold ${isSelected ? "text-gold" : "text-muted-foreground"}`}>{d.displayMonth}</span>
                    </button>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => scroll("right", dateScrollRef)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Hora */}
          <div className="flex flex-col gap-2 min-w-0 w-full">
            <Label>Hora</Label>
            {!date ? (
              <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-border/50 bg-background/30 text-xs text-muted-foreground w-full">Selecione um dia</div>
            ) : availableTimesFiltered.length === 0 ? (
              <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-border/50 bg-background/30 text-xs text-red-400 w-full">Nenhum horário disponível hoje.</div>
            ) : (
              <div className="relative group w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Button type="button" variant="outline" size="icon" onClick={() => scroll("left", timeScrollRef)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-4 w-4" /></Button>
                <div ref={timeScrollRef} className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {availableTimesFiltered.map((t) => {
                    const isSelected = time === t;
                    return (
                      <button key={t} type="button" onClick={() => setTime(t)}
                        className={`relative flex items-center justify-center rounded-lg border py-2 px-4 transition-all duration-200 flex-shrink-0 snap-start ${isSelected ? "border-gold bg-gold/10 text-gold" : "border-border/50 bg-background/50 hover:border-gold/50 text-foreground"}`}>
                        <span className="text-sm font-medium">{t}</span>
                      </button>
                    );
                  })}
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => scroll("right", timeScrollRef)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border-gold/50 text-gold hover:bg-gold hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          
          <Button type="submit" className="w-full mt-4 gradient-gold text-primary-foreground font-bold hover:opacity-90">Confirmar e Enviar para WhatsApp</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}