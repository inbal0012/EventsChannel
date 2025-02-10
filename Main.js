// jshint esversion: 8
if (typeof require !== 'undefined') {
  UnitTestingApp = require('./UnitTestingApp.js');
  Post = require('./PostFromForm.js');
  Telegram = require('./Telegram.js');
  Config = require('./config.js');
}

function saveSummery() {
  const post = new Post();
  return post.saveSummery();
}

function SUBMIT() {
  const post = new Post();
  return post.savePost();
}

function parseForm() {
  const post = new Post();
  const telegram = new Telegram();
  const config = new Config()

  var eventsSheet = SpreadsheetApp.openByUrl(config.ENM.SHEET_URL).getSheetByName(config.ENM.EVENT_TABLE);
  var eventsData = eventsSheet.getDataRange().getValues();

  var doneCol = post.getEnmTableCol(config.ENMTableCols.Done);
  var inbalPostCol = post.getEnmTableCol(config.ENMTableCols.InbalPost);;

  // check only last 50 entries
  for (var i = eventsData.length - 1; i > (eventsData.length - 50); i--) {
    var event = eventsData[i];

    if (event[doneCol] != '' || event[inbalPostCol] != '') {
      continue;
    }

    var [result, moreDetails] = post.createPost(i);
    var cell = eventsSheet.getRange(i + 1, inbalPostCol + 1);
    cell.setValue(result);
    telegram.sendPost(result, moreDetails);

  }
}

function dailySummary() {
  const post = new Post();
  const telegram = new Telegram();

  telegram.sendPost(post.dailySummary());
}

function weeklySchduleReminder() {
  const telegram = new Telegram();
  telegram.sendTelegramMessageToAdmin(telegram.config.Text.heb.WeeklySchduleReminder);

}

function chatRulesMessage() {
  const telegram = new Telegram();
  telegram.sendTelegramMessageToGroup(telegram.config.Text.heb.ChatRules);
}

function testSendTelegramMessageToAdmin() {
  const telegram = new Telegram();
  telegram.sendTelegramMessageToAdmin("Test");
}

function testSendWGTelegramMessageToAdmin() {
  const telegram = new Telegram();
  telegram.sendWGTelegramMessageToAdmin("היי לכולם! \n אני הבוט של Wild Ginger");
}

function logPost() {
  loop((result, eventDescription) => {
    console.log("InbalBot \n" + result);
    if (eventDescription != undefined) {
      console.log("Event Description:\n" + eventDescription);
    }
  })
}
