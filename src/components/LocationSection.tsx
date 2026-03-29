import { MapPin, Clock, Phone, Instagram } from "lucide-react";

const hours = [
  { day: "Segunda", time: "Fechado" },
  { day: "Terça – Sexta", time: "09:00 – 19:00" },
  { day: "Sábado", time: "08:00 – 17:00" },
  { day: "Domingo", time: "Fechado" },
];

export const LocationSection = () => {
  const addressLine1 = "Rua João Ramalho Leite, 77 - Castelo Branco";
  const addressLine2 = "João Pessoa - PB, 58050-620";
  
  // URL atualizada para pesquisar o nome exato da barbearia e a morada, 
  // garantindo que o pino oficial do estabelecimento aparece no site
  const mapEmbedUrl = "https://maps.google.com/maps?q=Barbearia+Jo%C3%A3oS,+Rua+Jo%C3%A3o+Ramalho+Leite,+77+-+Castelo+Branco,+Jo%C3%A3o+Pessoa+-+PB&output=embed";

  return (
    <section id="location" className="py-24 px-4" style={{ background: "hsl(var(--charcoal))" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs tracking-[0.4em] uppercase font-medium mb-3">Onde estamos</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Localização
          </h2>
          <div className="flex items-center justify-center">
            <div className="h-px w-20 bg-gold/50" />
            <div className="mx-3 w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gold/50" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Info - Coluna da Esquerda */}
          <div className="space-y-8 flex flex-col justify-center">
            <div className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mt-1">
                <MapPin className="text-gold" size={20} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">Endereço</h4>
                <p className="text-muted-foreground">{addressLine1}</p>
                <p className="text-muted-foreground">{addressLine2}</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mt-1">
                <Clock className="text-gold" size={20} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-3">Horários</h4>
                <div className="space-y-2 max-w-xs">
                  {hours.map((h) => (
                    <div key={h.day} className="flex justify-between gap-6 text-sm">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className={h.time === "Fechado" ? "text-destructive" : "text-gold font-medium"}>
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mt-1">
                <Phone className="text-gold" size={20} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">Contato</h4>
                <a href="tel:+5583987616561" className="text-muted-foreground hover:text-gold transition-colors">
                  (83) 98761-6561
                </a>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mt-1">
                <Instagram className="text-gold" size={20} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">Instagram</h4>
                <a
                  href="https://instagram.com/barbeariajoaos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-gold transition-colors"
                >
                  @barbeariajoaos
                </a>
              </div>
            </div>
          </div>

          {/* Google Maps Embed - Coluna da Direita */}
          <div className="rounded-lg overflow-hidden border border-border min-h-[400px] lg:h-full lg:min-h-0 relative">
            <iframe
              title="Localização da Barbearia JoãoS"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};