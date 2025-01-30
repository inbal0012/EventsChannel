const milInDay = 86400000;

const weekDays = {
  "ראשון": 0,
  "שני": 1,
  "שלישי": 2,
  "רביעי": 3,
  "חמישי": 4,
  "שישי": 5,
  "שבת": 6
}

function SUBMIT() {
  const FORM_SHEET_NAME = "פירסור פוסט לטבלה";
  const DATA_RANGE = 'A4:A18';

  var spreadsheet = getSpreadsheet();
  var formSheet = spreadsheet.getSheetByName(FORM_SHEET_NAME);

  var data = getData(formSheet, DATA_RANGE);

  var postLink = getPostLink(formSheet);
  if (!validatePostLink(postLink)) {
    Browser.msgBox("Fill the post link too!");
    return;
  }

  var location = extractLocation(data);
  var eventLink = extractEventLink(data, formSheet);
  if (!validateEventLink(eventLink)) {
    Browser.msgBox("Fill the registration link too!");
    return;
  }

  var [day, date, hour] = extractDayDateAndHour(data);
  var tags = extractTags(data);
  var [name, lineName] = extractEventAndLineName(data);
  var exstraData = extractExstraData(data);

  // לינק לפוסט, תגיות, שם אירוע, שם הליין, מיקום, יום, תאריך, שעה, לינק, מידע נוסף, מאושר ערוץ
  var postArray = [postLink, tags, name, lineName, location, day, date, hour, eventLink, exstraData]

  addToTable(postArray);
}

// #region submitEvent
function extractLocation(data) {
  var locationRow = findRowInPost("מיקום", data);
  if (locationRow !== -1) {
    return data[locationRow].replace("מיקום: ", "");
  }
  return "";
}
function validateEventLink(eventLink) {
    if (eventLink == undefined) {
      return false
    }
    return true;
}

function extractEventLink(data, formSheet) {
  var eventLink = formSheet.getRange('B2').getCell(1, 1).getValue();
  if (eventLink != "") {
    return eventLink;
  }

  var eventLinkRowNum = findRowInPost("://", data)
  if (eventLinkRowNum == -1) {
    return;
  }

  var eventLink = data[eventLinkRowNum]

  if (eventLink.includes("(")) {
    var temp = eventLink.split("(")
    eventLink = "";
    if (temp.length < 2) {
      temp = data[findRowInPost("(", data)].split("(")
      temp = temp[1].split(")")
      eventLink = temp[0];
    }
    else {
      eventLink = temp[1].replace(")", "")
    }
  }

  return eventLink;

}

function extractDayDateAndHour(data) {
  var timeRaw = data[findRowInPost("מתי", data)]

  temp = timeRaw.replace("מתי: ", "").split(",")
  var day = temp[0].replace("יום ", "")
  var date = temp[1].trim()
  var hour = ""
  if (temp.length > 2) {
    hour = temp[2].replace("בשעה ", "")
  }

  return [day, date, hour];
}

function extractEventAndLineName(data) {
  var nameRaw = data[0]

  var temp = nameRaw.split("מבית ")
  var name = temp[0], lineName = ""
  if (temp.length > 1) {
    var lineName = temp[1];
  }
  else {
    // TODO search line name in DB
  }

  return [name, lineName];
}

function extractTags(data) {
  var tagsRow = findRowInPost("#", data);
  var tags = data[tagsRow];
  if (tags.includes("SaveTheDate")) {
    tags += " " + data[tagsRow + 1];
  }

  return tags;
}

function extractExstraData(data) {
  var eventLinkRowNum = findRowInPost("להרשמה", data)
  var exstraData = data[eventLinkRowNum + 1]
  if (exstraData.includes("פרטים")) {
    exstraData = data[eventLinkRowNum + 2]
  }

  return exstraData;
}

function addToTable(postArray) {
  const FORM_SHEET_NAME = "פירסור פוסט לטבלה";
  const FORM_RANGE = 'A2:J2';
  const EVENT_TABLE = "טבלת אירועים";
  const DATA_RANGE = 'A4:A18';
  var spreadsheet = getSpreadsheet();
  var formSheet = spreadsheet.getSheetByName(FORM_SHEET_NAME);
  var recordSheet = spreadsheet.getSheetByName(EVENT_TABLE);
  
  recordSheet.appendRow(postArray);
  formSheet.getRange(DATA_RANGE).clearContent();
  formSheet.getRange(FORM_RANGE).clearContent();
}

