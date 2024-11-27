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
      text: message
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

  sendPostTest() {
    const post = new Post();
    const EVENT_TABLE = "Sheet1";
    const DATA_RANGE = 'A1:BW';

    var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
    var eventsData = eventsSheet.getDataRange().getValues();

    var doneCol = post._colNumberByLabel("Done?", eventsData) - 1;    // Sheet1!A

    for (var i = 0; i < eventsData.length; i++) {
      if (eventsData[i][doneCol] == '') {
        // post.createPost(i);
      }
    }

    console.log("OMG");

    const ROW_NUM = 458 - 1;
    var row = eventsData[ROW_NUM];

    var systemApproved = post.createPost(ROW_NUM); // COL D
    // console.log(systemApproved);

    // Send a message to Telegram
    this.sendTelegramMessageToTemp(`Inbal Bot:\n ${systemApproved}`);
  }
}


if (typeof module !== "undefined") module.exports = Telegram;










