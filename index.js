import "dotenv/config";
import ws from "ws"; // الخطوة 1: استيراد المكتبة
import { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { createClient } from "@supabase/supabase-js";

// الخطوة 2: تعريف المكتبة عالمياً عشان Supabase يشوفها
global.WebSocket = ws; 

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!DISCORD_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// الخطوة 3: تمرير المكتبة لعميل Supabase (إجراء احترازي إضافي)
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.GuildMember, Partials.Message],
});

// باقي الكود حقك يكمل هنا طبيعي...
// (helpers, ready, guild sync, welcome, auto responder, slash commands, interaction create)
// انسخ باقي الكود اللي أرسلته أنت من بعد سطر "const client = ..." وحطه هنا

client.login(DISCORD_BOT_TOKEN);
