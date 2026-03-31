import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LogOut, Scissors, CalendarDays, Clock, CheckCircle2, XCircle,
  Trash2, RefreshCw, Plus, Pencil, DollarSign, Package, Phone,
  ChevronLeft, ChevronRight, Settings2, Ban, CircleCheck,
  TrendingUp, Wallet, Banknote, BarChart3, UserCircle,
  CreditCard, Smartphone, Skull, CircleDashed
} from "lucide-react";
import { useHorarios, useHorariosBloqueados } from "@/hooks/use-horarios";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell
} from 'recharts';

// ============================================================
// TYPES
// ============================================================
type Agendamento = {
  id: string; nome: string; telefone: string; servico: string;
  barbeiro: string | null; data: string; hora: string; status: string; created_at: string;
  preco_original: number; preco_cobrado: number; desconto_percent: number;
  respostas_desconto: any;
  forma_pagamento: string;
  pagamento_confirmado: boolean;
};
type Servico = {
  id: string; nome: string; preco: number; duracao: string;
  ativo: boolean; ordem: number; created_at: string; updated_at: string;
};
type SlotRole =
  | { kind: "free" }
  | { kind: "blocked" }
  | { kind: "start"; appointment: Agendamento; svc: Servico | undefined; durationMin: number; slotsSpanned: number }
  | { kind: "continuation"; appointmentId: string };
type TimelineEntry = { time: string; role: SlotRole; isBaseSlot: boolean; };

// ============================================================
// HELPERS
// ============================================================
const ROW_H = 64;
function formatPreco(p: number) { return `R$ ${p.toFixed(2).replace(".", ",")}`; }
function timeToMinutes(t: string): number { if (!t || !t.includes(":")) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function minutesToTime(m: number): string { return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`; }
function getDuracaoEmMinutos(d: string): number { if (!d) return 30; const t = d.toLowerCase().trim(); let m = 0; if (t.includes("h")) { const p = t.split("h"); m = (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); } else m = parseInt(t.replace(/\\D/g, "")) || 30; return m > 0 ? m : 30; }
function getPrecoEfetivo(ag: Agendamento, servicos: Servico[]): number { if (ag.preco_cobrado > 0) return ag.preco_cobrado; const svc = servicos.find(s => s.nome === ag.servico); return svc ? svc.preco : 0; }

const PAYMENT_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pix: { label: "Pix", icon: Smartphone, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  dinheiro: { label: "Dinheiro", icon: Banknote, color: "text-green-400", bg: "bg-green-500/10" },
  cartao: { label: "Cartão", icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
  berries: { label: "Berries", icon: Skull, color: "text-amber-400", bg: "bg-amber-500/10" },
};

function PaymentBadge({ method }: { method: string }) {
  const meta = PAYMENT_META[method] || PAYMENT_META.pix;
  const Icon = meta.icon;
  return (<span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${meta.bg} ${meta.color}`}><Icon className="h-3 w-3" />{meta.label}</span>);
}

function ConfirmationBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed
    ? (<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md"><CheckCircle2 className="h-3 w-3" />Pago</span>)
    : (<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md"><CircleDashed className="h-3 w-3" />Pendente</span>);
}

function generateDays(count: number) { const days = []; const today = new Date(); for (let i = 0; i < count; i++) { const d = new Date(today); d.setDate(today.getDate() + i); days.push({ label: d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), weekdayShort: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), dayNum: d.getDate(), monthShort: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), isToday: i === 0, dayOfWeek: d.getDay() }); } return days; }
function generateFinanceDays(pastDaysCount: number, futureDaysCount: number) { const days = []; const today = new Date(); for (let i = -futureDaysCount; i <= pastDaysCount; i++) { const d = new Date(today); d.setDate(today.getDate() - i); days.push({ label: d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), weekdayShort: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), dayNum: d.getDate(), monthShort: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), isToday: i === 0, dayOfWeek: d.getDay() }); } return days; }
function getSlotInterval(slots: string[]): number { if (slots.length < 2) return 30; let mg = Infinity; for (let i = 1; i < slots.length; i++) { const g = timeToMinutes(slots[i]) - timeToMinutes(slots[i - 1]); if (g > 0 && g < mg) mg = g; } return mg === Infinity ? 30 : mg; }

function buildMergedTimeline(baseSlots: string[], blocked: string[], appointments: Agendamento[], servicos: Servico[]): TimelineEntry[] {
  const apptIntervals = appointments.map(appt => { const svc = servicos.find(s => s.nome === appt.servico); const durMin = svc ? getDuracaoEmMinutos(svc.duracao) : 30; return { appt, svc, startMin: timeToMinutes(appt.hora), endMin: timeToMinutes(appt.hora) + durMin, durMin }; });
  const timeSet = new Set<string>(baseSlots); for (const ai of apptIntervals) timeSet.add(ai.appt.hora);
  const allTimes = [...timeSet].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const entries: TimelineEntry[] = [];
  for (let i = 0; i < allTimes.length; i++) {
    const time = allTimes[i]; const min = timeToMinutes(time); const isBase = baseSlots.includes(time);
    const startAi = apptIntervals.find(a => a.startMin === min);
    if (startAi) { let ss = 1; for (let j = i + 1; j < allTimes.length; j++) { if (timeToMinutes(allTimes[j]) < startAi.endMin) ss++; else break; } entries.push({ time, role: { kind: "start", appointment: startAi.appt, svc: startAi.svc, durationMin: startAi.durMin, slotsSpanned: Math.max(1, ss) }, isBaseSlot: isBase }); continue; }
    const cAi = apptIntervals.find(a => min > a.startMin && min < a.endMin);
    if (cAi) { entries.push({ time, role: { kind: "continuation", appointmentId: cAi.appt.id }, isBaseSlot: isBase }); continue; }
    if (isBase && blocked.includes(time)) { entries.push({ time, role: { kind: "blocked" }, isBaseSlot: isBase }); continue; }
    entries.push({ time, role: { kind: "free" }, isBaseSlot: isBase });
  }
  return entries;
}

const DONUT_COLORS = ['#D4A853','#10B981','#6366F1','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#3B82F6','#A855F7','#22D3EE','#84CC16','#E11D48','#0EA5E9'];
function getDonutColor(name: string, index: number) { if (name.toLowerCase().trim() === "corte") return "#3B82F6"; return DONUT_COLORS[index % DONUT_COLORS.length]; }

