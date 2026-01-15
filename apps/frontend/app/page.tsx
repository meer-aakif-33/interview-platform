"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const startInterview = async () => {
    const res = await fetch("http://localhost:4000/api/session/start", {
      method: "POST"
    });
    const data = await res.json();
    router.push(`/interview?sessionId=${data.sessionId}`);
  };

  return (
    <main className="flex h-screen items-center justify-center">
      <button
        onClick={startInterview}
        className="px-6 py-3 rounded-md bg-black text-white"
      >
        Start Interview
      </button>
    </main>
  );
}
