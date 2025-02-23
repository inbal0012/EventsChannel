/**
 * Class for creating an Event Post the event form.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Config = require('./config.js');
}

class Summary {
  constructor() {
    if (Summary.instance) return Summary.instance;

    Summary.instance = this;
    this.config = new Config();

    this.recordsSpreadsheet = SpreadsheetApp.openByUrl(this.config.INNER_DB.SHEET_URL);
    this.recordsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.RECORDS_TABLE);
    this.recordsData = this.recordsSheet.getDataRange().getValues();

    this.today = this.setTodayDate();
    this.thu = new Date(this.today.getTime() + 1 * milInDay)
    this.saturday = new Date(this.thu.getTime() + 2 * milInDay);
    this.nextSat = new Date(this.saturday.getTime() + 7 * milInDay);

    this.RecordsTableCols = this.config.RecordsTableCols;

    this.text = this.config.Text.heb;
    this.errors = this.config.Text.errors;

    return Summary.instance;
  }

  // #region Get from Table
  getRecordsTableCol(colName) {
    return this._colNumberByLabel(colName, this.recordsData);
  }
  
  _colNumberByLabel(label, data) {
    var col = data[0].indexOf(label);
    if (col != -1) {
      return col;
    }
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

  keysByWeekday() {
    return Object.keys(this.text.weekDays);
  }
  // #endregion Get from Table

  WEEKLY_SUMMERY() {
    var allEvents = this.parseAllEvents()

    const t = Utilities.formatDate(new Date(), 'GMT+2', 'dd/MM/yyyy HH:mm');

    var finalStr = this.text.WeeklySummary.HEADER + DOUBLE_SPACE + allEvents +
      this.text.WeeklySummary.FOOTER + this.hotlineFooter();
    finalStr = this.text.UpdatedAt + t + this.text.breakline + finalStr
    console.log(finalStr)
    return finalStr;
  }

  saveSummery() {
    var summery = this.WEEKLY_SUMMERY();
    var wsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.WEEKLY_SUMMERY_TABLE);

    var cell = wsSheet.getRange(2, 1);
    cell.setValue(summery);

  }

  hotlineFooter() {
    var hotline = EMPTY_STRING
    if (this.today.getDate() < 8) {
      hotline = DOUBLE_SPACE + this.text.Hotline;
    }
    return hotline;
  }

  // #region Parse Events
  parseAllEvents() {
    var eventGroups = this.parseAllIntoEventGroups();
    var groupsStr = eventGroups.map(group => this.concatenateKeysAndEvents(this.allKeys(group), group));

    var titlesStr = this.createTitles();

    var finalStr = EMPTY_STRING;
    for (var i = 0; i < groupsStr.length; i++) {
      finalStr += titlesStr[i] + groupsStr[i] + DOUBLE_SPACE
    }

    return finalStr;
  }
  
  parseAllIntoEventGroups() {
    var dateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    var dayCol = this.getRecordsTableCol(this.RecordsTableCols.Day);

    var events = {}, thisWeekend = {}, nextWeek = {}, after = {}, permEvents = {};

    this.recordsData.forEach((value) => {
      var curDate = new Date(value[dateCol]);
      if (value[dateCol] == this.text.PermanentEvent) {
        var day = value[dayCol];
        this.fillEventsDict(permEvents, day, this.WeeklySummaryPrep(value));
      }
      else {
        if (!this.isValidDate(curDate))
          return;

        if (!this.isFutureEvent(curDate))
          return;

        events = this.setEventGroup(curDate, thisWeekend, nextWeek, after)

        var curDateStr = curDate.toLocaleDateString(this.text.localesDateString);
        this.fillEventsDict(events, curDateStr, this.WeeklySummaryPrep(value));
      }
    })

    return [thisWeekend, nextWeek, after, permEvents];
  }

  allKeys(events) {
    var datesKeys = Object.keys(events);
    if (!datesKeys[0].includes(this.text.dateDividor)) {
      return Object.keys(this.text.weekDays);
    }

    datesKeys.sort((a, b) => {
      // '01/03/2014'.split('/')
      // gives ["01", "03", "2024"]
      a = a.split(this.text.dateDividor);
      b = b.split(this.text.dateDividor);
      return a[2] - b[2] || a[1] - b[1] || a[0] - b[0];
    });
    return datesKeys;
  }

  setTodayDate() {
    var wsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.WEEKLY_SUMMERY_TABLE);

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
  // #endregion Parse Events

  // #region summery helper functions
  fillEventsDict(dict, key, data) {
    if (dict[key] == undefined) {
      dict[key] = new Array();
    }
    if (data != EMPTY_STRING)
      dict[key].push(data);
  }

  concatenateKeysAndEvents(keys, events) {
    var eventsStr = EMPTY_STRING;
    keys.forEach((value, index) => {
      if (events[value] != undefined) {
        eventsStr += this.dateAndDay(value) + this.text.breakline;
        eventsStr += events[value].join(this.text.breakline);
        eventsStr += this.text.breakline;
      }
    })

    return eventsStr;
  }

  WeeklySummaryPrep(row) {
    const linkToPostCol = this.getRecordsTableCol(this.RecordsTableCols.PostLink);
    const eventNameCol = this.getRecordsTableCol(this.RecordsTableCols.EventName);
    const lineNameCol = this.getRecordsTableCol(this.RecordsTableCols.LineName);
    const dateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    const extraInfoCol = this.getRecordsTableCol(this.RecordsTableCols.MoreInfo);
    const approvedCol = this.getRecordsTableCol(this.RecordsTableCols.SystemApproved);

    const postLink = row[linkToPostCol];
    const eventName = row[eventNameCol];
    const lineName = row[lineNameCol];
    const date = row[dateCol];
    const moreInfo = row[extraInfoCol];
    const systemApproved = row[approvedCol];

    if (this.isHideFromSummary(row))
      return EMPTY_STRING;

    let summary = date === this.text.Markers.PermanentEvent ? this.text.Markers.PermanentEvent : this.text.Markers.RegularEvent;
    summary += eventName.replace(this.text.Markers.Approved, EMPTY_STRING).trim() + this.parseLine(eventName, lineName);

    if (moreInfo.includes(this.text.Markers.Discount)) {
      summary += SPACE_STRING + this.text.Markers.Discount;
    }

    summary += systemApproved;
    summary = "[" + summary + "](" + postLink + ")";

    return summary;
  }

  isHideFromSummary(row) {
    const hideFromSummaryCol = this.getRecordsTableCol(this.RecordsTableCols.HideFromSummary);
    return row[hideFromSummaryCol] !== EMPTY_STRING;
  }
  // #endregion summery helper functions

  // #region Validations
  isValidDate(curDate) {
    if (curDate == this.errors.InvalidDate)
      return false;

    return true;
  }

  isFutureEvent(curDate) {
    return (curDate > this.today);
  }
  // #endregion Validations

  // #region Titles
  createTitles() {
    var text = this.text.Titles;
    var thisWeekend = this.createTitle(text.ThisWeekend, this.thu, this.saturday);

    var sunday = new Date(this.saturday.getTime() + 1 * milInDay)
    var nextWeek = this.createTitle(text.NextWeek, sunday, this.nextSat)

    var after = this.createTitle(text.FutureEvents);

    var permEvents = this.createTitle(text.PermanentEvents);

    return [thisWeekend, nextWeek, after, permEvents];
  }

  createTitle(text, startDate = null, endDate = null) {
    return this.text.telegramBold + this.text.titleMarker + text + (startDate != null ? this.titleDates(startDate, endDate) : EMPTY_STRING) + this.text.titleMarker + this.text.telegramBold + DOUBLE_SPACE;
  }

  titleDates(startDate, endDate) {
    return SPACE_STRING + this.text.openBracket + startDate.getDate() + (startDate.getMonth() == endDate.getMonth() ? EMPTY_STRING : this.text.dateDividor + (startDate.getMonth() + 1)) + this.text.hyphen + endDate.toLocaleDateString(this.text.localesDateString) + this.text.closeBracket
  }
  // #endregion Titles
}
if (typeof module !== "undefined") module.exports = Summary;

function initCreatePost() {
  return new Summary();
}