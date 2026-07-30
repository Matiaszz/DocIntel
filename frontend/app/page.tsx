"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import Header from "../components/dashboard/Header";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import DocumentManagement from "../components/dashboard/DocumentManagement";
import SettingsModal from "../components/dashboard/SettingsModal";
import FeedbackModal, {
  ModalType,
} from "../components/dashboard/FeedbackModal";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";

export default function Home() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
  } | null>(null);
  const router = useRouter();

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Beautiful custom shimmer instead of spinner loader
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Prevent flash of unauthenticated content
  if (!isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto animate-in fade-in duration-300 max-w-none px-4 sm:px-6 lg:px-8 py-4 flex flex-col min-h-0 h-[calc(100vh-64px)] space-y-4">
        <WelcomeBanner user={user} />

        {/* Workspace Operations */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <DocumentManagement />
        </div>
      </main>

      {/* Account Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSuccess={() => {
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Perfil Atualizado",
            message:
              "Suas informações de perfil foram salvas e atualizadas com sucesso!",
          });
        }}
      />

      {/* Reusable Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmLabel="Ok, entendi"
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
}

