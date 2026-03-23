interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp: string;
  footer: { text: string; icon_url?: string };
  thumbnail?: { url: string };
}

export async function sendDiscordNotification(
  webhookUrl: string,
  options: {
    monitorName: string;
    url: string;
    status: 'up' | 'down';
    responseTime?: number;
    statusCode?: number;
    message?: string;
    duration?: string;
  }
) {
  if (!webhookUrl) return;

  const isUp = options.status === 'up';
  const color = isUp ? 0x028D86 : 0xE11D48;
  const statusIcon = isUp ? '🟢' : '🔴';
  const statusText = isUp ? 'UP' : 'DOWN';

  const embed: DiscordEmbed = {
    title: `${statusIcon} Monitor ${statusText}: ${options.monitorName}`,
    description: isUp
      ? `**${options.monitorName}** is back online and responding normally.`
      : `**${options.monitorName}** is not responding. Immediate attention may be required.`,
    color,
    fields: [
      { name: '🌐 URL', value: `\`${options.url}\``, inline: false },
      { name: '📊 Status', value: `\`${statusText}\``, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Madex Status Monitor',
    },
  };

  if (options.responseTime !== undefined && isUp) {
    embed.fields!.push({ name: '⚡ Response Time', value: `\`${options.responseTime}ms\``, inline: true });
  }

  if (options.statusCode) {
    embed.fields!.push({ name: '📋 Status Code', value: `\`${options.statusCode}\``, inline: true });
  }

  if (options.duration) {
    embed.fields!.push({ name: '⏱️ Duration', value: `\`${options.duration}\``, inline: true });
  }

  if (options.message) {
    embed.fields!.push({ name: '💬 Details', value: options.message, inline: false });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Madex Status',
        embeds: [embed],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Discord] Webhook failed: ${response.status} ${response.statusText} — ${body}`);
    } else {
      console.log(`[Discord] Notification sent successfully for ${options.monitorName}`);
    }
  } catch (error) {
    console.error('[Discord] Notification failed:', error);
  }
}

export async function sendIncidentNotification(
  webhookUrl: string,
  options: {
    title: string;
    description: string;
    systemName: string;
    impact: string;
    status: 'active' | 'resolved' | 'monitoring';
  }
) {
  if (!webhookUrl) return;

  const isResolved = options.status === 'resolved';
  const color = isResolved ? 0x028D86 : options.impact === 'major' ? 0xE11D48 : options.impact === 'partial' ? 0xF97316 : 0xEAB308;
  const icon = isResolved ? '✅' : '⚠️';

  const embed: DiscordEmbed = {
    title: `${icon} ${isResolved ? 'Incident Resolved' : 'New Incident'}: ${options.title}`,
    description: options.description,
    color,
    fields: [
      { name: '🔧 System', value: options.systemName, inline: true },
      { name: '💥 Impact', value: options.impact.charAt(0).toUpperCase() + options.impact.slice(1), inline: true },
      { name: '📌 Status', value: options.status.charAt(0).toUpperCase() + options.status.slice(1), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Madex Status Monitor',
    },
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Madex Status',
        embeds: [embed],
      }),
    });
  } catch (error) {
    console.error('Discord incident notification failed:', error);
  }
}

export async function testWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const embed: DiscordEmbed = {
      title: '🧪 Webhook Test Successful',
      description: 'This is a test notification from **Madex Status Monitor**. Your webhook is configured correctly!',
      color: 0x028D86,
      fields: [
        { name: '✅ Status', value: 'Connected', inline: true },
        { name: '🕐 Tested At', value: new Date().toLocaleString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Madex Status Monitor — Test Notification',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Madex Status',
        embeds: [embed],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
