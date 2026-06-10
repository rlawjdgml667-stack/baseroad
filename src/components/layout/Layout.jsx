import { useState } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { Toaster } from "react-hot-toast";
import InquiryModal from "../ui/InquiryModal";
import { MessageSquare } from "lucide-react";

export default function Layout({ children }) {
  const [showInquiry, setShowInquiry] = useState(false);
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-screen-lg mx-auto px-3 py-4 pb-20 sm:pb-6">{children}</main>
      <BottomNav />
      {/* 문의하기 플로팅 버튼 */}
      <button
        onClick={() => setShowInquiry(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 z-[200] flex items-center gap-2 bg-navy text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-navy/90 transition"
      >
        <MessageSquare size={14}/> 문의하기
      </button>
      {showInquiry && <InquiryModal onClose={() => setShowInquiry(false)} />}
      <Toaster position="bottom-center" containerStyle={{ bottom: 72 }} toastOptions={{ style: { fontFamily: "inherit", fontSize: 13 } }} />
    </div>
  );
}
