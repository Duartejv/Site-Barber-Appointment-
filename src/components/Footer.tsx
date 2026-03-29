import { Link, useNavigate, useLocation } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { Instagram, Phone, MapPin, Clock, ArrowUpRight } from "lucide-react";

export const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Início', href: '#hero' },
    { name: 'Serviços', href: '#services' },
    { name: 'Localização', href: '#location' }
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault(); // Impede que o # mude na URL e quebre o HashRouter
    
    if (location.pathname === '/') {
      // Se já estiver na página inicial, apenas rola até a seção
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Se estiver em outra página (ex: /agendar), volta para a Home primeiro
      navigate('/');
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100); // Pequeno atraso para garantir que a Home carregou antes de rolar
    }
  };

  return (
    <footer className="border-t border-border/40 pt-16 pb-8 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <img src={logoImg} alt="JoãoS Barbearia" className="h-14 w-auto" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Tradição e estilo moderno se encontram. Oferecemos mais que um corte, oferecemos uma experiência de cuidado pessoal.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px w-8 bg-gold/40" />
              <p className="text-gold/80 text-xs tracking-[0.2em] uppercase font-elegant">Desde 2019</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-foreground font-display text-lg font-semibold mb-6">Navegação</h4>
            <ul className="space-y-4">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-muted-foreground hover:text-gold transition-colors text-sm flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/50 group-hover:bg-gold transition-colors" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-foreground font-display text-lg font-semibold mb-6">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin size={18} className="text-gold shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span>Rua João Ramalho Leite, 77 - Castelo Branco</span>
                  <span>João Pessoa - PB</span>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Phone size={18} className="text-gold shrink-0 mt-0.5" />
                <span>(83) 98761-6561</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Clock size={18} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p>Ter – Sex: 09:00 – 19:00</p>
                  <p>Sáb: 08:00 – 17:00</p>
                  <p className="text-destructive mt-1">Dom e Seg: Fechado</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground/60 text-xs text-center md:text-left">
            © {new Date().getFullYear()} Barbearia JoãoS · Todos os direitos reservados
          </p>
          
          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com/barbeariajoaos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-gold transition-colors flex items-center gap-2 text-xs uppercase tracking-wider group"
            >
              Instagram <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <span className="text-border/40">·</span>

            <Link
              to="/admin/login"
              className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors text-[11px] tracking-wide"
            >
              Área do barbeiro
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};