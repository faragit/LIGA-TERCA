import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import OnlineTracker from "@/components/OnlineTracker";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <OnlineTracker />
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </RequireAuth>
  );
}

