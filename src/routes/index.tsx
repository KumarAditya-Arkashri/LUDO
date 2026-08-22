import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import heroImage from "@/assets/ludo-hero.jpg";
import { Logo } from "@/components/brand/logo";

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
