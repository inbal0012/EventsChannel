/**
 * Class for common functionalities.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Config = require('./config.js');
}

class Common {
  constructor() {
    if (Common.instance) return Common.instance;

    Common.instance = this;
    this.config = new Config();

    this.enmEventsSheet = SpreadsheetApp.openByUrl(this.config.ENM.SHEET_URL).getSheetByName(this.config.ENM.EVENT_TABLE);
    this.eventsData = this.enmEventsSheet.getDataRange().getValues();

    this.recordsSpreadsheet = SpreadsheetApp.openByUrl(this.config.INNER_DB.SHEET_URL);
    this.recordsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.RECORDS_TABLE);
    this.recordsData = this.recordsSheet.getDataRange().getValues();

    this.ENMTableCols = this.config.ENMTableCols;
    this.RecordsTableCols = this.config.RecordsTableCols;

    this.text = this.config.Text.heb;
    this.errors = this.config.Text.errors;

    return Common.instance;
  }

  // #region Get from Table
  getEnmTableCol(colName) {
    return this._colNumberByLabel(colName, this.eventsData);
  }

  getRecordsTableCol(colName) {
    return this._colNumberByLabel(colName, this.recordsData);
  }

  _colNumberByLabel(label, data) {
    var col = data[0].indexOf(label);
    if (col != -1) {
      return col;
    }
  }
  // #endregion Get from Table

  searchLinesInEventName(eventName) {
    const linksSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.LINKS_TABLE);
    const linksData = linksSheet.getDataRange().getValues();
    const lineNameCol = this._colNumberByLabel(this.RecordsTableCols.LineName, linksData);

    for (let i = 1; i < linksData.length; i++) {
      const lineName = linksData[i][lineNameCol];
      if (lineName !== EMPTY_STRING && this.lineExistsInEventName(eventName, lineName)) {
        return lineName;
      }
    }
    return EMPTY_STRING;
  }

  lineExistsInEventName(eventName, lineName) {
    const regExp = new RegExp(lineName, "gi");
    return regExp.test(eventName);
  }

  keysByWeekday() {
    return Object.keys(this.text.weekDays);
  }

  dateAndDay(value, isRevertOrder = false) {
    if (value in this.text.weekDays) {
      return value;
    }

    var days = this.keysByWeekday();
    if (typeof value === "string") {
      var date = Utilities.parseDate(value, "GMT", "dd/MM/yyyy");
    }
    else {
      var date = value;
      value = this.DateInddmmyyyy(value);
    }

    var day = date.getDay();
    if (isRevertOrder) return this.text.Day + days[day] + this.text.coma + value;
    return value + this.text.coma + this.text.Day + days[day];
  }

  isEventExistsInRecordsByNameAndDate(eventName, eventDate) {
    const eventNameCol = this.getRecordsTableCol(this.RecordsTableCols.EventName);
    const eventDateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    eventDate = this.DateInddmmyyyy(eventDate);

    return this.recordsData.some(row => row[eventNameCol].trim() === this.addPrefixIfNeeded(eventName) && this.DateInddmmyyyy(row[eventDateCol]) === eventDate);
  }

  DateInddmmyyyy(i_date) {
    if (typeof i_date === "string") {
      i_date = Utilities.parseDate(i_date, "GMT", "dd/MM/yyyy");
    }
    var curDate = new Date(i_date);
    return curDate.toLocaleDateString(this.text.localesDateString);
  }

  addPrefixIfNeeded(name) {
    var regExp = new RegExp("^[A-Za-z]", "gi");
    var firstChar = regExp.exec(name);

    name = name.trim();

    if (firstChar != null) {
      name = 'י ' + name;
    }
    return name;
  }

  parseLine(eventName, lineName) {
    if (lineName == EMPTY_STRING)
      return EMPTY_STRING;

    var regExp = new RegExp(lineName, "gi");
    var lineMatch = regExp.exec(eventName)
    if (lineMatch != null)
      return EMPTY_STRING;

    return SPACE_STRING + this.text.By + lineName;
  }
}
if (typeof module !== "undefined") module.exports = Common;

function initCommon() {
  return new Common();
}