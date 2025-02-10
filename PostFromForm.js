/**
 * Class for creating an Event Post the event form.
 */

const DOUBLE_SPACE = "\n" + "\n";
const LINK_TABLE_ERROR = "There's a problem with Links Table"
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

const PostTypes = {
  "publish": "מארגן אירוע ורוצה לפרסם",
  "share": "נתקלתי באירוע ואני רוצה לשתף",
  "cancel": "מארגן אירוע ומבקש להוריד פרסום",
  "update": "מארגן אירוע ורוצה לעדכן",
  "contact": "עוקב אחרי הערוץ ומבקש ליצור קשר"
}

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Post = require('./PostFromForm.js');
  Config = require('./config.js');
}

class Post {
  constructor() {
    if (Post.instance) return Post.instance;

    Post.instance = this;
    this.config = new Config();

    const EVENT_TABLE = "Sheet1";
    this.enmEventsSheet = SpreadsheetApp.openByUrl(this.config.ENM_SHEET_URL).getSheetByName(EVENT_TABLE);
    this.eventsData = this.enmEventsSheet.getDataRange().getValues();

    const RECORDS_TABLE = "טבלת אירועים";
    this.recordsSpreadsheet = SpreadsheetApp.openByUrl(this.config.INNER_DB_SHEET_URL);
    this.recordsSheet = this.recordsSpreadsheet.getSheetByName(RECORDS_TABLE);
    this.recordsData = this.recordsSheet.getDataRange().getValues();

    this.today = this.setTodayDate();
    this.thu = new Date(this.today.getTime() + 1 * milInDay)
    this.saturday = new Date(this.thu.getTime() + 2 * milInDay);
    this.nextSat = new Date(this.saturday.getTime() + 7 * milInDay);

    this.ENMTableCols = this.config.ENMTableCols;
    this.RecordsTableCols = this.config.RecordsTableCols;

    return Post.instance;
  }

  dailySummary() {
    var eventsData = this.enmEventsSheet.getDataRange().getValues();
    var count = 0;
    var events = []

    var doneCol = this.getEnmTableCol(this.ENMTableCols.Done);
    var nameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);
    var typeCol = this.getEnmTableCol(this.ENMTableCols.PostType);

