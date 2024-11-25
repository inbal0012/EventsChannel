// jshint esversion: 8
if (typeof require !== 'undefined') {
  UnitTestingApp = require('./UnitTestingApp.js');
  Post = require('./PostFromForm.js');
  Telegram = require('./Telegram.js');
}

function myFunction() {
  const post = new Post();
  const telegram = new Telegram();
  
  const EVENT_TABLE = "Sheet1";
  const DATA_RANGE = 'A1:BW';
  
  var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
  var eventsData = eventsSheet.getDataRange().getValues();

  var doneCol = post._colNumberByLabel("Done?", eventsData) - 1;    // Sheet1!A
  var inbalPostCol = post._colNumberByLabel("פוסט ענבל", eventsData) - 1;
  
  // check only last 50 entries
  for (var i = eventsData.length-1; i > (eventsData.length-50); i--) {
    var event = eventsData[i];

    if (event[doneCol] != '') {
      continue;
    }
    if (event[inbalPostCol] != '') {
      continue;
    }

    var [result, moreDetails] = post.createPost(i);
    var cell = eventsSheet.getRange(i+1, inbalPostCol+1);
    cell.setValue(result);
    telegram.sendPost(result, moreDetails);

  }
}

function dailySummary() {
  const post = new Post();
  const telegram = new Telegram();
  
  telegram.sendPost(post.dailySummary());
}

function testFunction() {
  const post = new Post();
  const telegram = new Telegram();
  
  const EVENT_TABLE = "Sheet1";
  const DATA_RANGE = 'A1:BW';
  
  var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
  var eventsData = eventsSheet.getDataRange().getValues();

  var doneCol = post._colNumberByLabel("Done?", eventsData) - 1;    // Sheet1!A
  var inbalPostCol = post._colNumberByLabel("פוסט ענבל", eventsData) - 1;
  
  // check only last 50 entries
  for (var i = eventsData.length-1; i > (eventsData.length-50); i--) {
    var event = eventsData[i];

    if (event[doneCol] != '') {
      // continue;
    }
    if (event[inbalPostCol] != '') {
      // continue;
    }

    var [result, moreDetails] = post.createPost(i);    
    console.log("InbalBot \n" + result);
    // var cell = eventsSheet.getRange(i+1, inbalPostCol+1);
    // cell.setValue(result);
    // telegram.sendPost(result, moreDetails);

  }
}

function weeklySchduleReminder() {
  const telegram = new Telegram();
    telegram.sendTelegramMessageToAdmin("Girls (and Guy)\nHere's a reminder to verify the team's weekly");

}

function chatRulesMessage() {
  const telegram = new Telegram();
    telegram.sendTelegramMessageToGroup(`
    לכל החדשים -
    ברוכים הבאים לקבוצת הצ'אט של ערוץ האירועים
    אנא קראו את חוקי הקבוצה בעיון
    
    קישור לערוץ:  
    https://t.me/ENMeventsisrael
    
    קישור לחוקים: 
    https://t.me/ENMeventsisraelchat/1829
    
    שימו לב!
    אם פנו אליכם ללא אישור, או שיש לכם צורך אחר ליצירת קשר עם הצוות ניתן לפנות בטופס שלנו:
    https://enmeventsil.fillout.com/submitevent`);

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

function loop(callback) {
  const post = new Post();
  const telegram = new Telegram();
  
  const EVENT_TABLE = "Sheet1";
  const DATA_RANGE = 'A1:BW';
  
  var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
  var eventsData = eventsSheet.getDataRange().getValues();

  var doneCol = post._colNumberByLabel("Done?", eventsData) - 1;    // Sheet1!A
  var inbalPostCol = post._colNumberByLabel("פוסט ענבל", eventsData) - 1;
  
  for (var i = 450; i< eventsData.length; i++) {
    var event = eventsData[i];

    if (event[doneCol] != '') {
      // continue;
    }
    if (event[inbalPostCol] != '') {
      // continue;
    }

    var [result, eventDescription] = post.createPost(i);
    
    callback(result, eventDescription);
  }

}