import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  cpf: z.string().min(11).max(20),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const itemSchema = z.object({
  desc: z.string().max(300).optional().default(""),
  value: z.string().max(20).optional().default(""),
  hidden: z.boolean().optional().default(false), // item que o dono optou por não cobrar/mostrar
});

export const proposalSchema = z.object({
  client: z.string().max(200).optional().default(""),
  company: z.string().max(200).optional().default(""),
  clientEmail: z.string().max(200).optional().default(""),
  title: z.string().max(300).optional().default(""),
  scope: z.string().max(8000).optional().default(""),
  items: z.array(itemSchema).max(20).optional().default([]),   // teto de 20 itens no servidor
  start: z.string().max(100).optional().default(""),
  end: z.string().max(100).optional().default(""),
  payment: z.string().max(500).optional().default(""),
  revisions: z.string().max(200).optional().default(""),
  validity: z.string().max(100).optional().default(""),
  bio: z.string().max(2000).optional().default(""),
  accent: z.string().max(20).optional().default("#D97757"),
  accent2: z.string().max(20).optional().default("#6C48B0"),
  gradient: z.boolean().optional().default(false),
  theme: z.enum(["claro", "creme", "escuro"]).optional().default("claro"),
  watermark: z.string().max(4).optional().default(""), // "" auto · "off" nenhuma · uma letra
  logo: z.string().max(900000).optional().default(""),   // data URL comprimida (logo)
  cover: z.string().max(900000).optional().default(""),  // data URL comprimida (capa)
  template: z.enum(["minimal", "bold", "editorial", "colorido", "capa", "dossie", "carta", "aurora", "studio", "recibo", "grande", "poster"]).optional().default("minimal"),
});

export const statusSchema = z.object({
  status: z.enum(["draft", "sent", "viewed", "accepted", "declined"]),
});
