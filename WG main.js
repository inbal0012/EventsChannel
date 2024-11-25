// jshint esversion: 8
if (typeof require !== 'undefined') {
  UnitTestingApp = require('./UnitTestingApp.js');
  Post = require('./PostFromForm.js');
  Telegram = require('./Telegram.js');
}

function testSendWGTelegramMessageToAdmin() {
  const telegram = new Telegram();
  telegram.sendWGTelegramMessageToAdmin(buildMessenge("פוסט היכרות"));
}

function testSendWGTelegramMessageToGroup() {
  const telegram = new Telegram();
  const title = "חוקי הליין"
  try {
    telegram.sendWGTelegramMessageToGroup(buildMessenge(title));
  }
  catch (error) {
    sendSeparately(title, telegram);
    console.log(error.Exception)
    if (false) {

    }
  }
}

function sendSeparately(title, telegram) {
  telegram.sendWGTelegramMessageToGroup()
}

function testBuildMessenge() {
  console.log(buildMessenge("ברוכים הבאים"));
}
  
function buildMessenge(title) {
  var sentence = findSentence(title);

  if (sentence == undefined) {
    return;
  }

  var mgs = "English below\n"
  mgs += sentence[2];
  mgs += "\n\n----------ENGLISH----------\n\n";
  mgs += sentence[5]

  return mgs;
}

function findSentence(title) {    
  var SENTENCE_TABLE = "משפטים קבועים"
  var sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/19MhdGPCuME_snaDiNA7ahpdLDted9KpqRCFFDM06vKI/edit?gid=1376722099#gid=1376722099").getSheetByName(SENTENCE_TABLE);
  var data = sheet.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][1] == title) {
      return data[i];
    }
  }
}




function _colNumberByLabel(label, data) {
    var col = data[0].indexOf(label);
    if (col != -1) {
        return col;
    }
}



