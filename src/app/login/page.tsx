"use client";

import { signIn } from "next-auth/react";
import { Button } from "../_components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "../_components/ui/card";
import Image from "next/image";

export default function Login() {
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <main className="relative min-h-screen bg-white text-black">
      {/* Background Banner */}
      <div
        className="w-full h-64"
        style={{
          backgroundImage: `url(/login-bg-image.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Login Form Section */}
      <div className="w-full px-4 md:px-6">
        <div className="relative mx-auto -mt-16 w-full max-w-2xl bg-white">
            <div className="flex flex-col gap-6 opacity-90 bg-white/80 p-6 rounded-lg shadow-lg">
                <CardHeader className="flex flex-col items-center gap-4">
                    <Image
                    src="/lyra-logo.png"
                    alt="Lyra Logo"
                    width={64}
                    height={64}
                    />
                    <CardTitle className="text-2xl">💼 Gmail</CardTitle>
                    <CardDescription>a simple email app that uses the gmail api</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                    >
                        Sign in with Google
                    </Button>
                    </div>
                </CardContent>
                </div>
        </div>
      </div>
    </main>
  );
}