function getSpreadsheet() {
  return SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0");
}

function getData(sheet, range) {
  return sheet.getRange(range).getValues().flat();
}

function getPostLink(sheet) {
  return sheet.getRange('A2').getCell(1, 1).getValue();
}

function validatePostLink(postLink) {
  return postLink !== "";
}
// #endregion submitEvent

function findRowInPost(searchWord, post) {
  for (var i = 0; i < post.length; i++) {
    if (post[i].includes(searchWord)) {
      return i;
    }
  }

  return -1;
}

const WEEKLY_HEADER = `** סיכום האירועים הקרובים בקהילה: ** 
▫ אירועים קבועים 
✅ מאושר ע''י צוות הערוץ. נבדק האם תואמים לתגיות 
💎 הנחה לעוקבי הערוץ`
const WEEKLY_FOOTER = `
* לפרסום אירועים בחינם ניתן להגיש בטופס שלנו כאן. 
https://enmeventsil.fillout.com/submitevent
** ניתן לחפש אירועים לפי תגית. ניתן למצוא את התגיות כאן. 
https://t.me/ENMeventsisrael/122 
*** הייתם באירוע? מדהים! ספרו לנו איך היה. 
https://enmevents.fillout.com/eventsfeedback
**** הפוסט אינו מתעדכן. מומלץ לגלול ולראות גם את האירועים החדשים שיפורסמו אחרי.`;
function WEEKLY_SUMMERY() {
  const EVENT_TABLE = "טבלת אירועים";
  const DATA_RANGE = 'A1:S';

  var eventsSheet = getSpreadsheet().getSheetByName(EVENT_TABLE);
  var eventsData = eventsSheet.getRange(DATA_RANGE).getValues();

  var eventsByDate = parseEventsByDate(eventsData);
  var permanentEvents = parsePermanentEvents(eventsData);

  const t = Utilities.formatDate(new Date(), 'GMT+2', 'dd/MM/yyyy HH:mm');

  var finalStr = WEEKLY_HEADER + DOUBLE_SPACE + eventsByDate + permanentEvents +
    DOUBLE_SPACE + WEEKLY_FOOTER + hotlineFooter();
  finalStr = "Updated at: " + t + "\n" + finalStr
  console.log(finalStr)
  return finalStr;
}

function saveSummery() {
  const WEEKLY_SUMMERY_TABLE = "סיכום שבועי"
  var summery = WEEKLY_SUMMERY();
  var wsSheet = getSpreadsheet().getSheetByName(WEEKLY_SUMMERY_TABLE);

  var cell = wsSheet.getRange(2, 1);
  cell.setValue(summery);

}

function hotlineFooter() {
  var today = new Date();
  today.setDate(today.getDate() - 1)
  var hotline = ''
  if (today.getDate() < 8) {
    hotline = DOUBLE_SPACE + `אנו מאחלים שאף אחד לא יצטרך זאת, אך לעת צורך: 
   קו סיוע במקרי פגיעה מינית - https://yahasim.org.il/line`;
  }
  return hotline;
}

function parsePermanentEvents(eventsData) {
  var dateCol = _colNumberByLabel("תאריך", eventsData);
  var dayCol = _colNumberByLabel("יום", eventsData);
  var prepCol = _colNumberByLabel("הכנה לסיכום שבועי", eventsData);
  var events = {};

  eventsData.forEach(function (value) {
    if (value[dateCol] != "אירוע קבוע")
      return;

    var day = value[dayCol];
    fillEventsDict(events, day, value[prepCol]);
  })

  // concatenate day name and events
  var daysKeys = keysByWeekday();
  var eventsStr = concatenateKeysAndEvents(daysKeys, events)
  var finalStr = createTitle("אירועים קבועים") + eventsStr;

  return finalStr;
}

// #region Events By Date
function parseEventsByDate(eventsData) {
  var eventGroups = parseIntoEventGroups(eventsData);
  var groupsStr = eventGroups.map(group => concatenateKeysAndEvents(keysByDate(group), group));

  var titlesStr = titles();

  var finalStr = '';
  for (var i = 0; i < groupsStr.length; i++) {
    finalStr += titlesStr[i] + groupsStr[i] + DOUBLE_SPACE
  }

  return finalStr;
}

