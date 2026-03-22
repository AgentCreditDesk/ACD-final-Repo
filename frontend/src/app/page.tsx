"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { loansApi } from "@/lib/api";

/* ─── Animated Counter ─────────────────────────────────── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 80 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v).toString()));
    return unsub;
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Typewriter Effect ────────────────────────────────── */
function Typewriter({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="text-teal animate-pulse">|</span>}
    </span>
  );
}

/* ─── Stagger Container ────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

/* ─── Main Page ────────────────────────────────────────── */
export default function Home() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loansApi.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-24 pb-20">
      {/* ═══ HERO ═══ */}
      <section className="relative pt-16 pb-8">
        {/* Background orbs */}
        <div className="orb orb-teal w-[500px] h-[500px] -top-40 -left-40 opacity-20" />
        <div className="orb orb-purple w-[400px] h-[400px] top-20 -right-40 opacity-15" />

        <div className="relative text-center max-w-4xl mx-auto">
          {/* Logo + Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-8 flex flex-col items-center gap-5"
          >
            <Image
              src="/logo.png"
              alt="ACD Logo"
              width={400}
              height={400}
              className="w-36 h-36 object-contain"
              style={{ filter: "brightness(1.5) drop-shadow(0 0 40px rgba(0,194,168,0.7))" }}
            />
            <span className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-xs font-medium text-teal border border-teal/20">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              Powered by Tether WDK
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            <Typewriter text="Agent Credit Desk" className="text-gradient" />
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Autonomous AI lending protocol that underwrites loans, deploys on-chain escrow vaults,
            and optimizes treasury yield — <span className="text-teal/80">without human intervention</span>.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mt-10"
          >
            <Link
              href="/borrower"
              className="group relative px-8 py-3.5 rounded-xl text-white font-medium text-sm overflow-hidden transition-all hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal to-teal/70 transition-all group-hover:from-teal group-hover:to-purple/60" />
              <div className="absolute inset-0 glow-teal opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Borrow USDT</span>
            </Link>
            <Link
              href="/treasury"
              className="px-8 py-3.5 glass rounded-xl text-white/70 font-medium text-sm hover:text-white hover:border-white/20 transition-all hover:scale-[1.02]"
            >
              View Treasury
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ DIVIDER ═══ */}
      <div className="line-glow" />

      {/* ═══ STATS ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <span className="text-xs font-mono text-teal/60 uppercase tracking-[0.2em]">Protocol Metrics</span>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Loans", value: stats?.total ?? 0, color: "text-white" },
            { label: "Pending", value: stats?.pending ?? 0, color: "text-yellow-400" },
            { label: "Repaid", value: stats?.repaid ?? 0, color: "text-teal" },
            { label: "Defaulted", value: stats?.defaulted ?? 0, color: "text-red-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="glass rounded-2xl p-6 hover-glow cursor-default"
            >
              <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2">{stat.label}</p>
              <p className={`text-4xl font-bold ${stat.color}`}>
                <AnimatedNumber value={stat.value} />
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ═══ HOW IT WORKS ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-12">
          <span className="text-xs font-mono text-purple/60 uppercase tracking-[0.2em]">Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-white">
            Three pillars of <span className="text-gradient-static">autonomous lending</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              ),
              title: "On-Chain Escrow",
              desc: "Each loan deploys a LoanVault smart contract — principal held in escrow, interest computed on-chain, settlement trustless.",
              accent: "teal",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              ),
              title: "AI Underwriting",
              desc: "Autonomous agent evaluates credit scores, risk tiers, and treasury health to make instant lending decisions via Groq LLM.",
              accent: "purple",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: "Yield Optimization",
              desc: "Idle capital flows to Aave V3 for yield. The agent rebalances between lending and DeFi positions autonomously.",
              accent: "teal",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className="glass rounded-2xl p-8 hover-glow group cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                feature.accent === "teal"
                  ? "bg-teal/10 text-teal"
                  : "bg-purple/10 text-purple"
              } group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ═══ TECH STACK ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <span className="text-xs font-mono text-teal/60 uppercase tracking-[0.2em]">Stack</span>
          <h2 className="text-2xl font-bold mt-3 text-white">Built with production-grade tools</h2>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
          {[
            { name: "Tether WDK", glow: true },
            { name: "Solidity" },
            { name: "Aave V3" },
            { name: "OpenClaw", glow: true },
            { name: "Groq LLM" },
            { name: "MCP Server" },
            { name: "TypeScript" },
            { name: "Next.js" },
            { name: "Prisma" },
            { name: "Base Sepolia" },
          ].map((tech, i) => (
            <motion.span
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              viewport={{ once: true }}
              className={`px-4 py-2 glass rounded-xl text-sm font-mono transition-all hover:scale-105 cursor-default ${
                tech.glow
                  ? "text-teal border-teal/20 hover:glow-teal"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {tech.name}
            </motion.span>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══ TERMINAL PREVIEW ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <span className="text-xs font-mono text-purple/60 uppercase tracking-[0.2em]">Agent API</span>
          <h2 className="text-2xl font-bold mt-3 text-white">
            Any AI agent can <span className="text-gradient-static">borrow programmatically</span>
          </h2>
        </motion.div>

        <motion.div variants={fadeUp} className="terminal max-w-3xl mx-auto overflow-hidden">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500/80" />
            <div className="terminal-dot bg-yellow-500/80" />
            <div className="terminal-dot bg-green-500/80" />
            <span className="ml-3 text-xs text-white/30 font-mono">agent-api</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-3 overflow-x-auto">
            <div>
              <span className="text-purple/80">$</span>{" "}
              <span className="text-white/60">curl -H</span>{" "}
              <span className="text-teal/80">&quot;X-Agent-Key: ***&quot;</span>{" "}
              <span className="text-white/60">/agent-api/capabilities</span>
            </div>
            <div className="text-white/30 pl-2">
              {`{`}<br/>
              {"  "}<span className="text-teal/60">&quot;protocol&quot;</span>: <span className="text-amber-400/70">&quot;acd-lending-v1&quot;</span>,<br/>
              {"  "}<span className="text-teal/60">&quot;capabilities&quot;</span>: [<span className="text-amber-400/70">&quot;loan_request&quot;</span>, <span className="text-amber-400/70">&quot;credit_check&quot;</span>, <span className="text-amber-400/70">&quot;treasury_query&quot;</span>],<br/>
              {"  "}<span className="text-teal/60">&quot;asset&quot;</span>: <span className="text-amber-400/70">&quot;USDT&quot;</span>,<br/>
              {"  "}<span className="text-teal/60">&quot;chain&quot;</span>: <span className="text-amber-400/70">&quot;base-sepolia&quot;</span><br/>
              {`}`}
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ═══ BOTTOM CTA ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center"
      >
        <motion.div variants={fadeUp}>
          <div className="relative inline-block">
            <div className="orb orb-teal w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white relative">
              Ready to <span className="text-gradient-static">borrow</span>?
            </h2>
          </div>
          <p className="text-white/40 mt-4 mb-8 max-w-md mx-auto">
            Connect your wallet and get an instant credit assessment from our autonomous AI underwriter.
          </p>
          <Link
            href="/borrower"
            className="inline-block px-10 py-4 bg-gradient-to-r from-teal to-teal/70 rounded-xl text-white font-medium hover:scale-[1.02] transition-transform glow-teal"
          >
            Launch Borrower Portal
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}
