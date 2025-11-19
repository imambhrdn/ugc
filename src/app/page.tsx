"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Chat from "@/components/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Database, Shield, ArrowRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { CreditBalance } from "@/components/shared/credit-balance";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Consistent with Dashboard */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              AI UGC Generator
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="font-medium">
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <SignedIn>
              <CreditBalance />
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" className="sm:hidden" title="Dashboard">
                  <Sparkles className="w-4 h-4" />
                </Button>
              </Link>
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <Button size="sm">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <UserButton />
            </SignedIn>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="text-center py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-6">
            <Sparkles className="w-3 h-3 mr-1" />
            AI UGC Generator
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Create UGC Content with AI
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Transform your ideas into stunning user-generated content using advanced AI technology. Perfect for creators, marketers, and content producers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg" className="px-8 py-6 text-lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <Button size="lg" className="px-8 py-6 text-lg">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful UGC Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create stunning user-generated content with our advanced AI-powered platform designed for creators and professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Zap className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>Fast Generation</CardTitle>
              </div>
              <CardDescription>
                Quick content generation with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Lightning fast responses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Multiple content types</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>High-quality output</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
              </div>
              <CardDescription>
                Your data is protected and secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Encrypted connections</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Private history</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Secure authentication</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Database className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>Credit System</CardTitle>
              </div>
              <CardDescription>
                Flexible usage-based pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Pay-per-use credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Usage tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No monthly commitments</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>


      {/* Chat Section - Only for signed in users */}
      <SignedIn>
        <section className="container mx-auto px-4 sm:px-6 pb-12 max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Chat with your AI coding assistant to generate code, debug, and learn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Chat />
            </CardContent>
          </Card>
        </section>
      </SignedIn>
    </div>
  );
}
