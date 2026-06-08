import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { Toaster } from "react-hot-toast";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-screen-lg mx-auto px-3 py-4 pb-20 sm:pb-6">{children}</main>
      <BottomNav />
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: "inherit", fontSize: 13 } }} />
    </div>
  );
}