    // check only last 50 entries
    for (var i = eventsData.length - 1; i > (eventsData.length - 100); i--) {
      var event = eventsData[i];

      if (event[doneCol] != '') {
        continue;
      }
      count++;
      if (event[typeCol] == PostTypes.publish) {
        events.push(this.DateInddmmyyyy(event[dateCol]) + " - " + event[nameCol]);
      }
      else if (event[typeCol] == PostTypes.share) {
        events.push("שיתוף אירוע: " + event[nameCol]);
      }
      else
      events.push("אירוע מסוג: " + event[typeCol]);        
    }
    var res = "יש " + count + " אירועים ממתינים";
    if (count == 0) {
      return res + "!!!!!!\nכל הכבוד!!! 💪💪💪";
    }
    return res + ":\n" + events.join("\n");
  }

  createPost(ROW_NUM) {
    var row = this.eventsData[ROW_NUM];

    var postEvent = this.switchPostType(row);
    var eventDescription = this.getEventDescription(row);

    if (postEvent == "") {
      postEvent = "Error parsing an event. look at the table for more info"
    }

    return [postEvent, eventDescription];
  }

  getEnmTableCol(colName) {
    return this._colNumberByLabel(colName, this.eventsData) - 1;
  }

  getRecordsTableCol(colName) {
    return this._colNumberByLabel(colName, this.recordsData) - 1;
  }

  switchPostType(row) {
    var postTypeCol = this.getEnmTableCol(this.ENMTableCols.PostType);
    var cancleEventCol = this.getEnmTableCol(this.ENMTableCols.CancleEvent);

    var postType = row[postTypeCol]

    switch (postType) {
      case PostTypes.publish:
        return this.buildPost(row);
      case PostTypes.share:
        return this.shareEvent(row);
      case PostTypes.cancel:
        return postType + "\n" + row[cancleEventCol];
      case PostTypes.update:
        return this.fixPost(row);
      case PostTypes.contact:
        return this.contactRequest(row);
      default:
        return '';
    }
  }

  buildPost(row) {
    var temp = this.getEventAndLineNames(row)
    if (temp.indexOf("2VS2") + 1) {
      return this.build2VS2Post(row);
    }

    return this.parsePaidPost(row) + this.parseName_place_date(row) + DOUBLE_SPACE + this.parseRegistrationSection(row) + this.setReferanceOnly(row) + DOUBLE_SPACE + this.additionalsNotes(row) + this.parseTags(row);
  }

  fixPost(row) {
    var lineCol = this.getEnmTableCol(this.ENMTableCols.UpdateLine);
    var linkCol = this.getEnmTableCol(this.ENMTableCols.UpdateLink);
    var contactCol = this.getEnmTableCol(this.ENMTableCols.UpdateContact);
    var updatesCol = this.getEnmTableCol(this.ENMTableCols.Updates);

    var event = row[linkCol] != "" ? row[linkCol] : "by " + row[lineCol]
    return "fix Post: \n" + event + "\nContact: " + row[contactCol] + "\nNeeded Updates: " + row[updatesCol]
  }

  contactRequest(row) {
    var contWay = this.getEnmTableCol(this.ENMTableCols.ContactWays)
    var contSubj = this.getEnmTableCol(this.ENMTableCols.ContactSubject);

    return "Contact Request" + DOUBLE_SPACE + "דרך תקשורת: " + row[contWay] + DOUBLE_SPACE + "סיבה: " + row[contSubj];
  }

  shareEvent(row) {
    var postTypeCol = this.getEnmTableCol(this.ENMTableCols.PostType);
    var linkToEventCol = this.getEnmTableCol(this.ENMTableCols.LinkToEvent);
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);

    var postType = row[postTypeCol]

    return postType + "\n" + row[eventNameCol] + " - " + row[linkToEventCol];
  }

  parseChannelDiscount(row) {
    var isDiscountCol = this.getEnmTableCol(this.ENMTableCols.IsDiscount);
    var discountCol = this.getEnmTableCol(this.ENMTableCols.Discount);

    if (!(row[isDiscountCol] === "כן")) {
      return ""
    }

    var discountStr = "\n" + "💎 למגיעים דרך הערוץ: ";
    if (row[discountCol] < 1) {
      discountStr += row[discountCol] * 100 + "% הנחה"
    }
    else
      discountStr += row[discountCol]

    return discountStr
  }

  parseSystemApproved(row) {
    var postEventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var postLineNameCol = this.getEnmTableCol(this.ENMTableCols.LineName);

    var eventName = row[postEventNameCol];
    var lineName = row[postLineNameCol];

    var systemApproval = this.findSystemApproved(eventName, lineName);
    if (systemApproval != undefined) {
      return systemApproval;
    }

    return '';
  }

  findEventOrLineInLinks(eventName, lineName) {
    var linksSheet = this.recordsSpreadsheet.getSheetByName("לינקים");
    var linksData = linksSheet.getDataRange().getValues();

    eventName = eventName.toLowerCase().trim();
    lineName = lineName.toLowerCase().trim();

    var eventNameCol = this._colNumberByLabel(this.RecordsTableCols.EventName, linksData) - 1;
    var lineNameCol = this._colNumberByLabel(this.RecordsTableCols.LineName, linksData) - 1;

    if (isNaN(eventNameCol)) {
      // throw new Error("problem with Links Table");
      return LINK_TABLE_ERROR;
    }

    var events = [];
    for (var i = 0; i < linksData.length; i++) {
      var dEvent = linksData[i][eventNameCol].toLowerCase();
      var dLine = linksData[i][lineNameCol].toLowerCase();

      var lineCheck = false;
      if (lineName != '') {
        lineCheck = lineName == dLine;
      }

      if (eventName == dEvent || eventName == dLine || lineCheck) {
        events.push(linksData[i])
      }
    }

    return events;
  }

  findSystemApproved(eventName, lineName) {
    return this.findInLinksTable(eventName, lineName, this.RecordsTableCols.SystemApproved);
  }

  findLineLink(eventName, lineName) {
    return this.findInLinksTable(eventName, lineName, this.RecordsTableCols.RegistrationLink);
  }

  findInLinksTable(eventName, lineName, wantedColName) {
    var eventsSheet = SpreadsheetApp.openByUrl(this.config.INNER_DB_SHEET_URL).getSheetByName("לינקים");
    var linksData = eventsSheet.getRange("A1:F").getValues();
    
    var wantedCol = this._colNumberByLabel(wantedColName, linksData) - 1;

    var events = this.findEventOrLineInLinks(eventName, lineName);
    if (events == LINK_TABLE_ERROR) {
      return LINK_TABLE_ERROR;
    }

    if (events.length > 0) {
      for (var i = 0; i < events.length; i++) {
        if (events[i][wantedCol] != '')
          return events[i][wantedCol];
      }
    }
  }

  build2VS2Post(row) {
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date)
    var date = row[dateCol]
    var day = date.getDay();
    if (day != 2)
      return "2VS2 duplication"

    var temp = "האירועים הקרובים מבית 2VS2: \nאיפה: 2VS2 Swingers Club, פתח תקווה";
    var tuesday = '#ללאאיזוןמגדרי\n **י THE OPEN LINE**\nמתי: יום שלישי, ' + this.DateInddmmyyyy(date) + ",  בשעה 22:00";
    var thursday = '#באיזוןמגדרי\n **י UNLIMITED PARTY**\nמתי: יום חמישי, ' + this.DateInddmmyyyy(date.setDate(date.getDate() + 2)) + ', בשעה 23:00';
    var friday = '#באיזוןמגדרי\n**י PREMIUM PARTY FOR COUPLES**\nמתי: יום שישי, ' + this.DateInddmmyyyy(date.setDate(date.getDate() + 1)) + ', בשעה 23:00';
    var ending = 'לינק להרשמה \n http://tinyurl.com/2VS2Events\nמידע נוסף בתגובה הראשונה'
    var tags = '#מסיבתסווינגרס #מסיבהליברלית #במועדון #אירועציבורי #מיניותפומבית #ללאמגבלתגיל #עםעישוןבפנים #ללאמתחםעישון'

    return temp + DOUBLE_SPACE + tuesday + DOUBLE_SPACE + thursday + DOUBLE_SPACE + friday + DOUBLE_SPACE + ending + DOUBLE_SPACE + tags;
  }

  // #region Tags
  parseTags(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType);

    var tags = '';
    if (row[eventTypeCol] != '') {
      tags = this.createTagsForNewEvent(row);
    }
    else {
      tags = this.getTagsFromPastEvent(row);
    }

    if (!this.isTicketsAvailable(row)) {
      tags = "#SaveTheDate" + "\n" + tags;
    }

    if (tags != '') {
      tags = tags.replace(/[,]/g, " ");
    }

    return tags;
  }

  createTagsForNewEvent(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType)

    var tagsArr = []
    for (var i = 0; i < 10; i++) {
      tagsArr.push(row[eventTypeCol + i]);
    }

    return tagsArr.join(" ");
  }

  getTagsFromPastEvent(row) {
    var regularLinesCol = this.getEnmTableCol(this.ENMTableCols.RegularLines);
    var linkOrTextCol = this.getEnmTableCol(this.ENMTableCols.LinkOrText);
    var postLinkCol = this.getEnmTableCol(this.ENMTableCols.PostLink);
    var postTextCol = this.getEnmTableCol(this.ENMTableCols.PostText);
    var mojoCol = this.getEnmTableCol(this.ENMTableCols.Mojo);
    var wildGingerCol = this.getEnmTableCol(this.ENMTableCols.WildGinger);
    var northenCircleCol = this.getEnmTableCol(this.ENMTableCols.NorthenCircle);

    var regularLines = row[regularLinesCol];
    var tags = '';
    switch (regularLines) {
      case "אני לא אחד מהליינים הבאים":
        if (row[linkOrTextCol] == "לינק לפוסט") {
          var postLink = row[postLinkCol];
          return this.getTagsByPostLink(postLink);
        }
        else {
          tags = row[postTextCol]
        }
        break;
      case "Wild Ginger":
        tags = row[wildGingerCol]
        break;
      case "MOJO":
        tags = row[mojoCol]
        break;
      case "החוג הצפוני":
        tags = row[northenCircleCol]
        break;
      default:
        if (regularLines.match('t.me/ENMeventsisrael') != undefined) {
          return this.getTagsByPostLink(regularLines);
        }
        tags = regularLines;
    }

    if (tags != '')
      tags = this.processTags(tags);

    return tags;
  }

  getTagsByPostLink(postLink) {
    var postLinkCol = this.getRecordsTableCol(this.RecordsTableCols.PostLink);
    var tagsCol = this.getRecordsTableCol(this.RecordsTableCols.Tags);

    var ev = this.recordsData.find(event => event[postLinkCol] == postLink);
    return ev[tagsCol];
  }

  processTags(text) {
    var temp = text.match(/(#\S+)/g);
    if (temp != undefined && temp != null)
      return temp.join(" ");
    else
      return undefined;
  }
  // #endregion Tags

  setReferanceOnly(row) {
    var lineNameCol = this.getEnmTableCol(this.ENMTableCols.LineName);

    if (row[lineNameCol] == "דקדנס" || row[lineNameCol] == "Sin Ethics") {
      return "\n" + "שימו לב - ההגעה לאירוע היא ע''י ממליצים בלבד. אדם שיענה שהגיע דרך הערוץ לא יאושר.";
    }
    return '';
  }

  isTicketsAvailable(row) {
    var isTicketsAvailableCol = this.getEnmTableCol(this.ENMTableCols.IsTicketsAvailable);

    if (row[isTicketsAvailableCol] == "#SaveTheDate")
      return false;
    return true;

  }

  parseRegistrationSection(row) {
    var link = this.parseRegistration(row)
    var channelDiscount = this.parseChannelDiscount(row)
    return link + channelDiscount;
  }

  parseRegistration(row) {
    var link = this.parseRegistrationLink(row) + '\n'
    var temp = this.getEventDescription(row);
    if (temp) {
      link += "לינק להרשמה \nפרטים נוספים בתגובה הראשונה"
    }
    else {
      link += "לינק להרשמה ופרטים נוספים"
    }

    return link;

  }

  parseRegistrationLink(row) {
    var regLinkCol = this.getEnmTableCol(this.ENMTableCols.RegistrationLink);
    var moreInfoCol = this.getEnmTableCol(this.ENMTableCols.MoreInfo);
    var link = 'Original: \n';

    if (this.isTicketsAvailable(row)) {
      link += row[regLinkCol];
    }
    else {
      link += row[moreInfoCol];
    }

    var tiny = this.findLineLink(...this.getEventAndLineNames(row))
    if (tiny != undefined) {
      link += "\nTiny: \n" + tiny;
    }

    return link;
  }

  additionalsNotes(row) {
    var additionalsNotesCol = this.getEnmTableCol(this.ENMTableCols.AdditionalsNotes);

    var notes = row[additionalsNotesCol];
    if (notes != '')
      notes = "**Additionals Notes:** \n" + notes + "\n"
    return notes;
  }

  getEventDescription(row) {
    var eventDescriptionCol = this.getEnmTableCol(this.ENMTableCols.EventDescription);

    var eventDescription = row[eventDescriptionCol];
    if (eventDescription != '') {
      return eventDescription
    }
  }

  parsePaidPost(row) {
    var paidPostCol = this.getEnmTableCol(this.ENMTableCols.PaidPost);
    var paidDetailsCol = this.getEnmTableCol(this.ENMTableCols.PaidDetails);

    if (row[paidPostCol] == "כן")
      return "‼️🤑 עבור: " + row[paidDetailsCol] + "\n"
    else
      return ''
  }

  getEventAndLineNames(row) {
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var lineNameCol = this.getEnmTableCol(this.ENMTableCols.LineName);

    return [row[eventNameCol], row[lineNameCol]];

  }

  parseName_place_date(row) {
    var locationCol = this.getEnmTableCol(this.ENMTableCols.Location);

    var name = this.parseNameRow(row);
    var date = this.parseDate(row);

    var name_place_date = name + "\n" + "מיקום: " + row[locationCol] + "\n" + date;
    return name_place_date;
  }

  parseNameRow(row) {
    var systemApproved = this.parseSystemApproved(row)
    var name = this.parseName(row);
    var line = this.parseLine(...this.getEventAndLineNames(row));
    return systemApproved + "**" + name + "**" + line;
  }

  parseName(row) {
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);

    var name = row[eventNameCol];

    var regExp = new RegExp("^[A-Za-z]", "gi");
    var firstChar = regExp.exec(name);

    if (firstChar != null) {
      name = 'י ' + name;
    }
    return name;

  }

  parseLine(eventName, lineName) {
    if (lineName == '')
      return '';

    var regExp = new RegExp(lineName, "gi");
    var lineMatch = regExp.exec(eventName)
    if (lineMatch != null)
      return '';

    return " מבית " + lineName;
  }

  // #region Date
  parseDate(row) {
    var isParmanentCol = this.getEnmTableCol(this.ENMTableCols.IsParmanent);
    var daysCol = this.getEnmTableCol(this.ENMTableCols.ParmanentDays);
    var dayCol = this.getEnmTableCol(this.ENMTableCols.Day);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);

    if (row[isParmanentCol] == "כן") {
      return "מתי: כל יום " + row[daysCol] + this.parseHour(row);
    }
    return "מתי: יום " + row[dayCol] + ", " + this.DateInddmmyyyy(row[dateCol]) + this.parseHour(row);

  }

  parseHour(row) {
    var hourCol = this.getEnmTableCol(this.ENMTableCols.Hour);

    if (row[hourCol] != '')
      return ", בשעה " + row[hourCol];
    else
      return '';

  }

  DateInddmmyyyy(i_date) {
    var curDate = new Date(i_date);
    return curDate.toLocaleDateString("en-GB");
  }
  // #endregion Date

  // #region Column Helpers
  ColNumberByLabel(label) {
    var sheet = SpreadsheetApp.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    return this._colNumberByLabel(label, data);
  }

  _colNumberByLabel(label, data) {
    var col = data[0].indexOf(label);
    if (col != -1) {
      return col + 1;
    }
  }

  ColNumberByLabelWSheetName(label, sheetName) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    return this._colNumberByLabel(label, data);
  }

  ColLetterByLabelWSheetName(label, sheetName) {
    var col = this.ColNumberByLabelWSheetName(label, sheetName)
    return this.columnToLetter(col);
  }

  ColLetterByLabel(label) {
    var col = this.ColNumberByLabel(label)
    return this.columnToLetter(col);
  }

  columnToLetter(column) {
    var temp, letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }
  // #endregion Column Helpers

  savePost() {
    const FORM_SHEET_NAME = "פירסור פוסט לטבלה";
    const DATA_RANGE = 'A4:A18';

    var formSheet = this.recordsSpreadsheet.getSheetByName(FORM_SHEET_NAME);

    var data = this.getData(formSheet, DATA_RANGE);

    var postLink = this.getPostLink(formSheet);
    if (!this.validatePostLink(postLink)) {
      Browser.msgBox("Fill the post link too!");
      return;
    }

    var location = this.extractLocation(data);
    var eventLink = this.extractEventLink(data, formSheet);
    if (!this.validateEventLink(eventLink)) {
      Browser.msgBox("Fill the registration link too!");
      return;
    }

    var [day, date, hour] = this.extractDayDateAndHour(data);
    var tags = this.extractTags(data);
    var [name, lineName] = this.extractEventAndLineName(data);
    var exstraData = this.extractExstraData(data);

    // לינק לפוסט, תגיות, שם אירוע, שם הליין, מיקום, יום, תאריך, שעה, לינק, מידע נוסף, מאושר ערוץ
    var postArray = [postLink, tags, name, lineName, location, day, date, hour, eventLink, exstraData]

    this.addToTable(postArray);
  }

  // #region submitEvent
  extractLocation(data) {
    var locationRow = this.findRowInPost("מיקום", data);
    if (locationRow !== -1) {
      return data[locationRow].replace("מיקום: ", "");
    }
    return "";
  }

  validateEventLink(eventLink) {
    if (eventLink == undefined) {
      return false
    }
    return true;
  }

  extractEventLink(data, formSheet) {
    var eventLink = formSheet.getRange('B2').getCell(1, 1).getValue();
    if (eventLink != "") {
      return eventLink;
    }

    var eventLinkRowNum = this.findRowInPost("://", data)
    if (eventLinkRowNum == -1) {
      return;
    }

    var eventLink = data[eventLinkRowNum]

    if (eventLink.includes("(")) {
      var temp = eventLink.split("(")
      eventLink = "";
      if (temp.length < 2) {
        temp = data[this.findRowInPost("(", data)].split("(")
        temp = temp[1].split(")")
        eventLink = temp[0];
      }
      else {
        eventLink = temp[1].replace(")", "")
      }
    }

    return eventLink;

  }

  extractDayDateAndHour(data) {
    var timeRaw = data[this.findRowInPost("מתי", data)]

    var temp = timeRaw.replace("מתי: ", "").split(",")
    var day = temp[0].replace("יום ", "")
    var date = temp[1].trim()
    var hour = ""
    if (temp.length > 2) {
      hour = temp[2].replace("בשעה ", "")
    }

    return [day, date, hour];
  }

  extractEventAndLineName(data) {
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

  extractTags(data) {
    var tagsRow = this.findRowInPost("#", data);
    var tags = data[tagsRow];
    if (tags.includes("SaveTheDate")) {
      tags += " " + data[tagsRow + 1];
    }

    return tags;
  }

  extractExstraData(data) {
    var eventLinkRowNum = this.findRowInPost("להרשמה", data)
    var exstraData = data[eventLinkRowNum + 1]
    if (exstraData.includes("פרטים")) {
      exstraData = data[eventLinkRowNum + 2]
    }

    return exstraData;
  }

  addToTable(postArray) {
    const FORM_SHEET_NAME = "פירסור פוסט לטבלה";
    const FORM_RANGE = 'A2:J2';
    const EVENT_TABLE = "טבלת אירועים";
    const DATA_RANGE = 'A4:A18';
    var formSheet = this.recordsSpreadsheet.getSheetByName(FORM_SHEET_NAME);
    var recordsSheet = this.recordsSpreadsheet.getSheetByName(EVENT_TABLE);

    recordsSheet.appendRow(postArray);
    formSheet.getRange(DATA_RANGE).clearContent();
    formSheet.getRange(FORM_RANGE).clearContent();
  }

  getData(sheet, range) {
    return sheet.getRange(range).getValues().flat();
  }

  getPostLink(sheet) {
    return sheet.getRange('A2').getCell(1, 1).getValue();
  }

  validatePostLink(postLink) {
    return postLink !== "";
  }
  // #endregion submitEvent

  findRowInPost(searchWord, post) {
    for (var i = 0; i < post.length; i++) {
      if (post[i].includes(searchWord)) {
        return i;
      }
    }

    return -1;
  }

  WEEKLY_SUMMERY() {
    var allEvents = this.parseAllEvents()

    const t = Utilities.formatDate(new Date(), 'GMT+2', 'dd/MM/yyyy HH:mm');

    var finalStr = this.config.WeeklySummary.HEADER + DOUBLE_SPACE + allEvents +
      DOUBLE_SPACE + this.config.WeeklySummary.FOOTER + this.hotlineFooter();
    finalStr = "Updated at: " + t + "\n" + finalStr
    console.log(finalStr)
    return finalStr;
  }

  saveSummery() {
    const WEEKLY_SUMMERY_TABLE = "סיכום שבועי"
    var summery = this.WEEKLY_SUMMERY();
    var wsSheet = this.recordsSpreadsheet.getSheetByName(WEEKLY_SUMMERY_TABLE);

    var cell = wsSheet.getRange(2, 1);
    cell.setValue(summery);

  }

  hotlineFooter() {
    var hotline = ''
    if (this.today.getDate() < 8) {
      hotline = DOUBLE_SPACE + `אנו מאחלים שאף אחד לא יצטרך זאת, אך לעת צורך: 
   קו סיוע במקרי פגיעה מינית - https://yahasim.org.il/line`;
    }
    return hotline;
  }

  // #region Parse Events
  parseAllEvents() {
    var eventGroups = this.parseAllIntoEventGroups();
    var groupsStr = eventGroups.map(group => this.concatenateKeysAndEvents(this.allKeys(group), group));

    var titlesStr = this.createTitles();

    var finalStr = '';
    for (var i = 0; i < groupsStr.length; i++) {
      finalStr += titlesStr[i] + groupsStr[i] + DOUBLE_SPACE
    }

    return finalStr;
  }

  parseAllIntoEventGroups() {
    var dateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    var dayCol = this.getRecordsTableCol(this.RecordsTableCols.Day);
    var prepCol = this.getRecordsTableCol(this.RecordsTableCols.WeeklySummaryPrep);

    var events = {}, thisWeekend = {}, nextWeek = {}, after = {}, permEvents = {};

    this.recordsData.forEach((value) => {
      var curDate = new Date(value[dateCol]);
      if (value[dateCol] === "אירוע קבוע") {
        var day = value[dayCol];
        this.fillEventsDict(permEvents, day, value[prepCol]);
      }
      else {
        if (!this.isValidDate(curDate))
          return;

        if (!this.isFutureEvent(curDate))
          return;

        events = this.setEventGroup(curDate, thisWeekend, nextWeek, after)

        var curDateStr = curDate.toLocaleDateString("en-GB");
        this.fillEventsDict(events, curDateStr, value[prepCol]);
      }
    })

    return [thisWeekend, nextWeek, after, permEvents];
  }

  allKeys(events) {
    var datesKeys = Object.keys(events);
    if (!datesKeys[0].includes("/")) {
      return Object.keys(weekDays);
    }

    datesKeys.sort((a, b) => {
      // '01/03/2014'.split('/')
      // gives ["01", "03", "2024"]
      a = a.split('/');
      b = b.split('/');
      return a[1] - b[1] || a[0] - b[0];
    });
    return datesKeys;
  }

  setTodayDate() {
    const WEEKLY_SUMMERY_TABLE = "סיכום שבועי"
    var wsSheet = this.recordsSpreadsheet.getSheetByName(WEEKLY_SUMMERY_TABLE);

    var thuToggle = wsSheet.getRange(1, 2).getCell(1, 1).getValue();
    var today = new Date();
    if (!thuToggle) {
      return today;
    }
    return new Date(today.getTime() - 1 * milInDay)
  }

  setEventGroup(curDate, thisWeekend, nextWeek, after) {
    if (curDate < this.saturday) {
      return thisWeekend;
    }
    else {
      if (curDate < this.nextSat) {
        return nextWeek;
      }
      else
        return after;
    }
  }
  // #endregion Events By Date

  // #region summery helper functions
  fillEventsDict(dict, key, data) {
    if (dict[key] == undefined) {
      dict[key] = new Array();
    }
    if (data != '')
      dict[key].push(data);
  }

  keysByDate(events) {
    var datesKeys = Object.keys(events);
    datesKeys.sort((a, b) => {
      // '01/03/2014'.split('/')
      // gives ["01", "03", "2024"]
      a = a.split('/');
      b = b.split('/');
      return a[1] - b[1] || a[0] - b[0];
    });
    return datesKeys;
  }

  keysByWeekday() {
    return Object.keys(weekDays);
  }

  concatenateKeysAndEvents(keys, events) {
    var eventsStr = '';
    keys.forEach((value, index) => {
      if (events[value] != undefined) {
        eventsStr += this.dateAndDay(value) + "\n";
        eventsStr += events[value].join("\n");
        eventsStr += "\n";
      }
    })

    return eventsStr;
  }

  dateAndDay(value) {
    if (value in weekDays) {
      return value;
    }
    else {
      var days = this.keysByWeekday();
      var date = Utilities.parseDate(value, "GMT", "dd/MM/yyyy");

      var day = date.getDay();
      return value + ", יום " + days[day];
    }
  }
  // #endregion summery helper functions

  // #region Validations
  isValidDate(curDate) {
    if (curDate == "Invalid Date")
      return false;

    return true;
  }

  isFutureEvent(curDate) {
    return (curDate > this.today);
  }
  // #endregion Validations

  // #region Titles
  createTitles() {
    var thisWeekend = this.createTitle("סופש הקרוב", this.thu, this.saturday);

    var sunday = new Date(this.saturday.getTime() + 1 * milInDay)
    var nextWeek = this.createTitle("השבוע הקרוב", sunday, this.nextSat)

    var after = this.createTitle("אירועים הבאים");

    var permEvents = this.createTitle("אירועים קבועים");

    return [thisWeekend, nextWeek, after, permEvents];
  }

  createTitle(text, startDate = null, endDate = null) {
    return "** --- " + text + (startDate != null ? this.titleDates(startDate, endDate) : '') + " --- **" + DOUBLE_SPACE;
  }

  titleDates(startDate, endDate) {
    return " (" + startDate.getDate() + (startDate.getMonth() == endDate.getMonth() ? '' : "/" + (startDate.getMonth() + 1)) + "-" + endDate.toLocaleDateString("en-GB") + ")"
  }
  // #endregion Titles
}
if (typeof module !== "undefined") module.exports = Post;

function initPost() {
  return new Post();
}