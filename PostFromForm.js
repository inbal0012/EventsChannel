/**
 * Class for creating an Event Post the event form.
 */

const DOUBLE_SPACE = "\n" + "\n";
const LINK_TABLE_ERROR = "There's a problem with Links Table"

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
      if (event[typeCol] == PostTypes.share) {
        events.push("שיתוף אירוע: " + event[typeCol]);
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

    var eventNameCol = this.getRecordsTableCol(this.RecordsTableCols.EventName)
    var lineNameCol = this.getRecordsTableCol(this.RecordsTableCols.LineName)

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
    var wantedCol = this.getRecordsTableCol(wantedColName)

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
      tags = this.extractTags(tags);

    return tags;
  }

  getTagsByPostLink(postLink) {
    var postLinkCol = this.getRecordsTableCol(this.RecordsTableCols.PostLink);
    var tagsCol = this.getRecordsTableCol(this.RecordsTableCols.Tags);

    var ev = this.recordsData.find(event => event[postLinkCol] == postLink);
    return ev[tagsCol];
  }

  extractTags(text) {
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
}
if (typeof module !== "undefined") module.exports = Post;

function initPost() {
  return new Post();
}