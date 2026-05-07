import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { createClient } from "@supabase/supabase-js";

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DISCORD_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

// ---------- helpers ----------
async function getModule(guildId, name) {
  const { data } = await db.from("module_configs").select("*").eq("guild_id", guildId).eq("module", name).maybeSingle();
  return data;
}
async function logMod(guildId, action, target, mod, reason) {
  await db.from("mod_logs").insert({
    guild_id: guildId, action, target_id: target.id, target_tag: target.tag ?? target.user?.tag,
    moderator_id: mod.id, moderator_tag: mod.user.tag, reason: reason || null,
  });
}
function fillVars(text, member) {
  return (text || "")
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{count}", String(member.guild.memberCount));
}

// ---------- ready & guild sync ----------
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  for (const [, guild] of c.guilds.cache) await syncGuild(guild);
  await registerCommands();
});

async function syncGuild(guild) {
  await db.from("guild_settings").upsert({
    guild_id: guild.id, guild_name: guild.name,
    guild_icon: guild.iconURL() || null, owner_discord_id: guild.ownerId,
  }, { onConflict: "guild_id" });
}
client.on(Events.GuildCreate, syncGuild);

// ---------- welcome / goodbye ----------
client.on(Events.GuildMemberAdd, async (member) => {
  const mod = await getModule(member.guild.id, "welcome");
  if (!mod?.enabled) return;
  const channel = member.guild.channels.cache.get(mod.config.channel_id);
  if (!channel?.isTextBased()) return;
  const message = fillVars(mod.config.message ?? `Welcome {user}!`, member);
  if (mod.config.embed) channel.send({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(message)] });
  else channel.send(message);
});
client.on(Events.GuildMemberRemove, async (member) => {
  const mod = await getModule(member.guild.id, "goodbye");
  if (!mod?.enabled) return;
  const channel = member.guild.channels.cache.get(mod.config.channel_id);
  if (channel?.isTextBased()) channel.send(fillVars(mod.config.message ?? `Goodbye {user}.`, member));
});

// ---------- auto responder ----------
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  const mod = await getModule(msg.guild.id, "autoresponder");
  if (!mod?.enabled) return;
  const triggers = mod.config.triggers || [];
  const lower = msg.content.toLowerCase();
  for (const t of triggers) {
    const trig = (t.trigger || "").toLowerCase();
    const match = t.match === "exact" ? lower === trig : lower.includes(trig);
    if (match) { msg.reply(t.response); break; }
  }
});

// ---------- slash commands ----------
async function registerCommands() {
  if (!DISCORD_CLIENT_ID) return console.warn("Set DISCORD_CLIENT_ID to register slash commands");
  const cmds = [
    new SlashCommandBuilder().setName("ping").setDescription("Pong!"),
    new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason")),
    new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason"))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason"))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName("clear").setDescription("Bulk delete messages")
      .addIntegerOption(o => o.setName("amount").setDescription("How many (1-100)").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder().setName("userinfo").setDescription("Show member info")
      .addUserOption(o => o.setName("user").setDescription("Member")),
    new SlashCommandBuilder().setName("serverinfo").setDescription("Show server stats"),
  ].map(c => c.toJSON());
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: cmds });
  console.log(`📡 Registered ${cmds.length} slash commands`);
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() || !i.guild) return;
  try {
    if (i.commandName === "ping") return i.reply(`🏓 ${client.ws.ping}ms`);

    if (i.commandName === "warn") {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason";
      await logMod(i.guild.id, "Warn", user, i.member, reason);
      return i.reply({ embeds: [new EmbedBuilder().setColor(0xEB459E).setTitle("⚠️ Warned").setDescription(`${user} — ${reason}`)] });
    }
    if (i.commandName === "kick") {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason";
      const m = await i.guild.members.fetch(user.id);
      await m.kick(reason);
      await logMod(i.guild.id, "Kick", user, i.member, reason);
      return i.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle("👢 Kicked").setDescription(`${user.tag} — ${reason}`)] });
    }
    if (i.commandName === "ban") {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason";
      await i.guild.bans.create(user.id, { reason });
      await logMod(i.guild.id, "Ban", user, i.member, reason);
      return i.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle("🔨 Banned").setDescription(`${user.tag} — ${reason}`)] });
    }
    if (i.commandName === "clear") {
      const amount = i.options.getInteger("amount", true);
      const ch = i.channel;
      if (!ch?.isTextBased()) return i.reply({ content: "Text channels only.", ephemeral: true });
      const deleted = await ch.bulkDelete(Math.min(Math.max(amount, 1), 100), true);
      return i.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
    }
    if (i.commandName === "userinfo") {
      const user = i.options.getUser("user") ?? i.user;
      const m = await i.guild.members.fetch(user.id);
      const e = new EmbedBuilder().setColor(0x5865F2).setTitle(user.tag).setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "ID", value: user.id, inline: true },
          { name: "Joined", value: `<t:${Math.floor((m.joinedTimestamp ?? 0)/1000)}:R>`, inline: true },
          { name: "Created", value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true },
        );
      return i.reply({ embeds: [e] });
    }
    if (i.commandName === "serverinfo") {
      const g = i.guild;
      const e = new EmbedBuilder().setColor(0xEB459E).setTitle(g.name).setThumbnail(g.iconURL() ?? "")
        .addFields(
          { name: "Members", value: `${g.memberCount}`, inline: true },
          { name: "Channels", value: `${g.channels.cache.size}`, inline: true },
          { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
          { name: "Boost lvl", value: `${g.premiumTier}`, inline: true },
        );
      return i.reply({ embeds: [e] });
    }
  } catch (err) {
    console.error(err);
    if (!i.replied) i.reply({ content: "❌ Command failed.", ephemeral: true });
  }
});

client.login(DISCORD_BOT_TOKEN);
