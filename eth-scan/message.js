const { EmbedBuilder, WebhookClient } = require('discord.js');
const webhookId = "1227910695769870446";
const webhookToken = "HZIb6qMoD8V3Fu8RMCsMwLp8MnGouLuVveDKA2eA1tNPUMWU-itneoAayVXFcC3EVlwK";
const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

const send = (title, message) => {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x52c41a);

    webhookClient.send({
        content: message,
        username: 'doge-scan-bot',
        avatarURL: 'https://i.imgur.com/AfFp7pu.png',
        embeds: [embed],
    });
}

module.exports = send;
