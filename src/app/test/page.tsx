import { LoginPage } from "@/components/LoginPage"; 
import { Toaster } from "@/components/ui/sonner";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <LoginPage />
      <Toaster />
    </div>
  );
}