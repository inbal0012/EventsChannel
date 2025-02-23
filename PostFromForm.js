/**
 * Class for creating an Event Post the event form.
 */

const DOUBLE_SPACE = "\n" + "\n";
const EMPTY_STRING = "";
const SPACE_STRING = " ";
const milInDay = 86400000;

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

    this.enmEventsSheet = SpreadsheetApp.openByUrl(this.config.ENM.SHEET_URL).getSheetByName(this.config.ENM.EVENT_TABLE);
    this.eventsData = this.enmEventsSheet.getDataRange().getValues();

    this.recordsSpreadsheet = SpreadsheetApp.openByUrl(this.config.INNER_DB.SHEET_URL);
    this.recordsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.RECORDS_TABLE);
    this.recordsData = this.recordsSheet.getDataRange().getValues();

    this.today = this.setTodayDate();
    this.thu = new Date(this.today.getTime() + 1 * milInDay)
    this.saturday = new Date(this.thu.getTime() + 2 * milInDay);
    this.nextSat = new Date(this.saturday.getTime() + 7 * milInDay);

    this.ENMTableCols = this.config.ENMTableCols;
    this.RecordsTableCols = this.config.RecordsTableCols;

    this.text = this.config.Text.heb;
    this.errors = this.config.Text.errors;

    return Post.instance;
  }

  dailySummary() {
    var eventsData = this.enmEventsSheet.getDataRange().getValues();
    var count = 0;
    var events = []

    var doneCol = this.getEnmTableCol(this.ENMTableCols.Done);
    var nameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);
    var typeCol;
    var iamCol = this.getEnmTableCol(this.ENMTableCols.Iam);
    var organizerCol = this.getEnmTableCol(this.ENMTableCols.Organizer);
    var nonOrganizer = this.getEnmTableCol(this.ENMTableCols.NonOrganizer);

    var PostTypes = this.config.PostTypes;

    // check only last 50 entries
    for (var i = eventsData.length - 1; i > (eventsData.length - 100); i--) {
      var event = eventsData[i];

      if (event[doneCol] != EMPTY_STRING) {
        continue;
      }
      count++;
      typeCol = event[iamCol] === this.text.Organizer ? organizerCol : nonOrganizer;
      if (event[typeCol] == PostTypes.publish) {
        events.push(this.DateInddmmyyyy(event[dateCol]) + this.text.spacedHyphen + event[nameCol]);
      }
      else if (event[typeCol] == PostTypes.share) {
        events.push(this.text.ShareEvent + event[nameCol]);
      }
      else
        events.push(this.text.EventFromType + event[typeCol]);
    }
    var res = this.text.Theres + count + this.text.WaitingEvents;
    if (count == 0) {
      return res + this.text.WellDone;
    }
    return res + ":" + this.text.breakline + events.join(this.text.breakline);
  }

  // #region Column Helpers
  ColNumberByLabel(label) {
    var sheet = SpreadsheetApp.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    return this._colNumberByLabel(label, data);
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
    var temp, letter = EMPTY_STRING;
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }
  // #endregion Column Helpers

  savePost() {
    var formSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.PARSE_POST.SHEET);
    var data = formSheet.getRange(this.config.INNER_DB.PARSE_POST.RANGE).getValues().flat();

    var postLink = this.getPostLink(formSheet);
    if (!this.validatePostLink(postLink)) {
      Browser.msgBox(this.errors.NoPostLink);
      return;
    }

    var location = this.extractLocation(data);
    var eventLink = this.extractEventLink(data, formSheet);
    if (!this.validateEventLink(eventLink)) {
      Browser.msgBox(this.errors.NoRegistrationLink);
      return;
    }

    var [day, date, hour] = this.extractDayDateAndHour(data);
    var tags = this.extractTags(data);
    var [name, lineName] = this.extractEventAndLineName(data);
    var exstraData = this.extractExstraData(data);
    var hide = EMPTY_STRING;

    if (this.isEventExistsInRecordsByNameAndDate(name, date)) {

      var response = Browser.msgBox(this.errors.EventDuplication.Title, name + this.errors.EventDuplication.Error + this.text.AddAnyway, Browser.Buttons.YES_NO);
      if (response == "yes") {
        hide = this.text.Yes
      } else {
        // this.cleanForm();
        return;
      }
    }

    // לינק לפוסט, תגיות, שם אירוע, שם הליין, מיקום, יום, תאריך, שעה, לינק, מידע נוסף, האם להסתיר מהסיכום
    var postArray = [postLink, tags, name, lineName, location, day, date, hour, eventLink, exstraData, hide]

    this.addToTable(postArray);
    this.cleanForm();
  }

  // #region Submit Event
  validateEventLink(eventLink) {
    if (eventLink == undefined) {
      return false
    }
    return true;
  }

  validatePostLink(postLink) {
    return postLink !== EMPTY_STRING && (postLink.includes(this.text.ChannelLink))
  }

  // #region Extract Data
  extractLocation(data) {
    var locationRow = this.findRowInPost(this.text.Location, data);
    if (locationRow !== -1) {
      return data[locationRow].replace(this.text.Location, EMPTY_STRING);
    }
    return EMPTY_STRING;
  }

  extractEventLink(data, formSheet) {
    var eventLink = formSheet.getRange(this.config.INNER_DB.PARSE_POST.REG_LINK_CELL).getCell(1, 1).getValue();
    if (eventLink != EMPTY_STRING) {
      return eventLink;
    }

    var eventLinkRowNum = this.findRowInPost("://", data)
    if (eventLinkRowNum == -1) {
      return;
    }

    var eventLink = data[eventLinkRowNum]

    if (eventLink.includes(this.text.openBracket)) {
      var temp = eventLink.split(this.text.openBracket)
      eventLink = EMPTY_STRING;
      if (temp.length < 2) {
        temp = data[this.findRowInPost(this.text.openBracket, data)].split(this.text.openBracket)
        temp = temp[1].split(this.text.closeBracket)
        eventLink = temp[0];
      }
      else {
        eventLink = temp[1].replace(this.text.closeBracket, EMPTY_STRING)
      }
    }

    return eventLink;

  }

  extractDayDateAndHour(data) {
    var timeRaw = data[this.findRowInPost(this.text.When, data)]

    var temp = timeRaw.replace(this.text.When, EMPTY_STRING).split(this.text.coma)
    var day = temp[0].replace(this.text.Day, EMPTY_STRING)
    var date = temp[1].trim()
    var hour = EMPTY_STRING
    if (temp.length > 2) {
      hour = temp[2].replace(this.text.Hour, EMPTY_STRING)
    }

    return [day, date, hour];
  }

  extractEventAndLineName(data) {
    var nameRaw = data[0]

    var temp = nameRaw.split(this.text.By)
    var name = temp[0].trim(), lineName = EMPTY_STRING
    var lineName;
    if (temp.length > 1) {
      lineName = temp[1];
    }
    else {
      lineName = this.searchLinesInEventName(name);
    }

    return [name, lineName];
  }

  extractTags(data) {
    var tagsRow = this.findRowInPost("#", data);
    var tags = data[tagsRow];
    if (tags.includes(this.text.SaveTheDateTag)) {
      tags += SPACE_STRING + data[tagsRow + 1];
    }

    return tags;
  }

  extractExstraData(data) {
    var eventLinkRowNum = this.findRowInPost(this.text.Register, data)
    var exstraData = data[eventLinkRowNum + 1]
    if (exstraData.includes(this.text.Details)) {
      exstraData = data[eventLinkRowNum + 2]
    }

    return exstraData;
  }
  // #endregion Extract Data

  addToTable(postArray) {
    this.recordsSheet.appendRow(postArray);
  }

  cleanForm() {
    var formSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.PARSE_POST.SHEET);

    formSheet.getRange(this.config.INNER_DB.PARSE_POST.RANGE).clearContent();
    formSheet.getRange(this.config.INNER_DB.PARSE_POST.LINKS_RANGE).clearContent();
  }

  getPostLink(sheet) {
    return sheet.getRange(this.config.INNER_DB.PARSE_POST.POST_LINK_CELL).getCell(1, 1).getValue();
  }

  findRowInPost(searchWord, post) {
    for (var i = 0; i < post.length; i++) {
      if (post[i].includes(searchWord)) {
        return i;
      }
    }

    return -1;
  }
  // #endregion Submit Event

}
if (typeof module !== "undefined") module.exports = Post;

function initPost() {
  return new Post();
}