function parseIntoEventGroups(eventsData) {
  var dateCol = _colNumberByLabel("תאריך", eventsData);
  var prepCol = _colNumberByLabel("הכנה לסיכום שבועי", eventsData);

  var events = {}, thisWeekend = {}, nextWeek = {}, after = {};

  eventsData.forEach(function (value) {
    var curDate = new Date(value[dateCol]);
    if (!isValidDate(curDate))
      return;

    if (!isFutureEvent(curDate))
      return;

    events = setEventGroup(curDate, thisWeekend, nextWeek, after)

    var curDateStr = curDate.toLocaleDateString("en-GB");
    fillEventsDict(events, curDateStr, value[prepCol]);
  })

  return [thisWeekend, nextWeek, after];
}

function setEventGroup(curDate, thisWeekend, nextWeek, after) {
  var today = new Date();
  today.setTime(today.getTime())
  var saturday = new Date(today.getTime() + 3*milInDay);
  var nextSat = new Date(saturday.getTime() + 7*milInDay);

  if (curDate < saturday) {
    return thisWeekend;
  }
  else {
    if (curDate < nextSat) {
      return nextWeek;
    }
    else
      return after;
  }
}
// #endregion Events By Date

// #region summery helper functions
function fillEventsDict(dict, key, data) {
  if (dict[key] == undefined) {
    dict[key] = new Array();
  }
  if (data != '')
    dict[key].push(data);
}

function keysByDate(events) {
  var datesKeys = Object.keys(events);
  datesKeys.sort(function (a, b) {
    // '01/03/2014'.split('/')
    // gives ["01", "03", "2024"]
    a = a.split('/');
    b = b.split('/');
    return a[1] - b[1] || a[0] - b[0];
  });
  return datesKeys;
}

function keysByWeekday() {
  return Object.keys(weekDays);
}

function concatenateKeysAndEvents(keys, events) {
  var eventsStr = '';
  keys.forEach(function (value, index) {
    if (events[value] != undefined) {
      eventsStr += dateAndDay(value) + "\n";
      eventsStr += events[value].join("\n");
      eventsStr += "\n";
    }
  })

  // console.log(eventsStr);
  return eventsStr;
}

function dateAndDay(value) {
  if (value in weekDays) {
    return value;
  }
  else {
    days = keysByWeekday();
    var date = Utilities.parseDate(value, "GMT", "dd/MM/yyyy");

    var day = date.getDay();
    return value + ", יום " + days[day];
  }
}
// #endregion summery helper functions

// #region Validations
function isValidDate(curDate) {
  if (curDate == "Invalid Date")
    return false;

  return true;
}

function isFutureEvent(curDate) {
  var today = new Date();
  today.setDate(today.getDate() - 1)
  return (curDate > today);
}
// #endregion Validations

// #region Titles
function titles() {
  var today = new Date();
  var thu = new Date(today.getTime() + 1*milInDay)
  var saturday = new Date(today.getTime() + 3*milInDay);
  var nextSat = new Date(saturday.getTime() + 7*milInDay);
  console.log(today.getTime())
  
  var today = new Date();
  today.setTime(today.getTime())


  var thisWeekend = createTitle("סופש הקרוב", thu, saturday);

  saturday.setDate(saturday.getDate() + 1);
  var nextWeek = createTitle("השבוע הקרוב", saturday, nextSat)

  var after = createTitle("אירועים הבאים")

  return [thisWeekend, nextWeek, after];
}

function createTitle(text, startDate = null, endDate = null) {
  return "** --- " + text + (startDate != null ? titleDates(startDate, endDate) : '') + " --- **" + DOUBLE_SPACE;


}

function titleDates(startDate, endDate) {
  return " (" + startDate.getDate() + (startDate.getMonth() == endDate.getMonth() ? '' : "/" + (startDate.getMonth() + 1)) + "-" + endDate.toLocaleDateString("en-GB") + ")"
}
// #endregion Titles

// #region Column Helpers
function ColNumberByLabelWSheetName(label, sheetName) {
  var sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  return _colNumberByLabel(label, data);
}

function _colNumberByLabel(label, data) {
  var col = data[0].indexOf(label);
  if (col != -1) {
    return col + 1;
  }
}

function ColLetterByLabelWSheetName(label, sheetName) {
  var col = ColNumberByLabelWSheetName(label, sheetName)
  return columnToLetter(col);
}

function columnToLetter(column) {
  var temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
// #endregion Column Helpers
