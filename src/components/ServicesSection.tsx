import { useServicos } from "@/hooks/use-servicos";

// Lista fixa e explícita com os 8 serviços solicitados, agora sem preço e duração
const servicosFixos = [
  {
    id: "corte",
    nome: "Corte",
    descricao: "Estilo impecável, do clássico ao moderno, perfeitamente adequado ao seu formato de rosto.",
  },
  {
    id: "corte-infantil",
    nome: "Corte 0 até 6 anos",
    descricao: "Atendimento especial, rápido e paciente para os pequenos ficarem no estilo.",
  },
  {
    id: "barba",
    nome: "Barba",
    descricao: "Modelagem perfeita com toalha quente e produtos premium para um acabamento de respeito.",
  },
  {
    id: "hidratacao",
    nome: "Hidratação",
    descricao: "Tratamento profundo para restaurar a saúde, a maciez e o brilho natural dos fios.",
  },
  {
    id: "selagem",
    nome: "Selagem",
    descricao: "Redução de volume e controle de frizz, garantindo cabelos muito mais alinhados.",
  },
  {
    id: "botox",
    nome: "Botox",
    descricao: "Reconstrução capilar avançada para devolver a massa e a textura ideal do seu cabelo.",
  },
  {
    id: "luzes",
    nome: "Luzes",
    descricao: "Iluminação estratégica para destacar o seu corte e renovar completamente o visual.",
  },
  {
    id: "plantinado",
    nome: "Plantinado",
    descricao: "Descoloração segura e de alto nível para alcançar aquele tom platinado perfeito.",
  }
];

export const ServicesSection = () => {
  // Puxamos do banco apenas para saber o total de serviços cadastrados
  const { servicos, loading } = useServicos();

  // Se o banco tiver mais de 8 serviços, calculamos a diferença para mostrar na mensagem
  const totalNoBanco = servicos.length;
  const remainingCount = totalNoBanco > 8 ? totalNoBanco - 8 : 0;

  return (
    <section id="services" className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs tracking-[0.4em] uppercase font-medium mb-3">O que oferecemos</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Nossos Serviços
          </h2>
          <div className="flex items-center justify-center">
            <div className="h-px w-20 bg-gold/50" />
            <div className="mx-3 w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gold/50" />
          </div>
        </div>

        {/* Cards (Carregam instantaneamente) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {servicosFixos.map((service) => (
            <div
              key={service.id}
              className="group relative rounded-lg p-6 border border-border hover:border-gold/50 transition-all duration-300 flex flex-col justify-between"
              style={{ background: "var(--gradient-card)" }}
            >
              {/* Gold top accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg gradient-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3 mt-2">
                  {service.nome}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.descricao}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Indicador de mais serviços */}
        {!loading && remainingCount > 0 ? (
          <p className="text-center text-muted-foreground text-sm mt-10">
            Veja valores e mais {remainingCount} {remainingCount === 1 ? 'serviço disponível' : 'serviços disponíveis'} ao agendar.
          </p>
        ) : (
          <p className="text-center text-muted-foreground text-sm mt-10">
            Veja valores e mais serviços disponíveis ao agendar.
          </p>
        )}
      </div>
    </section>
  );
};