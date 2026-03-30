import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServicos } from "@/hooks/use-servicos";
import { useHorarios, useHorariosBloqueados } from "@/hooks/use-horarios";
import bgImg from "@/assets/barbershop-1.png";
import logoImg from "@/assets/logo-texto.png";

import fotoJoao from "@/assets/joao.png";
import fotoGabriel from "@/assets/gabriel.png";

const BARBERS = [
  { id: "João", name: "João", photo: fotoJoao },
  { id: "Gabriel", name: "Gabriel", photo: fotoGabriel },
];

function formatPreco(preco: number) { return `R$ ${preco.toFixed(0)}`; }
function formatPrecoDecimal(preco: number) { return `R$ ${preco.toFixed(2).replace(".", ",")}`; }
function getDuracaoEmMinutos(duracao: string): number {
  if (!duracao) return 30; const t = duracao.toLowerCase().trim(); let m = 0;
  if (t.includes('h')) { const p = t.split('h'); m = (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); }
  else m = parseInt(t.replace(/\\D/g, '')) || 30;
  return m > 0 ? m : 30;
}
function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number); return h * 60 + m;
}
function minutesToTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}
function getSlotInterval(slots: string[]): number {
  if (slots.length < 2) return 30; let minGap = Infinity;
  const sorted = [...slots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  for (let i = 1; i < sorted.length; i++) { const gap = timeToMinutes(sorted[i]) - timeToMinutes(sorted[i - 1]); if (gap > 0 && gap < minGap) minGap = gap; }
  return minGap === Infinity ? 30 : minGap;
}

const DISCOUNT_QUESTIONS = [
  { id: "flamengo", label: "Você torce para o Flamengo?" },
  { id: "onepiece", label: "Você assiste One Piece?" },
  { id: "sousa", label: "Você é do município de Sousa?" },
];
const DISCOUNT_PER_YES = 0.30;

export default function Booking() {
  const navigate = useNavigate();
  const { servicos, loading: loadingServicos, error: errorServicos, refetch: refetchServicos } = useServicos();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [service, setService] = useState(""); const [barber, setBarber] = useState("");
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { slots: AVAILABLE_TIMES, loading: loadingHorarios } = useHorarios(barber);
  const [answers, setAnswers] = useState<Record<string, boolean>>({ flamengo: false, onepiece: false, sousa: false });
  const yesCount = Object.values(answers).filter(Boolean).length;
  const discountPercent = yesCount * DISCOUNT_PER_YES;
  const discountMultiplier = 1 - discountPercent;
  const toggleAnswer = (id: string) => { setAnswers(prev => ({ ...prev, [id]: !prev[id] })); };
  const [bookedIntervals, setBookedIntervals] = useState<{ start: number; end: number }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const { bloqueados, loading: loadingBloqueados } = useHorariosBloqueados(date || undefined, barber);
  const serviceScrollRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const timeScrollRef = useRef<HTMLDivElement>(null);

  const availableDates = useMemo(() => {
    const dates = []; const today = new Date();
    for (let i = 0; i < 15; i++) {
      const nextDate = new Date(today); nextDate.setDate(today.getDate() + i);
      const label = nextDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      dates.push({ id: nextDate.toISOString(), label, displayWeekday: nextDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), displayDay: nextDate.getDate(), displayMonth: nextDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), dayOfWeek: nextDate.getDay() });
    }
    return dates;
  }, []);

  useEffect(() => {
    async function fetchBookedTimes() {
      if (!date || !barber) { setBookedIntervals([]); return; }
      setLoadingTimes(true); setTime("");
      
      // Utilizando a VIEW para ler as marcações ocupadas
      const { data: agData, error } = await supabase
        .from('vw_agenda_completa')
        .select('hora, servico_nome')
        .eq('data', date)
        .eq('barbeiro_nome', barber);

      if (error) { 
        toast.error("Erro ao verificar horários."); 
      } else { 
        setBookedIntervals((agData || []).map(a => { 
          const svc = servicos.find(s => s.nome === a.servico_nome); 
          const dur = svc ? getDuracaoEmMinutos(svc.duracao) : 30; 
          const start = timeToMinutes(a.hora); 
          return { start, end: start + dur }; 
        })); 
      }
      setLoadingTimes(false);
    }
    if (servicos.length > 0) fetchBookedTimes();
  }, [date, barber, servicos]);

  const scroll = (direction: "left" | "right", ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return; const c = ref.current; const amt = 200;
    if (direction === "left") { c.scrollLeft <= 0 ? c.scrollTo({ left: c.scrollWidth, behavior: "smooth" }) : c.scrollBy({ left: -amt, behavior: "smooth" }); }
    else { c.scrollLeft + c.clientWidth >= c.scrollWidth - 10 ? c.scrollTo({ left: 0, behavior: "smooth" }) : c.scrollBy({ left: amt, behavior: "smooth" }); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barber) { toast.error("Selecione um barbeiro."); return; }
    if (!service) { toast.error("Selecione um serviço."); return; }
    if (!date) { toast.error("Selecione um dia."); return; }
    if (!time) { toast.error("Selecione uma hora."); return; }
    setSubmitting(true);
    
    const svc = servicos.find(s => s.nome === service);
    const precoOriginal = svc ? svc.preco : 0;
    const precoCobrado = Math.round(precoOriginal * discountMultiplier * 100) / 100;
    const descontoPercentInt = Math.round(discountPercent * 100);
    
    // Utilizando a STORED PROCEDURE para criar o agendamento
    const { error } = await supabase.rpc('criar_agendamento', {
      p_nome: name,
      p_telefone: phone,
      p_servico: service,
      p_barbeiro: barber,
      p_data: date,
      p_hora: time,
      p_preco_original: precoOriginal,
      p_preco_cobrado: precoCobrado,
      p_desconto_percent: descontoPercentInt,
      p_respostas_desconto: answers
    });

    if (error) { toast.error(`Erro: ${error.message}`); setSubmitting(false); return; }
    
    const WHATSAPP_NUMBER = "5583991497248";
    const message = `✅ *AGENDAMENTO CONFIRMADO* ✅%0A%0AOlá! Meu horário foi agendado com sucesso pelo site. Aqui estão os detalhes:%0A%0A👤 *Cliente:* ${name}%0A✂️ *Serviço:* ${service}%0A💈 *Barbeiro:* ${barber}%0A📅 *Data:* ${date}%0A⏰ *Hora:* ${time}%0A💰 *Valor Final:* ${formatPrecoDecimal(precoCobrado)}`;
    toast.success("Agendamento salvo! A redirecionar para o WhatsApp...");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
    setSubmitting(false); navigate("/");
  };

  const availableTimesFiltered = useMemo(() => {
    if (!date || !barber || AVAILABLE_TIMES.length === 0) return [];
    const svc = servicos.find(s => s.nome === service); const duracao = svc ? getDuracaoEmMinutos(svc.duracao) : 30;
    const slotInterval = getSlotInterval(AVAILABLE_TIMES);
    const sorted = [...AVAILABLE_TIMES].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    const shifts: { start: number; end: number }[] = []; let shiftStart = timeToMinutes(sorted[0]); let prevMin = shiftStart;
    for (let i = 1; i < sorted.length; i++) { const cur = timeToMinutes(sorted[i]); if (cur - prevMin > 60) { shifts.push({ start: shiftStart, end: prevMin + slotInterval }); shiftStart = cur; } prevMin = cur; }
    shifts.push({ start: shiftStart, end: prevMin + slotInterval });
    let candidates = [...AVAILABLE_TIMES.map(timeToMinutes)]; bookedIntervals.forEach(b => candidates.push(b.end)); candidates = [...new Set(candidates)].sort((a, b) => a - b);
    const isToday = availableDates.length > 0 && date === availableDates[0].label; const now = new Date(); const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const valid: string[] = [];
    for (const start of candidates) {
      if (isToday && start <= currentMinutes) continue; const end = start + duracao;
      let fitsShift = false; for (const s of shifts) { if (start >= s.start && end <= s.end) { fitsShift = true; break; } } if (!fitsShift) continue;
      let overlaps = false; for (const b of bookedIntervals) { if (start < b.end && end > b.start) { overlaps = true; break; } } if (overlaps) continue;
      let hasBlockedOverlap = false; for (const bl of bloqueados) { const blMin = timeToMinutes(bl); if (start < blMin + slotInterval && end > blMin) { hasBlockedOverlap = true; break; } } if (hasBlockedOverlap) continue;
      valid.push(minutesToTime(start));
    }
    return valid;
  }, [date, barber, service, servicos, bookedIntervals, availableDates, AVAILABLE_TIMES, bloqueados]);

  const isLoadingAny = loadingTimes || loadingHorarios || loadingBloqueados;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-background selection:bg-gold/30">
      <div className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center h-full" style={{ backgroundImage: `url(${bgImg})` }}>
        <div className="absolute inset-0 bg-background/80 lg:bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full flex flex-col items-center justify-center p-8 text-center">
          <Link to="/" className="mb-6 hover:scale-105 transition-transform duration-500"><img src={logoImg} alt="JoãoS Barbearia" className="h-24 w-auto drop-shadow-2xl opacity-90" /></Link>
          <h2 className="text-3xl font-display font-medium text-white mb-3 leading-tight">A sua melhor versão <br /><span className="text-gold italic font-normal">começa aqui.</span></h2>
          <p className="text-gray-300 text-sm max-w-sm font-light">Tradição, precisão e um atendimento exclusivo à sua espera.</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 p-4 lg:p-6 xl:p-8 relative min-h-screen lg:min-h-0 h-full overflow-y-auto">
        <div className="max-w-xl w-full mx-auto lg:mx-0 min-h-full flex flex-col justify-center py-6">
          <Button variant="ghost" asChild className="mb-2 -ml-4 text-muted-foreground hover:text-gold w-fit h-8"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
          <div className="mb-6 animate-fade-in"><h1 className="text-3xl md:text-4xl font-display font-medium text-foreground mb-2">Agendar <span className="text-gold italic font-normal">Serviço</span></h1><p className="text-muted-foreground text-base font-light">Preencha os detalhes para reservar o seu momento.</p></div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label htmlFor="name" className="font-bold text-[10px] uppercase tracking-widest text-white">Nome</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Digite seu nome" className="h-10 bg-background border-b-2 border-x-0 border-t-0 border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gold text-sm transition-colors" /></div>
              <div className="grid gap-1.5"><Label htmlFor="phone" className="font-bold text-[10px] uppercase tracking-widest text-white">WhatsApp</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Digite o seu número" className="h-10 bg-background border-b-2 border-x-0 border-t-0 border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gold text-sm transition-colors" /></div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Label className="font-bold text-[10px] uppercase tracking-widest text-white flex items-center gap-2">Sobre você{yesCount > 0 && (<span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-normal normal-case animate-in fade-in zoom-in-90 duration-300">-{Math.round(discountPercent * 100)}% OFF</span>)}</Label>
              <div className="grid gap-2">{DISCOUNT_QUESTIONS.map((q) => { const isYes = answers[q.id]; return (<button key={q.id} type="button" onClick={() => toggleAnswer(q.id)} className={`relative flex items-center gap-3 w-full rounded-xl border-2 px-4 py-3 transition-all duration-300 text-left group ${isYes ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-border/40 bg-background/30 hover:border-border/60"}`}><span className={`flex-1 text-sm font-medium transition-colors duration-300 ${isYes ? "text-foreground" : "text-muted-foreground"}`}>{q.label}</span><div className="flex items-center gap-2 flex-shrink-0"><span className={`text-xs font-semibold transition-colors duration-300 ${isYes ? "text-emerald-400" : "text-muted-foreground/50"}`}>{isYes ? "Sim" : "Não"}</span><div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isYes ? "bg-emerald-500" : "bg-white/10"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${isYes ? "left-[22px]" : "left-0.5"}`} /></div></div>{isYes && (<div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-in fade-in zoom-in-75 duration-300">-30%</div>)}</button>); })}</div>
              {yesCount > 0 && (<p className="text-[11px] text-emerald-400/70 pl-1 animate-in fade-in slide-in-from-top-2 duration-300">{yesCount === 1 && "30% de desconto no serviço!"}{yesCount === 2 && "60% de desconto no serviço!"}{yesCount === 3 && "90% de desconto no serviço! Quase de graça! 🎉"}</p>)}
            </div>
            <div className="flex flex-col gap-2 min-w-0 w-full">
              <Label className="font-bold text-[10px] uppercase tracking-widest text-white">Selecione o Serviço</Label>
              {loadingServicos ? (<div className="flex items-center justify-center py-4 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" />A carregar serviços...</div>) : errorServicos ? (<div className="flex items-center gap-2 text-red-400 text-sm py-2 px-3"><AlertCircle className="h-4 w-4 shrink-0" /><span>Erro. </span><button type="button" onClick={refetchServicos} className="text-gold underline">Tentar novamente</button></div>) : (
                <div className="relative group w-full">
                  <Button type="button" variant="outline" size="icon" onClick={() => scroll("left", serviceScrollRef)} className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronLeft className="h-4 w-4" /></Button>
                  <div ref={serviceScrollRef} className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{servicos.map(s => { const isSel = service === s.nome; const po = s.preco; const pd = po * discountMultiplier; const hd = yesCount > 0; return (<button key={s.id} type="button" onClick={() => setService(s.nome)} className={`relative flex flex-col text-left rounded-lg border-2 p-2.5 transition-all duration-200 flex-shrink-0 w-36 sm:w-44 snap-start ${isSel ? "border-gold bg-gold/5 shadow-md" : "border-border/40 hover:border-gold/40 bg-background/30"}`}>{isSel && <div className="absolute top-1.5 right-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-gold" /></div>}<p className={`font-medium text-xs leading-snug pr-4 mb-2 ${isSel ? "text-gold" : "text-foreground"}`}>{s.nome}</p><div className="flex items-center justify-between gap-1 w-full mt-auto"><div className="flex flex-col">{hd ? (<><span className="text-muted-foreground/50 text-[10px] line-through leading-none">{formatPreco(po)}</span><span className={`font-display font-bold text-sm leading-tight ${isSel ? "text-emerald-400" : "text-emerald-400/80"}`}>{formatPreco(pd)}</span></>) : (<span className={`font-display font-bold text-sm ${isSel ? "text-gold" : "text-gold/70"}`}>{formatPreco(po)}</span>)}</div><span className="text-muted-foreground text-[10px] flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.duracao}</span></div></button>); })}</div>
                  <Button type="button" variant="outline" size="icon" onClick={() => scroll("right", serviceScrollRef)} className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button>
                </div>)}
            </div>
            <div className="flex flex-col gap-2"><Label className="font-bold text-[10px] uppercase tracking-widest text-white">Selecione o Barbeiro</Label><div className="flex gap-3 sm:gap-4">{BARBERS.map(b => (<button key={b.id} type="button" onClick={() => setBarber(b.name)} className={`relative rounded-xl border-2 transition-all duration-300 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden flex-shrink-0 ${barber === b.name ? "border-gold shadow-md scale-105" : "border-border/50 bg-background hover:border-gold/50"}`}><img src={b.photo} alt={b.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" /><span className={`absolute bottom-0 left-0 right-0 p-1.5 font-display text-sm sm:text-base font-medium ${barber === b.name ? "text-gold-light" : "text-white"}`}>{b.name}</span>{barber === b.name && <div className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-0.5"><CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold drop-shadow-md" /></div>}</button>))}</div></div>
            <div className="grid gap-4 pt-1">
              <div className="flex flex-col gap-2 min-w-0 w-full"><Label className="font-bold text-[10px] uppercase tracking-widest text-white">Dia</Label><div className="relative group w-full"><Button type="button" variant="outline" size="icon" onClick={() => scroll("left", dateScrollRef)} className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronLeft className="h-4 w-4" /></Button><div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{availableDates.map(d => { const isSel = date === d.label; const isClosed = d.dayOfWeek === 0 || d.dayOfWeek === 1; return (<button key={d.id} type="button" onClick={() => { if (!isClosed) setDate(d.label); }} disabled={isClosed} className={`relative flex flex-col items-center justify-center rounded-lg border-2 py-2 px-3 transition-all duration-200 flex-shrink-0 w-24 snap-start ${isClosed ? "opacity-30 cursor-default border-border/20 bg-background/10" : isSel ? "border-gold bg-gold/5 shadow-md" : "border-border/40 hover:border-gold/40 bg-background/30"}`}><span className={`text-[9px] uppercase font-semibold tracking-wider ${isSel ? "text-gold" : "text-muted-foreground"}`}>{d.displayWeekday}</span><span className={`font-display text-xl font-bold my-0.5 ${isSel ? "text-gold" : "text-foreground"}`}>{d.displayDay}</span><span className={`text-[9px] uppercase font-semibold tracking-wider ${isSel ? "text-gold" : "text-muted-foreground"}`}>{d.displayMonth}</span></button>); })}</div><Button type="button" variant="outline" size="icon" onClick={() => scroll("right", dateScrollRef)} className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button></div></div>
              <div className="flex flex-col gap-2 min-w-0 w-full"><Label className="font-bold text-[10px] uppercase tracking-widest text-white">Hora</Label>{!date || !barber ? (<div className="flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-border/50 bg-background/30 text-xs text-muted-foreground w-full">Selecione um barbeiro e um dia primeiro</div>) : isLoadingAny ? (<div className="flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-border/50 bg-background/30 text-xs text-muted-foreground w-full"><Loader2 className="h-4 w-4 animate-spin mr-2" />A verificar disponibilidade...</div>) : availableTimesFiltered.length === 0 ? (<div className="flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-border/50 bg-background/30 text-xs text-red-400 w-full">Nenhum horário disponível para este dia.</div>) : (<div className="relative group w-full animate-in fade-in slide-in-from-bottom-2 duration-300"><Button type="button" variant="outline" size="icon" onClick={() => scroll("left", timeScrollRef)} className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronLeft className="h-4 w-4" /></Button><div ref={timeScrollRef} className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{availableTimesFiltered.map(t => { const isSel = time === t; return (<button key={t} type="button" onClick={() => setTime(t)} className={`relative flex items-center justify-center rounded-lg border-2 py-2 px-4 transition-all duration-200 flex-shrink-0 snap-start ${isSel ? "border-gold bg-gold/5 shadow-md text-gold" : "border-border/40 hover:border-gold/40 bg-background/30 text-foreground"}`}><span className="font-display text-base font-medium">{t}</span></button>); })}</div><Button type="button" variant="outline" size="icon" onClick={() => scroll("right", timeScrollRef)} className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-7 w-7 rounded-full bg-background/90 text-gold shadow-md opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button></div>)}</div>
            </div>
            {service && yesCount > 0 && (<div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.04] p-4 animate-in fade-in slide-in-from-bottom-3 duration-400"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground mb-0.5">Resumo do desconto</p><p className="text-sm font-medium text-foreground">{service}</p></div><div className="text-right"><p className="text-xs text-muted-foreground/60 line-through">{formatPrecoDecimal(servicos.find(s => s.nome === service)?.preco || 0)}</p><p className="text-lg font-display font-bold text-emerald-400">{formatPrecoDecimal((servicos.find(s => s.nome === service)?.preco || 0) * discountMultiplier)}</p></div></div><div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-500/15"><span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">-{Math.round(discountPercent * 100)}%</span><span className="text-[11px] text-emerald-400/60">Gostei de você, então toma esse desconto!</span></div></div>)}
            <Button type="submit" disabled={submitting || loadingServicos || !!errorServicos || isLoadingAny} className="w-full mt-2 h-12 gradient-gold text-primary-foreground font-semibold tracking-widest uppercase px-6 py-4 shadow-gold hover:opacity-90 hover:shadow-lg transition-all text-sm rounded-md disabled:opacity-50">{submitting ? "A guardar..." : "Confirmar Agendamento"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}