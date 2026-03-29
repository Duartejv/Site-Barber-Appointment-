import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, ChevronDown } from "lucide-react";
import heroImg from "@/assets/barbershop-2-hero.png";
import logoImg from "@/assets/logo-texto.png";

export const HeroSection = () => {
  // Função para scroll suave até à secção de serviços
  const scrollToServices = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.querySelector('#services');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-10 md:py-0">
      
      {/* Estilos customizados para animações contínuas */}
      <style>{`
        /* 1. Animação de respiração apenas para a caixa do botão */
        @keyframes pulse-btn-box-breathe {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.2); 
          }
          50% { 
            transform: scale(1.06); 
            opacity: 0.8;
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); 
          }
        }

        .btn-box-pulse {
          position: relative;
        }

        .btn-box-pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          background: inherit; 
          border-radius: inherit; 
          z-index: -1; 
          animation: pulse-btn-box-breathe 2.5s infinite ease-in-out;
          border: inherit; 
        }
        
        /* 2. Animação de pulsação na opacidade das linhas */
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        .animate-pulse-opacity {
          animation: pulse-opacity 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-in fade-in duration-1000"
        style={{ backgroundImage: `url(${heroImg})` }}
      />
      
      {/* Dark overlay suavizado */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(0 0% 0% / 0.8) 0%, hsl(0 0% 5% / 0.9) 100%)" }} />

      {/* Vinheta sutil */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(42 80% 52% / 0.05) 0%, transparent 70%)" }} />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex justify-center mb-6 animate-in fade-in zoom-in-90 duration-1000">
          <img
            src={logoImg}
            alt="JoãoS Barbearia"
            className="h-28 md:h-36 w-auto drop-shadow-2xl opacity-95 hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Tagline Compacta */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
          <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent via-gold to-gold animate-pulse-opacity" />
          <p className="font-sans text-gold text-[10px] md:text-xs tracking-[0.4em] uppercase font-medium">
            Desde 2019
          </p>
          <div className="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent via-gold to-gold animate-pulse-opacity" />
        </div>

        {/* Título Principal */}
        <h1 className="font-display text-3xl md:text-5xl font-medium text-foreground mb-4 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
          Estilo & Precisão <br className="hidden xs:block" />
          <span className="text-gold italic font-normal">em cada detalhe</span>
        </h1>

        {/* Descrição */}
        <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl mx-auto font-light leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500 fill-mode-both">
          Tradição e modernidade em uma experiência de barbearia única.
        </p>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
          
          {/* Botão Agendar com Animação Contínua na Caixa */}
          <Button
            asChild
            size="lg"
            className="gradient-gold text-primary-foreground font-semibold tracking-widest uppercase px-8 py-6 transition-all text-sm shadow-gold btn-box-pulse"
          >
            <Link to="/agendar">
              <Scissors className="mr-2" size={16} />
              Agendar
            </Link>
          </Button>
          
          {/* Botão Serviços - Atualizado com scroll suave */}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-gold/30 text-gold hover:bg-gold/10 hover:border-gold hover:text-gold-light uppercase tracking-widest px-8 py-6 text-sm transition-all cursor-pointer"
          >
            <a href="#services" onClick={scrollToServices}>Serviços</a>
          </Button>
        </div>
      </div>

      {/* Scroll indicator - Atualizado com scroll suave */}
      <a
        href="#services"
        onClick={scrollToServices}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gold/30 hover:text-gold transition-colors p-2 animate-in fade-in duration-1000 delay-1000 fill-mode-both cursor-pointer"
        aria-label="Rolar para baixo"
      >
        <ChevronDown size={24} className="animate-bounce" />
      </a>
    </section>
  );
};