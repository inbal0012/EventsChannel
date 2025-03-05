// jshint esversion: 8
if (typeof require !== 'undefined') {
  CreatePost = require('./CreatePost.js');
  Summary = require('./Summary.js');
  Records = require('./Records.js');
  Telegram = require('./Telegram.js');
  Config = require('./config.js');
}

function testSummery() {
  const summary = new Summary();
  console.log(summary.buildSummaryMessage());
}

function saveSummery() {
  const summary = new Summary();
  return summary.saveSummery();
}

function SUBMIT() {
  const records = new Records();
  return records.savePost();
}

function sendWeeklySummary() {
  const telegram = new Telegram();
  const summary = new Summary();

  telegram.sendPost(summary.buildSummaryMessage());
}

function testInbal() {
  const telegram = new Telegram();
  telegram.sendTelegramMessageToInbal(telegram.config.Text.heb.WeeklySummary.FOOTER);

}

function testParse() {
  const telegram = new Telegram();
  const config = new Config()
  const post = new CreatePost();
  // post.setENM(config.ENM.NEW_SHEET_URL, config.ENM.EVENT_TABLE)

  var events = createPosts(post);
  events.forEach(([result, moreDetails]) =>
    telegram.testSendPost(result, moreDetails))
}

function parseForm() {
  const post = new CreatePost();
  const telegram = new Telegram();
  var events = createPosts(post);
  events.forEach(([result, moreDetails]) =>
    telegram.sendPost(result, moreDetails))
}

function createPosts(post) {
  const config = new Config()

  var eventsData = post.eventsData;

  var doneCol = post.getEnmTableCol(config.ENMTableCols.Done);
  var inbalPostCol = post.getEnmTableCol(config.ENMTableCols.InbalPost);

  var events = []

  var FIXUPS_LINE = 894
  if (eventsData.length > FIXUPS_LINE - 5) {
    events.push(["Inbal, FIXUPS_LINE is close!",]);
  }

  // check only last 50 entries
  for (var i = eventsData.length - 1; i > (eventsData.length - 50) && i >= 0; i--) {
    var event = eventsData[i];

    if (event[doneCol] != '' || event[inbalPostCol] != '') {
      continue;
    }

    var [result, moreDetails] = post.createPost(i);
    var cell = post.enmEventsSheet.getRange(i + 1, inbalPostCol + 1);
    cell.setValue(result);
    events.push([result, moreDetails]);
  }

  return events
}

function dailySummary() {
  const summary = new Summary();
  const telegram = new Telegram();

  telegram.sendPost(summary.dailySummary());
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