// ============================================================
// COMPONENT
// ============================================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allDays = useMemo(() => generateDays(30), []);
  const finDays = useMemo(() => generateFinanceDays(30, 15), []);
  const firstOpenDay = useMemo(() => allDays.find(d => d.dayOfWeek !== 0 && d.dayOfWeek !== 1) || allDays[0], [allDays]);
  const [selectedDayLabel, setSelectedDayLabel] = useState(firstOpenDay?.label || "");
  const [selectedBarber, setSelectedBarber] = useState("todos");
  const [selectedFinBarber, setSelectedFinBarber] = useState("todos");
  const todayFinLabel = useMemo(() => finDays.find(d => d.isToday)?.label || "", [finDays]);
  const [selectedFinDayLabel, setSelectedFinDayLabel] = useState(todayFinLabel);

  const { slots: baseSlots, loading: loadingSlots, refetch: refHorarios, syncHorarios, DEFAULT_TIME_SLOTS } = useHorarios(selectedBarber);
  const { bloqueados, loading: loadingBloqueados, refetch: refetchBloqueados, bloquear, desbloquear } = useHorariosBloqueados(selectedDayLabel, selectedBarber);

  const [showDayDialog, setShowDayDialog] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [showGlobalDialog, setShowGlobalDialog] = useState(false);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [newSlotInput, setNewSlotInput] = useState("");
  const [savingSlots, setSavingSlots] = useState(false);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [showAddServico, setShowAddServico] = useState(false);
  const [deleteServicoId, setDeleteServicoId] = useState<string | null>(null);
  const [deletingServico, setDeletingServico] = useState(false);
  const [formNome, setFormNome] = useState(""); const [formPreco, setFormPreco] = useState("");
  const [formDuracao, setFormDuracao] = useState(""); const [formOrdem, setFormOrdem] = useState("");
  const [formAtivo, setFormAtivo] = useState(true); const [savingServico, setSavingServico] = useState(false);

  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [agFormNome, setAgFormNome] = useState(""); const [agFormTelefone, setAgFormTelefone] = useState("");
  const [agFormServico, setAgFormServico] = useState(""); const [agFormBarbeiro, setAgFormBarbeiro] = useState("");
  const [agFormHora, setAgFormHora] = useState(""); const [savingAgendamento, setSavingAgendamento] = useState(false);

  // ---- Fetch (USANDO VIEW AGORA) ----
  const fetchAgendamentos = async (sr = false) => {
    if (sr) setRefreshing(true); else setLoading(true);
    
    // A chamar a view `vw_agenda_completa` em vez da tabela
    const { data, error } = await supabase
      .from("vw_agenda_completa")
      .select("*")
      .order("agendado_em", { ascending: false });
      
    if (error) { 
      toast.error("Erro ao carregar agendamentos."); 
    } else {
      // Mapeamos os campos da view para os campos que a UI já entende
      setAgendamentos((data || []).map(d => ({ 
        id: d.agendamento_id, 
        nome: d.cliente_nome, 
        telefone: d.cliente_telefone, 
        servico: d.servico_nome, 
        barbeiro: d.barbeiro_nome, 
        data: d.data, 
        hora: d.hora, 
        status: d.status, 
        created_at: d.agendado_em,
        preco_original: d.preco_original ?? 0, 
        preco_cobrado: d.preco_cobrado ?? 0, 
        desconto_percent: d.desconto_percent ?? 0, 
        respostas_desconto: d.respostas_desconto ?? {}, 
        forma_pagamento: d.forma_pagamento ?? "pix", 
        pagamento_confirmado: d.pagamento_confirmado ?? false 
      })));
    }
    setLoading(false); setRefreshing(false);
  };
  
  const fetchServicos = async () => { setLoadingServicos(true); const { data, error } = await supabase.from("servicos").select("*").order("ordem", { ascending: true }); if (error) toast.error("Erro ao carregar serviços."); else setServicos(data || []); setLoadingServicos(false); };
  
  useEffect(() => { 
    fetchAgendamentos(); 
    fetchServicos(); 
    // Continuamos a ouvir as alterações na tabela base para tempo-real
    const ch = supabase.channel("ag-ch").on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => fetchAgendamentos(true)).subscribe(); 
    return () => { supabase.removeChannel(ch); }; 
  }, []);

  const handleDelete = async () => { if (!deleteId) return; setDeleting(true); const { data, error } = await supabase.from("agendamentos").delete().eq("id", deleteId).select(); if (error) { toast.error("Erro: " + error.message); } else if (!data?.length) { toast.error("Sem permissão (RLS)."); } else { toast.success("Apagado!"); await fetchAgendamentos(true); } setDeleting(false); setDeleteId(null); };

  const handleSaveAgendamento = async () => {
    if (!editingAgendamento) return;
    if (!agFormNome || !agFormTelefone || !agFormServico || !agFormHora) { toast.error("Preencha todos os campos."); return; }
    setSavingAgendamento(true);
    const { data, error } = await supabase.from("agendamentos").update({ nome: agFormNome.trim(), telefone: agFormTelefone.trim(), servico: agFormServico, barbeiro: agFormBarbeiro || null, hora: agFormHora }).eq("id", editingAgendamento.id).select();
    if (error) { toast.error("Erro: " + error.message); } else if (!data?.length) { toast.error("Sem permissão (RLS)."); } else { toast.success("Atualizado!"); await fetchAgendamentos(true); closeEditAgendamento(); }
    setSavingAgendamento(false);
  };

  // ================================================================
  // PAYMENT: toggle confirmation + change method (finance tab only)
  // ================================================================
  const togglePaymentConfirmation = async (agId: string, currentStatus: boolean) => {
    const { data, error } = await supabase.from("agendamentos").update({ pagamento_confirmado: !currentStatus }).eq("id", agId).select();
    if (error) { toast.error("Erro: " + error.message); return; }
    if (!data?.length) { toast.error("Sem permissão (RLS)."); return; }
    setAgendamentos(prev => prev.map(a => a.id === agId ? { ...a, pagamento_confirmado: !currentStatus } : a));
    toast.success(!currentStatus ? "Pagamento confirmado!" : "Marcado como pendente.");
  };

  const changePaymentMethod = async (agId: string, newMethod: string) => {
    const { data, error } = await supabase.from("agendamentos").update({ forma_pagamento: newMethod }).eq("id", agId).select();
    if (error) { toast.error("Erro: " + error.message); return; }
    if (!data?.length) { toast.error("Sem permissão (RLS)."); return; }
    setAgendamentos(prev => prev.map(a => a.id === agId ? { ...a, forma_pagamento: newMethod } : a));
    toast.success("Forma de pagamento atualizada.");
  };

  const toggleSlotForDay = async (hora: string) => { setTogglingSlot(hora); try { if (bloqueados.includes(hora)) { await desbloquear(hora); toast.success(`${hora} desbloqueado`); } else { await bloquear(hora); toast.success(`${hora} bloqueado`); } } catch (e: any) { toast.error(e.message); } setTogglingSlot(null); };
  const openGlobalDialog = () => { setEditSlots([...baseSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))); setNewSlotInput(""); setShowGlobalDialog(true); };
  const addSlotGlobal = () => { const t = newSlotInput.trim(); if (!/^\\d{2}:\\d{2}$/.test(t)) { toast.error("Use HH:MM"); return; } if (editSlots.includes(t)) { toast.error("Já existe."); return; } setEditSlots(p => [...p, t].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))); setNewSlotInput(""); };
  const removeSlotGlobal = (s: string) => setEditSlots(p => p.filter(x => x !== s));
  const saveGlobalSlots = async () => { if (!editSlots.length) { toast.error("Adicione pelo menos um."); return; } setSavingSlots(true); try { await syncHorarios(editSlots); setShowGlobalDialog(false); toast.success("Horários base atualizados!"); } catch (e: any) { toast.error(e.message); } setSavingSlots(false); };
  const openEditServico = (s: Servico) => { setEditingServico(s); setFormNome(s.nome); setFormPreco(String(s.preco)); setFormDuracao(s.duracao); setFormOrdem(String(s.ordem)); setFormAtivo(s.ativo); };
  const openAddServico = () => { setShowAddServico(true); setFormNome(""); setFormPreco(""); setFormDuracao(""); setFormOrdem(String(servicos.length + 1)); setFormAtivo(true); };
  const closeServicoDialog = () => { setEditingServico(null); setShowAddServico(false); };
  const handleSaveServico = async () => { if (!formNome || !formPreco || !formDuracao) { toast.error("Preencha tudo."); return; } setSavingServico(true); const pl = { nome: formNome.trim(), preco: parseFloat(formPreco), duracao: formDuracao.trim(), ordem: parseInt(formOrdem) || 0, ativo: formAtivo }; if (editingServico) { const { data, error } = await supabase.from("servicos").update(pl).eq("id", editingServico.id).select(); if (error) { toast.error("Erro: " + error.message); } else if (!data?.length) { toast.error("Sem permissão."); } else { toast.success("Atualizado!"); setServicos(p => p.map(s => s.id === editingServico.id ? { ...s, ...pl } : s)); } } else { const { data, error } = await supabase.from("servicos").insert([pl]).select(); if (error) { toast.error("Erro: " + error.message); } else { toast.success("Criado!"); if (data) setServicos(p => [...p, ...data]); } } setSavingServico(false); closeServicoDialog(); };
  const handleToggleAtivo = async (id: string, cur: boolean) => { const { data, error } = await supabase.from("servicos").update({ ativo: !cur }).eq("id", id).select(); if (error) { toast.error("Erro: " + error.message); } else if (!data?.length) { toast.error("Sem permissão."); } else { setServicos(p => p.map(s => s.id === id ? { ...s, ativo: !cur } : s)); toast.success(!cur ? "Ativado." : "Desativado."); } };
  const handleDeleteServico = async () => { if (!deleteServicoId) return; setDeletingServico(true); const { data, error } = await supabase.from("servicos").delete().eq("id", deleteServicoId).select(); if (error) { toast.error("Erro: " + error.message); } else if (!data?.length) { toast.error("Sem permissão."); } else { toast.success("Apagado!"); setServicos(p => p.filter(s => s.id !== deleteServicoId)); } setDeletingServico(false); setDeleteServicoId(null); };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/admin/login"); };
  const openEditAgendamento = (a: Agendamento) => { setEditingAgendamento(a); setAgFormNome(a.nome); setAgFormTelefone(a.telefone); setAgFormServico(a.servico); setAgFormBarbeiro(a.barbeiro || ""); setAgFormHora(a.hora); };
  const closeEditAgendamento = () => { setEditingAgendamento(null); };

  // ============================================================
  // COMPUTED
  // ============================================================
  const barbeirosUnicos = useMemo(() => Array.from(new Set(agendamentos.map(a => a.barbeiro).filter(Boolean))) as string[], [agendamentos]);
  const dayAgendamentos = useMemo(() => { let f = agendamentos.filter(a => a.data === selectedDayLabel); if (selectedBarber !== "todos") f = f.filter(a => a.barbeiro === selectedBarber); return f; }, [agendamentos, selectedDayLabel, selectedBarber]);
  const slotInterval = useMemo(() => getSlotInterval(baseSlots), [baseSlots]);
  const timeline = useMemo(() => buildMergedTimeline(baseSlots, bloqueados, dayAgendamentos, servicos), [baseSlots, bloqueados, dayAgendamentos, servicos]);
  const dayStats = useMemo(() => ({ total: dayAgendamentos.length, freeSlots: timeline.filter(e => e.role.kind === "free" && e.isBaseSlot).length, blockedSlots: timeline.filter(e => e.role.kind === "blocked").length }), [dayAgendamentos, timeline]);
  const selectedDayInfo = allDays.find(d => d.label === selectedDayLabel);
  const isDayClosed = selectedDayInfo ? (selectedDayInfo.dayOfWeek === 0 || selectedDayInfo.dayOfWeek === 1) : false;
  const now = new Date(); const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isNow = (t: string, nextT?: string) => { if (!selectedDayInfo?.isToday) return false; const start = timeToMinutes(t); const end = nextT ? timeToMinutes(nextT) : start + slotInterval; return currentMinutes >= start && currentMinutes < end; };
  const isPast = (t: string) => selectedDayInfo?.isToday && timeToMinutes(t) + slotInterval <= currentMinutes;
  const dayScrollRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  const scrollDays = (dir: "left" | "right") => { dayScrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" }); };

  const servicoRequestStats = useMemo(() => {
    const DA = new Date(); const cY = DA.getFullYear(); const cM = DA.getMonth();
    const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const t3m = new Date(cY, cM - 3, DA.getDate()); const t15d = new Date(cY, cM, DA.getDate() + 15);
    const counts: Record<string, number> = {};
    agendamentos.forEach(ag => { const dm = ag.data.match(/\\d{1,2}/); const day = dm ? parseInt(dm[0]) : 1; let mi = cM; for (let i = 0; i < months.length; i++) { if (ag.data.toLowerCase().includes(months[i])) { mi = i; break; } } let yr = cY; if (mi > cM && (mi - cM) > 6) yr = cY - 1; const ad = new Date(yr, mi, day); if (ad >= t3m && ad <= t15d) { const n = ag.servico || "Outros"; counts[n] = (counts[n] || 0) + 1; } });
    const data = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { data, total: data.reduce((acc, d) => acc + d.value, 0) };
  }, [agendamentos]);

  // ============================================================
  // FINANCEIRO
  // ============================================================
  const financeiroStats = useMemo(() => {
    let ganhoHoje = 0, ganhoSemana = 0, ganhoMes = 0, ganhoAno = 0, ganhoFuturo = 0, ganhoDiaSelecionado = 0, confirmadoDia = 0, pendenteDia = 0;
    const DA = new Date(); const cY = DA.getFullYear(); const cM = DA.getMonth();
    const sT = new Date(cY, cM, DA.getDate()).getTime(); const sW = new Date(cY, cM, DA.getDate() - DA.getDay()).getTime();
    const sMo = new Date(cY, cM, 1).getTime(); const sYr = new Date(cY, 0, 1).getTime();
    const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    agendamentos.forEach(ag => {
      const preco = getPrecoEfetivo(ag, servicos);
      const dm = ag.data.match(/\\d{1,2}/); const day = dm ? parseInt(dm[0]) : 1;
      let mi = cM; for (let i = 0; i < months.length; i++) { if (ag.data.toLowerCase().includes(months[i])) { mi = i; break; } }
      const tp = ag.hora ? ag.hora.split(':').map(Number) : [0,0];
      let yr = cY; if (mi > cM && (mi - cM) > 6) yr = cY - 1;
      const ad = new Date(yr, mi, day, tp[0], tp[1]); const at = ad.getTime(); const ds = new Date(yr, mi, day).getTime();
      const isPast = at <= DA.getTime(); const isToday = ds === sT;
      if (selectedFinBarber !== "todos" && ag.barbeiro !== selectedFinBarber) return;
      if (isPast) { if (at >= sYr) ganhoAno += preco; if (at >= sMo) ganhoMes += preco; if (at >= sW) ganhoSemana += preco; if (isToday) ganhoHoje += preco; } else { ganhoFuturo += preco; }
      if (ag.data === selectedFinDayLabel) { ganhoDiaSelecionado += preco; if (ag.pagamento_confirmado) confirmadoDia += preco; else pendenteDia += preco; }
    });
    return { ganhoHoje, ganhoSemana, ganhoMes, ganhoAno, ganhoFuturo, ganhoDiaSelecionado, confirmadoDia, pendenteDia };
  }, [agendamentos, servicos, selectedFinBarber, selectedFinDayLabel]);

  const finDayAgendamentos = useMemo(() => agendamentos.filter(a => a.data === selectedFinDayLabel && (selectedFinBarber === "todos" || a.barbeiro === selectedFinBarber)), [agendamentos, selectedFinDayLabel, selectedFinBarber]);

  const chartDataEvolucao = useMemo(() => {
    const data = []; const DA = new Date(); let labelHoje = "";
    for (let i = -7; i <= 15; i++) { const d = new Date(DA); d.setDate(d.getDate() + i); const ws = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""); const dn = d.getDate(); const lr = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); const name = `${ws}, ${dn}`; if (i === 0) labelHoje = name; const totalDia = agendamentos.reduce((acc, ag) => { if (ag.data !== lr) return acc; if (selectedFinBarber !== "todos" && ag.barbeiro !== selectedFinBarber) return acc; return acc + getPrecoEfetivo(ag, servicos); }, 0); data.push({ name, total: totalDia }); }
    return { data, labelHoje };
  }, [agendamentos, servicos, selectedFinBarber]);

  const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => { if (percent < 0.05) return null; const R = Math.PI / 180; const r = innerRadius + (outerRadius - innerRadius) * 0.5; return (<text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}>{`${(percent * 100).toFixed(0)}%`}</text>); };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Scissors className="h-5 w-5 text-gold" /><h1 className="font-display text-lg font-semibold text-foreground">Painel do <span className="text-gold italic">Barbeiro</span></h1></div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { fetchAgendamentos(true); fetchServicos(); refHorarios(); refetchBloqueados(); }} disabled={refreshing} className="text-muted-foreground hover:text-gold"><RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Atualizar</span></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-400"><LogOut className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Sair</span></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="agendamentos" className="space-y-6">
          <TabsList className="bg-card border border-border/50 h-11 flex flex-wrap max-w-fit">
            <TabsTrigger value="agendamentos" className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold gap-2"><CalendarDays className="h-4 w-4" />Agendamentos</TabsTrigger>
            <TabsTrigger value="servicos" className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold gap-2"><Package className="h-4 w-4" />Serviços</TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 gap-2"><TrendingUp className="h-4 w-4" />Financeiro</TabsTrigger>
          </TabsList>

          {/* ===== TAB: AGENDAMENTOS (sem destaque de pagamento) ===== */}
          <TabsContent value="agendamentos" className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="font-display text-2xl font-semibold text-foreground">Agenda do Dia</h2><p className="text-muted-foreground text-sm mt-1">Visualize e gerencie os agendamentos diários.</p></div>
              <div className="flex items-center gap-3"><UserCircle className="h-5 w-5 text-muted-foreground hidden sm:block" /><Select value={selectedBarber} onValueChange={setSelectedBarber}><SelectTrigger className="w-[200px] bg-card/50 border-border/50 font-medium"><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os Barbeiros</SelectItem>{barbeirosUnicos.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3"><CalendarDays className="h-4 w-4 text-gold" /><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Selecione o dia</span></div>
              <div className="relative group"><Button type="button" variant="ghost" size="icon" onClick={() => scrollDays("left")} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 rounded-full bg-card/90 border border-border/50 text-gold hover:bg-gold/10 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-4 w-4" /></Button><div ref={el => { dayScrollRef.current = el; }} className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">{allDays.map(d => { const isSel = selectedDayLabel === d.label; const isClosed = d.dayOfWeek === 0 || d.dayOfWeek === 1; return (<button key={d.label} type="button" onClick={() => { if (!isClosed) setSelectedDayLabel(d.label); }} disabled={isClosed} className={`relative flex flex-col items-center justify-center rounded-xl border-2 py-3 px-3 transition-all duration-200 flex-shrink-0 w-[76px] snap-start gap-0.5 ${isClosed ? "opacity-25 cursor-default border-border/20 bg-background/10" : isSel ? "border-gold bg-gold/5 shadow-lg shadow-gold/10" : "border-border/30 hover:border-gold/40 bg-card/50"}`}><div className="flex items-center gap-1"><span className={`text-[9px] uppercase font-semibold tracking-wider ${isSel ? "text-gold" : "text-muted-foreground"}`}>{d.weekdayShort}</span>{d.isToday && <span className="text-[7px] font-bold uppercase tracking-wider bg-gold text-primary-foreground px-1 py-[1px] rounded leading-none">hoje</span>}</div><span className={`font-display text-xl font-bold leading-none ${isSel ? "text-gold" : "text-foreground"}`}>{d.dayNum}</span><span className={`text-[9px] uppercase font-semibold tracking-wider ${isSel ? "text-gold" : "text-muted-foreground"}`}>{d.monthShort}</span></button>); })}</div><Button type="button" variant="ghost" size="icon" onClick={() => scrollDays("right")} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 rounded-full bg-card/90 border border-border/50 text-gold hover:bg-gold/10 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></Button></div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap"><Button variant="ghost" size="sm" onClick={() => { if (selectedBarber === "todos") { toast.info("Selecione um barbeiro."); return; } setShowDayDialog(true); }} disabled={isDayClosed} className="text-muted-foreground hover:text-gold gap-1.5 h-9 px-3"><Settings2 className="h-3.5 w-3.5" /><span className="text-xs">Gerir dia</span></Button><Button variant="ghost" size="sm" onClick={() => { if (selectedBarber === "todos") { toast.info("Selecione um barbeiro."); return; } openGlobalDialog(); }} className="text-muted-foreground hover:text-gold gap-1.5 h-9 px-3"><Clock className="h-3.5 w-3.5" /><span className="text-xs">Horários base</span></Button></div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gold/80" />{dayStats.total} agendamento{dayStats.total !== 1 ? "s" : ""}</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />{dayStats.freeSlots} livres</span>{dayStats.blockedSlots > 0 && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />{dayStats.blockedSlots} bloqueado{dayStats.blockedSlots !== 1 ? "s" : ""}</span>}</div>
            </div>

            {loading || loadingSlots || loadingBloqueados ? (<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>) : isDayClosed ? (<div className="text-center py-20"><Ban className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-lg font-display">Dia fechado</p><p className="text-muted-foreground/60 text-sm mt-1">Domingo e segunda-feira não têm agendamentos.</p></div>) : (
              <div className="relative">
                {timeline.map((entry, idx) => {
                  const { time: slot, role, isBaseSlot } = entry; const nextEntry = idx < timeline.length - 1 ? timeline[idx + 1] : null;
                  const nowHere = isNow(slot, nextEntry?.time); const past = isPast(slot);
                  const prevEntry = idx > 0 ? timeline[idx - 1] : null;
                  const showGap = prevEntry && timeToMinutes(slot) - timeToMinutes(prevEntry.time) > slotInterval;
                  const gapEl = showGap ? <div className="flex items-center gap-3 py-3 px-2"><div className="h-px flex-1 bg-border/30" /><span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-medium">Intervalo</span><div className="h-px flex-1 bg-border/30" /></div> : null;
                  const timeOpacity = isBaseSlot ? "" : "opacity-60";

                  if (role.kind === "blocked") return (<div key={`${slot}-${idx}`}>{gapEl}<div className={`flex gap-3 sm:gap-4 items-stretch transition-opacity duration-300 ${past ? "opacity-40" : ""}`} style={{ height: `${ROW_H}px` }}><div className="w-14 sm:w-16 flex-shrink-0 flex items-start justify-end pt-1 pr-1"><span className="font-display text-sm sm:text-base font-bold tabular-nums text-red-400/40 line-through">{slot}</span></div><div className="w-px bg-red-400/20 flex-shrink-0" /><div className="flex-1 min-w-0 flex items-center"><div className="flex items-center gap-2 text-xs text-red-400/50"><Ban className="h-3 w-3" />Bloqueado neste dia</div></div></div></div>);
                  if (role.kind === "free") return (<div key={`${slot}-${idx}`}>{gapEl}<div className={`flex gap-3 sm:gap-4 items-stretch transition-opacity duration-300 ${past ? "opacity-40" : ""}`} style={{ height: `${ROW_H}px` }}><div className={`w-14 sm:w-16 flex-shrink-0 flex items-start justify-end pt-1 pr-1 relative ${timeOpacity}`}><span className={`font-display text-sm sm:text-base font-bold tabular-nums ${nowHere ? "text-gold" : "text-muted-foreground/40"}`}>{slot}</span>{nowHere && <span className="absolute -right-[7px] top-[9px] w-3 h-3 rounded-full bg-gold border-2 border-background z-10 animate-pulse" />}</div><div className="w-px bg-border/20 relative flex-shrink-0">{nowHere && <div className="absolute top-1.5 -left-[1px] w-[3px] h-3 rounded-full bg-gold" />}</div><div className="flex-1 min-w-0 flex items-center"><div className="h-[1px] w-full max-w-lg bg-border/10" /></div></div></div>);
                  if (role.kind === "continuation") return (<div key={`${slot}-${idx}`}>{gapEl}<div className={`flex gap-3 sm:gap-4 items-stretch transition-opacity duration-300 ${past ? "opacity-40" : ""}`} style={{ height: `${ROW_H}px` }}><div className={`w-14 sm:w-16 flex-shrink-0 flex items-start justify-end pt-1 pr-1 relative ${timeOpacity}`}><span className={`font-display text-sm sm:text-base font-bold tabular-nums ${nowHere ? "text-gold" : "text-muted-foreground/20"}`}>{slot}</span>{nowHere && <span className="absolute -right-[7px] top-[9px] w-3 h-3 rounded-full bg-gold border-2 border-background z-10 animate-pulse" />}</div><div className="relative flex-shrink-0" style={{ width: "3px" }}><div className="absolute inset-0 rounded-full bg-gold/30" /></div><div className="flex-1 min-w-0" /></div></div>);

                  const { appointment: a, svc, durationMin, slotsSpanned } = role;
                  const dur = svc ? svc.duracao : ""; const cardH = Math.max(56, slotsSpanned * ROW_H);
                  const endTime = minutesToTime(timeToMinutes(a.hora) + durationMin);

                  return (<div key={`${slot}-${idx}`}>{gapEl}
                    <div className={`flex gap-3 sm:gap-4 transition-opacity duration-300 ${past ? "opacity-40" : ""}`} style={{ height: `${ROW_H}px`, position: "relative", zIndex: 2 }}>
                      <div className={`w-14 sm:w-16 flex-shrink-0 flex items-start justify-end pt-1 pr-1 relative ${timeOpacity}`}><span className={`font-display text-sm sm:text-base font-bold tabular-nums ${nowHere ? "text-gold" : "text-foreground"}`}>{slot}</span>{nowHere && <span className="absolute -right-[7px] top-[9px] w-3 h-3 rounded-full bg-gold border-2 border-background z-10 animate-pulse" />}</div>
                      <div className="relative flex-shrink-0" style={{ width: "3px" }}><div className="absolute top-0 rounded-full bg-gold/60" style={{ height: `${cardH}px`, width: "3px" }} /></div>
                      <div className="flex-1 min-w-0 relative">
                        <div onClick={() => openEditAgendamento(a)} className="group absolute top-0 left-0 right-0 rounded-xl border border-gold/20 bg-gold/[0.04] transition-all hover:border-gold/40 hover:bg-gold/[0.07] overflow-hidden cursor-pointer" style={{ height: `${cardH}px`, maxWidth: "36rem" }}>
                          <div className="p-4 sm:p-4 flex items-center gap-3 sm:gap-4 h-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-display text-base font-semibold text-foreground truncate">{a.nome}</span>
                                {a.barbeiro && <span className="text-[10px] uppercase tracking-wider text-gold/70 bg-gold/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{a.barbeiro}</span>}
                                {a.desconto_percent > 0 && <span className="text-[9px] font-bold text-emerald-400/70 bg-emerald-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0">-{a.desconto_percent}%</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-[13px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Scissors className="h-3 w-3 text-gold/50" />{a.servico}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-gold/50" />{dur || `${durationMin}min`}</span>
                                <span className="text-gold/40">{slot} – {endTime}</span>
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-gold/50" />{a.telefone}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 self-start mt-0.5">
                              <a href={`https://wa.me/55${a.telefone.replace(/\\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-emerald-400/70 hover:text-emerald-300 border border-emerald-400/20 rounded-md px-2 py-1 hover:bg-emerald-400/10 transition-all"><Phone className="h-3 w-3" /><span className="hidden sm:inline">WhatsApp</span></a>
                              <div onClick={e => { e.stopPropagation(); openEditAgendamento(a); }} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-gold/60 hover:bg-gold/10 transition-all cursor-pointer"><Pencil className="h-3.5 w-3.5" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>);
                })}
                <div className="flex items-center gap-3 pt-4 pl-[68px] sm:pl-[76px]"><div className="h-px flex-1 bg-border/20" /><span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 font-medium">Fim do dia</span><div className="h-px flex-1 bg-border/20" /></div>
              </div>
            )}
          </TabsContent>

          {/* ===== TAB: SERVIÇOS ===== */}
          <TabsContent value="servicos" className="space-y-8">
            <div className="rounded-xl border border-border/50 p-6 lg:p-8 shadow-lg relative overflow-hidden group" style={{ background: "var(--gradient-card)" }}>
              <div className="mb-6 relative z-10"><h3 className="font-display font-bold text-xl flex items-center gap-2 text-foreground"><BarChart3 className="h-6 w-6 text-gold" />Visão Geral de Demandas</h3><p className="text-sm text-muted-foreground mt-1">Distribuição dos últimos 3 meses + próximos 15 dias. Total: <span className="font-bold text-foreground">{servicoRequestStats.total}</span></p></div>
              {servicoRequestStats.data.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground relative z-10"><Package className="h-10 w-10 mb-3 opacity-30" /><p className="text-sm">Nenhum agendamento neste período.</p></div>) : (
                <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
                  <div className="relative w-full lg:w-[55%] h-[280px] flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={servicoRequestStats.data} cx="50%" cy="50%" innerRadius={70} outerRadius={115} paddingAngle={3} dataKey="value" labelLine={false} label={renderDonutLabel} stroke="rgba(0,0,0,0.2)" strokeWidth={2}>{servicoRequestStats.data.map((item, index) => (<Cell key={`cell-${index}`} fill={getDonutColor(item.name, index)} />))}</Pie><RechartsTooltip contentStyle={{ backgroundColor: 'rgba(26,26,26,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: number, n: string) => [`${v} agendamento${v !== 1 ? 's' : ''}`, n]} /></PieChart></ResponsiveContainer></div>
                  <div className="w-full lg:w-[45%] flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb]:rounded-full"><div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold"><span>Serviço</span><div className="flex items-center gap-4 text-right pr-1"><span className="w-8">Qtd</span><span className="w-12">%</span></div></div>{servicoRequestStats.data.map((item, index) => { const pct = servicoRequestStats.total > 0 ? ((item.value / servicoRequestStats.total) * 100).toFixed(1) : "0"; return (<div key={item.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"><div className="flex items-center gap-3 min-w-0"><div className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: getDonutColor(item.name, index) }} /><p className="text-sm font-medium text-foreground truncate">{item.name}</p></div><div className="flex items-center gap-4 flex-shrink-0 ml-4"><span className="text-sm font-semibold text-foreground tabular-nums text-right w-8">{item.value}</span><span className="text-sm text-muted-foreground tabular-nums text-right w-12">{pct}%</span></div></div>); })}</div>
                </div>
              )}
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between mb-6"><div><h2 className="font-display text-2xl font-semibold text-foreground">Gestão de Serviços</h2><p className="text-muted-foreground text-sm mt-1">Edite preços, durações e ative/desative serviços.</p></div><Button onClick={openAddServico} className="gradient-gold text-primary-foreground font-semibold gap-2"><Plus className="h-4 w-4" />Novo Serviço</Button></div>
              <div className="rounded-lg border border-border/50 overflow-hidden mb-6" style={{ background: "var(--gradient-card)" }}>
                {loadingServicos ? (<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>) : servicos.length === 0 ? (<div className="text-center py-20"><Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-lg font-display">Nenhum serviço cadastrado</p></div>) : (<div className="overflow-x-auto"><Table><TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium w-10">#</TableHead><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Nome</TableHead><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Preço</TableHead><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Duração</TableHead><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Estado</TableHead><TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{servicos.map(s => (<TableRow key={s.id} className={`border-border/30 hover:bg-white/[0.02] ${!s.ativo ? "opacity-50" : ""}`}><TableCell className="text-muted-foreground text-xs">{s.ordem}</TableCell><TableCell className="font-medium text-foreground">{s.nome}</TableCell><TableCell><span className="text-gold font-display font-bold">{formatPreco(s.preco)}</span></TableCell><TableCell><span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />{s.duracao}</span></TableCell><TableCell><div className="flex items-center gap-2"><Switch checked={s.ativo} onCheckedChange={() => handleToggleAtivo(s.id, s.ativo)} className="data-[state=checked]:bg-emerald-500" /><span className={`text-xs ${s.ativo ? "text-emerald-400" : "text-muted-foreground"}`}>{s.ativo ? "Ativo" : "Inativo"}</span></div></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEditServico(s)} className="h-8 w-8 text-muted-foreground hover:text-gold hover:bg-gold/10"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteServicoId(s.id)} className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>))}</TableBody></Table></div>)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[{ l: "Total", v: servicos.length, i: Package, c: "text-gold" }, { l: "Ativos", v: servicos.filter(s => s.ativo).length, i: CheckCircle2, c: "text-emerald-400" }, { l: "Inativos", v: servicos.filter(s => !s.ativo).length, i: XCircle, c: "text-red-400" }].map(st => (<div key={st.l} className="rounded-lg border border-border/50 p-4" style={{ background: "var(--gradient-card)" }}><div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">{st.l}</span><st.i className={`h-4 w-4 ${st.c}`} /></div><p className={`font-display text-2xl font-bold ${st.c}`}>{st.v}</p></div>))}</div>
            </div>
          </TabsContent>

          {/* ===== TAB: FINANCEIRO — pagamento e confirmação aqui ===== */}
          <TabsContent value="financeiro" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="font-display text-2xl font-semibold text-foreground">Visão Financeira</h2><p className="text-muted-foreground text-sm mt-1">Acompanhe o faturamento, defina forma de pagamento e confirme recebimentos.</p></div>
              <div className="flex items-center gap-3"><UserCircle className="h-5 w-5 text-muted-foreground hidden sm:block" /><Select value={selectedFinBarber} onValueChange={setSelectedFinBarber}><SelectTrigger className="w-[200px] bg-card/50 border-border/50 font-medium"><SelectValue placeholder="Barbeiro" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os Barbeiros</SelectItem>{barbeirosUnicos.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent></Select></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { l: "Hoje", v: financeiroStats.ganhoHoje, ic: DollarSign, icC: "text-emerald-500", bgC: "bg-emerald-500/10", sub: "Até este momento" },
                { l: "Semana", v: financeiroStats.ganhoSemana, ic: TrendingUp, icC: "text-blue-500", bgC: "bg-blue-500/10", sub: "Desde domingo" },
                { l: "Mês", v: financeiroStats.ganhoMes, ic: Wallet, icC: "text-purple-500", bgC: "bg-purple-500/10", sub: "Este mês" },
                { l: "Ano", v: financeiroStats.ganhoAno, ic: BarChart3, icC: "text-indigo-500", bgC: "bg-indigo-500/10", sub: "Este ano" },
              ].map(c => (<div key={c.l} className="rounded-lg border border-border/50 p-5" style={{ background: "var(--gradient-card)" }}><div className="flex items-center justify-between mb-4"><span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{c.l}</span><div className={`h-8 w-8 rounded-full ${c.bgC} flex items-center justify-center`}><c.ic className={`h-4 w-4 ${c.icC}`} /></div></div><p className="font-display text-2xl font-bold text-foreground">{formatPreco(c.v)}</p><p className="text-[10px] text-muted-foreground mt-2">{c.sub}</p></div>))}
              <div className="rounded-lg border border-border/50 p-5 border-gold/30" style={{ background: "var(--gradient-card)" }}><div className="flex items-center justify-between mb-4"><span className="text-xs uppercase tracking-widest text-gold font-semibold">A Receber</span><div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center"><Banknote className="h-4 w-4 text-gold" /></div></div><p className="font-display text-2xl font-bold text-gold">{formatPreco(financeiroStats.ganhoFuturo)}</p><p className="text-[10px] text-gold/60 mt-2">Agendamentos futuros</p></div>
            </div>

            <div className="mt-6"><div className="rounded-lg border border-border/50 p-5 bg-card/50"><div className="mb-6"><h3 className="font-display font-semibold text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gold" />Evolução do Faturamento</h3><p className="text-xs text-muted-foreground mt-1">Últimos 7 dias e previsão para os próximos 15 dias</p></div><div className="h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartDataEvolucao.data} margin={{ top: 25, right: 20, left: 10, bottom: 0 }}><defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} /><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} width={70} /><RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#10B981' }} formatter={(v: number) => [formatPreco(v), "Total"]} />{chartDataEvolucao.labelHoje && (<ReferenceLine x={chartDataEvolucao.labelHoje} stroke="#FFFFFF" strokeDasharray="4 4" label={{ position: 'top', value: 'HOJE', fill: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }} />)}<Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" /></AreaChart></ResponsiveContainer></div></div></div>

            {/* ============================================================ */}
            {/* FATURAMENTO POR DIA — com pagamento e confirmação */}
            {/* ============================================================ */}
            <div className="rounded-lg border border-border/50 overflow-hidden mt-8" style={{ background: "var(--gradient-card)" }}>
              <div className="p-5 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5 text-gold" />Faturamento por Dia</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground text-base">{formatPreco(financeiroStats.ganhoDiaSelecionado)}</span></p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" />Confirmado: <span className="font-semibold text-emerald-400">{formatPreco(financeiroStats.confirmadoDia)}</span></p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleDashed className="h-3 w-3 text-amber-400" />Pendente: <span className="font-semibold text-amber-400">{formatPreco(financeiroStats.pendenteDia)}</span></p>
                  </div>
                </div>
                <Select value={selectedFinDayLabel} onValueChange={setSelectedFinDayLabel}><SelectTrigger className="w-full md:w-[280px] bg-background/50 border-border/50"><SelectValue placeholder="Selecione o dia" /></SelectTrigger><SelectContent className="max-h-[300px]">{finDays.map(d => (<SelectItem key={d.label} value={d.label}>{d.weekdayShort}, {d.dayNum} de {d.monthShort} {d.isToday ? "(Hoje)" : ""}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="overflow-x-auto">
                <Table><TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Cliente</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Serviço</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Barbeiro</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Pagamento</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Confirmação</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-medium text-right">Valor</TableHead>
                </TableRow></TableHeader><TableBody>
                  {finDayAgendamentos.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum faturamento registrado.</TableCell></TableRow>) : (
                    finDayAgendamentos.map(ag => {
                      const preco = getPrecoEfetivo(ag, servicos);
                      return (<TableRow key={ag.id} className="border-border/30 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-foreground">{ag.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{ag.servico}</TableCell>
                        <TableCell className="text-muted-foreground">{ag.barbeiro || "-"}</TableCell>
                        <TableCell>
                          <Select value={ag.forma_pagamento || "pix"} onValueChange={(v) => changePaymentMethod(ag.id, v)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs bg-background/30 border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pix"><span className="flex items-center gap-1.5"><Smartphone className="h-3 w-3 text-emerald-400" />Pix</span></SelectItem>
                              <SelectItem value="dinheiro"><span className="flex items-center gap-1.5"><Banknote className="h-3 w-3 text-green-400" />Dinheiro</span></SelectItem>
                              <SelectItem value="cartao"><span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-blue-400" />Cartão</span></SelectItem>
                              <SelectItem value="berries"><span className="flex items-center gap-1.5"><Skull className="h-3 w-3 text-amber-400" />Berries</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={ag.pagamento_confirmado}
                              onCheckedChange={() => togglePaymentConfirmation(ag.id, ag.pagamento_confirmado)}
                              className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                            <ConfirmationBadge confirmed={ag.pagamento_confirmado} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-emerald-400 font-medium">{formatPreco(preco)}</span>
                          {ag.desconto_percent > 0 && <span className="ml-1.5 text-[9px] text-emerald-400/50 font-medium">-{ag.desconto_percent}%</span>}
                        </TableCell>
                      </TableRow>);
                    })
                  )}
                </TableBody></Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ===== DIALOGS ===== */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent className="border-border/50 bg-card"><AlertDialogHeader><AlertDialogTitle className="font-display">Apagar agendamento?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">{deleting ? "A apagar..." : "Apagar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deleteServicoId} onOpenChange={() => setDeleteServicoId(null)}><AlertDialogContent className="border-border/50 bg-card"><AlertDialogHeader><AlertDialogTitle className="font-display">Apagar serviço?</AlertDialogTitle><AlertDialogDescription>Permanente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deletingServico}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteServico} disabled={deletingServico} className="bg-red-500 hover:bg-red-600 text-white">{deletingServico ? "A apagar..." : "Apagar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {/* Edit Agendamento — sem campo de pagamento (isso é na aba finanças) */}
      <Dialog open={!!editingAgendamento} onOpenChange={closeEditAgendamento}>
        <DialogContent className="sm:max-w-[460px] border-border/50 bg-card" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-display text-gold flex items-center gap-2"><Pencil className="h-5 w-5" />Editar Agendamento</DialogTitle><DialogDescription>Altere os dados do agendamento de <span className="text-foreground font-medium">{editingAgendamento?.data}</span>.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Nome</Label><Input value={agFormNome} onChange={e => setAgFormNome(e.target.value)} placeholder="Nome" className="bg-background/50 border-border/50" /></div>
            <div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Telefone</Label><div className="flex gap-2 items-center"><div className="relative flex-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={agFormTelefone} onChange={e => setAgFormTelefone(e.target.value)} placeholder="(00) 00000-0000" className="pl-9 bg-background/50 border-border/50" /></div>{agFormTelefone && (<a href={`https://wa.me/55${agFormTelefone.replace(/\\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/30 rounded-md px-2.5 h-10 hover:bg-emerald-400/10 transition-colors flex-shrink-0">WhatsApp</a>)}</div></div>
            <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Serviço</Label><Select value={agFormServico} onValueChange={setAgFormServico}><SelectTrigger className="bg-background/50 border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{servicos.filter(s => s.ativo).map(s => (<SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>))}</SelectContent></Select></div><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Barbeiro</Label><Select value={agFormBarbeiro} onValueChange={setAgFormBarbeiro}><SelectTrigger className="bg-background/50 border-border/50"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{barbeirosUnicos.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent></Select></div></div>
            <div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Horário</Label><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={agFormHora} onChange={e => setAgFormHora(e.target.value)} placeholder="HH:MM" className="pl-9 bg-background/50 border-border/50" /></div></div>
            {editingAgendamento && editingAgendamento.desconto_percent > 0 && (<div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/[0.04] rounded-lg px-3 py-2 border border-emerald-500/10"><span>Desconto:</span><span className="text-emerald-400 font-medium">-{editingAgendamento.desconto_percent}%</span><span className="text-muted-foreground/50">·</span><span>Cobrado: <span className="text-emerald-400 font-medium">{formatPreco(editingAgendamento.preco_cobrado)}</span></span></div>)}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => { closeEditAgendamento(); if (editingAgendamento) setDeleteId(editingAgendamento.id); }} className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 gap-1.5 h-9 px-3"><Trash2 className="h-3.5 w-3.5" /><span className="text-xs">Apagar</span></Button>
            <div className="flex gap-3"><Button variant="ghost" onClick={closeEditAgendamento} disabled={savingAgendamento}>Cancelar</Button><Button onClick={handleSaveAgendamento} disabled={savingAgendamento} className="gradient-gold text-primary-foreground font-semibold">{savingAgendamento ? "A guardar..." : "Guardar"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingServico || showAddServico} onOpenChange={closeServicoDialog}><DialogContent className="sm:max-w-[425px] border-border/50 bg-card"><DialogHeader><DialogTitle className="text-xl font-display text-gold">{editingServico ? "Editar Serviço" : "Novo Serviço"}</DialogTitle><DialogDescription>{editingServico ? "Altere os dados." : "Preencha os dados."}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Nome</Label><Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Corte e Barba" className="bg-background/50 border-border/50" /></div><div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Preço (R$)</Label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" min="0" value={formPreco} onChange={e => setFormPreco(e.target.value)} placeholder="35.00" className="pl-9 bg-background/50 border-border/50" /></div></div><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Duração</Label><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={formDuracao} onChange={e => setFormDuracao(e.target.value)} placeholder="30min" className="pl-9 bg-background/50 border-border/50" /></div></div></div><div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Ordem</Label><Input type="number" min="0" value={formOrdem} onChange={e => setFormOrdem(e.target.value)} placeholder="1" className="bg-background/50 border-border/50" /></div><div className="grid gap-2"><Label className="text-xs uppercase tracking-widest text-muted-foreground">Estado</Label><div className="flex items-center gap-3 h-10"><Switch checked={formAtivo} onCheckedChange={setFormAtivo} className="data-[state=checked]:bg-emerald-500" /><span className={`text-sm ${formAtivo ? "text-emerald-400" : "text-muted-foreground"}`}>{formAtivo ? "Ativo" : "Inativo"}</span></div></div></div></div><div className="flex gap-3 justify-end"><Button variant="ghost" onClick={closeServicoDialog} disabled={savingServico}>Cancelar</Button><Button onClick={handleSaveServico} disabled={savingServico} className="gradient-gold text-primary-foreground font-semibold">{savingServico ? "A guardar..." : editingServico ? "Guardar" : "Criar serviço"}</Button></div></DialogContent></Dialog>

      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}><DialogContent className="sm:max-w-[460px] border-border/50 bg-card"><DialogHeader><DialogTitle className="text-xl font-display text-gold flex items-center gap-2"><Settings2 className="h-5 w-5" />Gerir horários do dia</DialogTitle><DialogDescription>Bloqueie ou desbloqueie horários só para <span className="text-foreground font-medium">{selectedDayLabel}</span>.</DialogDescription></DialogHeader><div className="py-4"><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{baseSlots.map(slot => { const isBlocked = bloqueados.includes(slot); const isToggling = togglingSlot === slot; const hasAppt = dayAgendamentos.some(a => a.hora === slot); return (<button key={slot} type="button" disabled={isToggling || hasAppt} onClick={() => toggleSlotForDay(slot)} className={`relative flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 px-2 transition-all text-sm font-medium ${hasAppt ? "border-gold/30 bg-gold/5 text-gold/60 cursor-default" : isBlocked ? "border-red-400/30 bg-red-400/5 text-red-400 hover:bg-red-400/10" : "border-emerald-400/30 bg-emerald-400/5 text-emerald-400 hover:bg-emerald-400/10"} ${isToggling ? "opacity-50" : ""}`}>{hasAppt ? <Scissors className="h-3 w-3" /> : isBlocked ? <Ban className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}<span className="font-display tabular-nums">{slot}</span></button>); })}</div><div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><CircleCheck className="h-3 w-3 text-emerald-400" />Disponível</span><span className="flex items-center gap-1"><Ban className="h-3 w-3 text-red-400" />Bloqueado</span><span className="flex items-center gap-1"><Scissors className="h-3 w-3 text-gold/60" />Com agendamento</span></div></div></DialogContent></Dialog>

      <Dialog open={showGlobalDialog} onOpenChange={setShowGlobalDialog}><DialogContent className="sm:max-w-[440px] border-border/50 bg-card"><DialogHeader><DialogTitle className="text-xl font-display text-gold flex items-center gap-2"><Clock className="h-5 w-5" />Horários base</DialogTitle><DialogDescription>Horários padrão de todos os dias.</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="flex gap-2"><div className="relative flex-1"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={newSlotInput} onChange={e => setNewSlotInput(e.target.value)} placeholder="HH:MM" className="pl-9 bg-background/50 border-border/50" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSlotGlobal(); } }} /></div><Button onClick={addSlotGlobal} className="gradient-gold text-primary-foreground font-semibold gap-1.5 px-4"><Plus className="h-4 w-4" />Adicionar</Button></div><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{editSlots.length} horário{editSlots.length !== 1 ? "s" : ""}</span><button type="button" onClick={() => setEditSlots([...DEFAULT_TIME_SLOTS])} className="text-[11px] text-gold/70 hover:text-gold underline underline-offset-2">Restaurar padrão</button></div><div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto py-1">{editSlots.map((sl, i) => { const prev = i > 0 ? editSlots[i - 1] : null; const gap = prev && timeToMinutes(sl) - timeToMinutes(prev) > 30; return (<div key={sl} className="relative">{gap && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-border/40 rounded-full" />}<div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 pl-3 pr-1 py-1.5 hover:border-gold/30 transition-colors"><span className="font-display text-sm font-medium text-foreground tabular-nums">{sl}</span><button type="button" onClick={() => removeSlotGlobal(sl)} className="ml-0.5 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10"><span className="text-xs">✕</span></button></div></div>); })}</div></div></div><div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setShowGlobalDialog(false)} disabled={savingSlots}>Cancelar</Button><Button onClick={saveGlobalSlots} disabled={savingSlots} className="gradient-gold text-primary-foreground font-semibold">{savingSlots ? "A guardar..." : "Guardar"}</Button></div></DialogContent></Dialog>
    </div>
  );
}