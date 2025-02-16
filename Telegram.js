// jshint esversion: 8
if (typeof require !== 'undefined') {
  Post = require('./PostFromForm.js');
  Config = require('./config.js');
}


class Telegram {
  constructor() {
    this.config = new Config();
  }
  
  sendTelegramMessage(message, chat_id) {
    const url = `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chat_id,
      text: message,
      parse_mode: 'Markdown'
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    UrlFetchApp.fetch(url, options);
  }

  sendTelegramMessageToTemp(message) {
    this.sendTelegramMessage(message, this.config.TELEGRAM_TEMP_CHAT_ID)
  }

  sendTelegramMessageToAdmin(message) {
    this.sendTelegramMessage(message, this.config.TELEGRAM_ADMINS_CHAT_ID)
  }

  sendTelegramMessageToGroup(message) {
    this.sendTelegramMessage(message, this.config.TELEGRAM_GROUP_CHAT_ID)
  }

  sendWGTelegramMessage(message, chat_id) {
    const url = `https://api.telegram.org/bot${this.config.TELEGRAM_WG_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chat_id,
      text: message
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    UrlFetchApp.fetch(url, options);
  }

  sendWGTelegramMessageToAdmin(message) {
    this.sendWGTelegramMessage(message, this.config.TELEGRAM_WG_ADMINS_CHAT_ID)
  }

  sendWGTelegramMessageToGroup(message) {
    this.sendWGTelegramMessage(message, this.config.TELEGRAM_WG_GROUP_CHAT_ID)
  }

  sendPost(post, eventDescription = undefined) {
    console.log(post);
    this.sendTelegramMessageToTemp(post);
    if (eventDescription != undefined) {
      console.log(eventDescription);
      this.sendTelegramMessageToTemp(eventDescription);
    }
  }
}


if (typeof module !== "undefined") module.exports = Telegram;










