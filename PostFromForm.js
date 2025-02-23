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

}
if (typeof module !== "undefined") module.exports = Post;

function initPost() {
  return new Post();
}