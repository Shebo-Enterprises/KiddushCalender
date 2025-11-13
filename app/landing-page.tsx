/**
 * KiddushWare Modern Landing Page
 * 
 * To use this component, you'll need a React project (e.g., Next.js) with:
 * - TypeScript
 * - Tailwind CSS
 * - shadcn/ui components: Button, Card
 * - framer-motion for animations
 * - lucide-react for icons
 * 
 * Installation in a shadcn/ui project:
 * npx shadcn-ui@latest add button
 * npx shadcn-ui@latest add card
 * npm install framer-motion lucide-react
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui alias is @/components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Users, Gift, ArrowRight } from 'lucide-react';

// Animation variants for Framer Motion
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <motion.div variants={fadeIn}>
    <Card className="h-full text-center bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1">
      <CardHeader>
        <div className="mx-auto bg-blue-500/10 text-blue-400 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400">{children}</p>
      </CardContent>
    </Card>
  </motion.div>
);

export function KiddushWareLandingPage() {
  return (
    <div className="bg-gray-900 text-white antialiased">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-gray-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-600 opacity-20 blur-[100px]"></div>
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/5"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="text-2xl font-bold tracking-tighter">
              KiddushWare
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</a>
            </nav>
            <Button asChild className="group">
              <a href="/app">
                Login / Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        </div>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="py-24 sm:py-32 text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" animate="visible" variants={fadeIn}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                Sponsor, Track, Celebrate.
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-300">
                The modern, all-in-one platform to effortlessly manage Kiddush sponsorships, scheduling, and donor engagement for your community.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Button size="lg" asChild className="group">
                  <a href="/app">
                    Start for Free
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 sm:py-32 bg-white/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">Why KiddushWare?</h2>
              <p className="mt-4 max-w-2xl mx-auto text-gray-400">
                Everything you need to streamline your sponsorship process and connect with your community.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <FeatureCard icon={<Calendar size={28} />} title="Effortless Scheduling">
                Manage your entire Kiddush calendar with a simple, intuitive interface. View upcoming events, available slots, and past sponsorships at a glance.
              </FeatureCard>
              <FeatureCard icon={<Gift size={28} />} title="Seamless Sponsorships">
                Provide a beautiful, modern form for members to sponsor a Kiddush. Accept payments, gather details, and approve submissions with ease.
              </FeatureCard>
              <FeatureCard icon={<Users size={28} />} title="Engage Your Donors">
                Keep a complete history of sponsorships. Recognize your donors and build stronger community relationships with detailed records.
              </FeatureCard>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">Get Started in Minutes</h2>
              <p className="mt-4 max-w-2xl mx-auto text-gray-400">
                Four simple steps to a streamlined sponsorship system.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8"
            >
              {[
                { num: 1, title: 'Create Account', desc: 'Sign up for free. No credit card required.' },
                { num: 2, title: 'Set Up Calendar', desc: 'Create your first sponsorship calendar or form.' },
                { num: 3, title: 'Share Your Link', desc: 'Embed the calendar on your site or share the link.' },
                { num: 4, title: 'Celebrate!', desc: 'Watch the sponsorships roll in and celebrate together.' },
              ].map((step, i) => (
                <motion.div key={i} variants={fadeIn} className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 font-bold text-2xl border-2 border-blue-500 text-blue-400 rounded-full">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-lg text-white">{step.title}</h3>
                  <p className="mt-1 text-gray-400">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 sm:py-32 bg-white/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">Simple, Transparent Pricing</h2>
              <p className="mt-4 max-w-2xl mx-auto text-gray-400">
                All the core features you need, completely free.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="mt-16 flex justify-center"
            >
              <Card className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border-blue-500 border-2 shadow-2xl shadow-blue-500/10">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-white">Community Plan</CardTitle>
                  <p className="text-5xl font-extrabold tracking-tight mt-4">Free</p>
                  <p className="text-gray-400">Forever.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-gray-300">
                    {[
                      'Unlimited Sponsorships',
                      'Customizable Forms & Calendars',
                      'Sponsorship Management Dashboard',
                      'Donor & People Tracking',
                      'Email Notifications',
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="w-full mt-6 group">
                    <a href="/app" className="w-full">
                      Get Started Now
                      <ArrowRight className="inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
                Ready to Modernize Your Kiddush Program?
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-gray-400">
                Join dozens of communities simplifying their workflow and celebrating together.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild className="group">
                  <a href="/app">
                    Create Your Free Account
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} KiddushWare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default KiddushWareLandingPage;