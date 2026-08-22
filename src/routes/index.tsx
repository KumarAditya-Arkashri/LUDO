import { createFileRoute, Link } from "@tanstack/react-router";
import { Menu, MessageCircle, Download } from "lucide-react";
import heroImage from "@/assets/ludo-hero.jpg";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ludo Arena — Play Real-Money 1v1 Ludo Online" },
      {
        name: "description",
        content: "Play real-time 1v1 Ludo for cash.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="relative min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <button className="text-foreground p-1">
            <Menu size={28} className="text-gray-600" />
          </button>
          <div className="scale-75 origin-left">
            <Logo />
          </div>
        </div>
        <Link 
          to="/login"
          className="rounded-md border border-gray-800 px-6 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 transition-colors"
        >
          LOGIN
        </Link>
      </header>

      {/* Top Notice Marquee */}
      <div className="bg-primary py-2 px-4 text-center text-sm text-white overflow-hidden whitespace-nowrap">
        <span>Commission: 5% &bull; Referral: 3% For All Games</span>
      </div>

      {/* Helpline Marquee */}
      <div className="bg-[#e6f4ea] py-2 px-4 border-b border-[#cce5d3] text-[#1e7e34] overflow-hidden whitespace-nowrap">
        <span className="animate-pulse">Support available 24/7. Play Responsibly.</span>
      </div>

      {/* Main Content: Game Cards */}
      <div className="p-4 grid grid-cols-2 gap-4 mt-2">
        
        {/* Card 1: Classic Ludo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-success font-bold mb-1">
            <div className="size-2 rounded-full bg-success animate-pulse"></div>
            LIVE
          </div>
          <Link to="/login" className="block w-full">
            <div className="rounded-xl overflow-hidden shadow-md aspect-square bg-gray-100 border-2 border-transparent hover:border-primary transition-colors">
              <img 
                src={heroImage} 
                alt="Classic Ludo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-2 h-2 w-3/4 mx-auto bg-gray-200 rounded-full"></div>
          </Link>
        </div>

        {/* Card 2: Ludo Gold (Coming Soon) */}
        <div className="flex flex-col items-center opacity-80">
          <div className="flex items-center gap-1 text-[10px] text-success font-bold mb-1">
            <div className="size-2 rounded-full bg-success"></div>
            COMING SOON
          </div>
          <div className="w-full">
            <div className="rounded-xl overflow-hidden shadow-md aspect-square bg-gray-100 grayscale">
              <img 
                src={heroImage} 
                alt="Ludo Variants" 
                className="w-full h-full object-cover opacity-80"
              />
            </div>
            <div className="mt-2 h-2 w-3/4 mx-auto bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Download App Button */}
      <div className="mt-auto p-6 flex justify-center mb-8">
        <Button className="bg-success hover:bg-success/90 text-white rounded-lg px-8 py-6 h-auto flex items-center gap-3 shadow-lg shadow-success/30 text-lg font-semibold transition-transform active:scale-95">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path d="M17.523 15.3414C17.5024 12.5977 19.7891 11.2335 19.8924 11.171C18.6186 9.32497 16.6343 9.04944 15.9619 9.01502C14.2818 8.84635 12.6468 10.0211 11.7854 10.0211C10.9241 10.0211 9.57867 9.03223 8.16912 9.06665C6.34448 9.08386 4.74366 10.134 3.81387 11.7701C1.90263 15.1118 3.33177 20.0381 5.1914 22.759C6.0867 24.0847 7.15418 25.5654 8.56715 25.5138C9.92844 25.4449 10.4449 24.6358 12.0634 24.6358C13.6819 24.6358 14.1468 25.5138 15.5598 25.4794C17.0244 25.4449 17.937 24.1363 18.815 22.8106C19.848 21.2957 20.2785 19.8324 20.313 19.7463C20.2441 19.7119 17.5574 18.679 17.523 15.3414ZM12.029 7.37894C12.7866 6.44915 13.3031 5.12347 13.1654 3.79779C12.029 3.84944 10.6343 4.57248 9.84232 5.51934C9.13639 6.34571 8.53375 7.70588 8.70594 9.01452C9.98013 9.11781 11.2715 8.30867 12.029 7.37894Z" transform="translate(1, -2) scale(0.9)"/>
          </svg>
          Download App
          <Download size={20} />
        </Button>
      </div>

      {/* Floating WhatsApp Support */}
      <a 
        href="#"
        className="fixed bottom-[80px] right-4 sm:right-[calc(50%-220px)] bg-success text-white p-3 rounded-full shadow-xl shadow-success/40 hover:scale-110 transition-transform z-50 flex items-center justify-center border-4 border-white"
        aria-label="WhatsApp Support"
      >
        <MessageCircle size={28} />
      </a>
    </div>
  );
}
