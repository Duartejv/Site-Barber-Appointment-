import barbershop1 from "@/assets/barbershop-1.png";
import barbershop2 from "@/assets/barbershop-2.png";

export const GallerySection = () => {
  return (
    <section id="gallery" className="py-24 px-4" style={{ background: "hsl(var(--charcoal))" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs tracking-[0.4em] uppercase font-medium mb-3">Nosso espaço</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            A Barbearia
          </h2>
          <div className="flex items-center justify-center">
            <div className="h-px w-20 bg-gold/50" />
            <div className="mx-3 w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gold/50" />
          </div>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group relative overflow-hidden rounded-lg aspect-[4/3]">
            <img
              src={barbershop2}
              alt="Interior da Barbearia JoãoS"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Texto sempre visível */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-100 flex items-end p-6">
              <p className="text-foreground font-elegant text-lg">Ambiente moderno e acolhedor</p>
            </div>
            {/* Gold border on hover */}
            <div className="absolute inset-0 border-2 border-gold/0 group-hover:border-gold/40 rounded-lg transition-all duration-300" />
          </div>

          <div className="group relative overflow-hidden rounded-lg aspect-[4/3]">
            <img
              src={barbershop1}
              alt="Cadeiras da Barbearia JoãoS"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Texto sempre visível */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-100 flex items-end p-6">
              <p className="text-foreground font-elegant text-lg">Cadeiras premium de barbeiro</p>
            </div>
            <div className="absolute inset-0 border-2 border-gold/0 group-hover:border-gold/40 rounded-lg transition-all duration-300" />
          </div>
        </div>
      </div>
    </section>
  );
};