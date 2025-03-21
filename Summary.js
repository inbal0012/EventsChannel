/**
 * Class for handling summaries.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Common = require('./Common.js');
}

class Summary extends Common {
  constructor() {
    if (Summary.instance) return Summary.instance;

    super();
    Summary.instance = this;

    this.today = this.setTodayDate();
    this.thu = new Date(this.today.getTime() + 1 * this.milInDay)
    this.saturday = new Date(this.thu.getTime() + 2 * this.milInDay);
    this.nextSat = new Date(this.saturday.getTime() + 7 * this.milInDay);

    return Summary.instance;
  }

  // #region test
  prepAllEvents() {
    var dateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    var dayCol = this.getRecordsTableCol(this.RecordsTableCols.Day);

    var events = {}, permEvents = {};
    // TODO sort perm events by day

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

        this.fillEventsDict(events, curDate.toLocaleDateString(this.text.localesDateString), this.WeeklySummaryPrep(value));
      }
    })

    var eventsArray = this.concatenateKeysAndEvents(this.allKeysSorted(events), events);
    var permEventsArray = this.concatenateKeysAndEvents(this.allKeysSorted(permEvents), permEvents);

    return [eventsArray, permEventsArray];
  }

  concatenateKeysAndEvents(keys, i_events) {
    var events = [];
    keys.forEach((value, index) => {
      if (i_events[value] != undefined) {
        events.push([value, i_events[value].join(this.text.breakline)]);
      }
    })

    return events;
  }

  getSummary() {
    var isUpToDate = this.summarySheet.getRange(1, 2).getValue();

    if (isUpToDate) {
      return this.summarySheet.getDataRange().getValues().slice(1);
    } else {
      return this.generateSummary();
    }
  }

  buildSummaryMessage() {
    const summary = this.getSummary();
    const t = Utilities.formatDate(new Date(), 'GMT+2', 'dd/MM/yyyy HH:mm');
    var thisWeekend = {}, nextWeek = {}, after = {}, permEvents = {};

    summary.forEach(([date, events]) => {
      if (typeof date === "string" && date.includes(this.text.dateDividor)) {
        date = Utilities.parseDate(date, "GMT", "dd/MM/yyyy")
      }
      var group = this.setEventGroup(date, thisWeekend, nextWeek, after, permEvents);
      group[this.DateInddmmyyyy(date)] = events;
    });

    var eventGroups = [thisWeekend, nextWeek, after, permEvents];
    var groupsStr = eventGroups.map(group => this.concatenateKeysAndEventsStr(this.allKeysSorted(group), group));

    var titlesStr = this.createTitles();

    var finalStr = this.text.WeeklySummary.HEADER + this.DOUBLE_SPACE;
    for (var i = 0; i < groupsStr.length; i++) {
      finalStr += titlesStr[i] + groupsStr[i] + this.DOUBLE_SPACE
    }

    finalStr += this.text.WeeklySummary.FOOTER + this.hotlineFooter();

    return finalStr;
  }

  generateSummary() {
    const [summaryByDay, permEvents] = this.prepAllEvents();
    var summary = [["Up to Date: ", true]];

    summaryByDay.map(([date, events]) => summary.push([date, events]));
    permEvents.map(([date, events]) => summary.push([date, events]));

    this.summarySheet.clear();
    this.summarySheet.getRange(1, 1, summary.length, 2).setValues(summary);
    summary.shift();
    return summary;
  }
  // #endregion test

  dailySummary() {
    var eventsData = this.enmEventsSheet.getDataRange().getValues();
    var count = 0, pendingCount = 0;
    var events = [], pendingEvents = [];

    var doneCol = this.getEnmTableCol(this.ENMTableCols.Done);
    var nameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);
    var typeCol;
    var iamCol = this.getEnmTableCol(this.ENMTableCols.Iam);
    var organizerCol = this.getEnmTableCol(this.ENMTableCols.Organizer);
    var nonOrganizerCol = this.getEnmTableCol(this.ENMTableCols.NonOrganizer);
    var titleCol = this.getEnmTableCol(this.ENMTableCols.Title);

    var PostTypes = this.config.PostTypes;

    // check only last 50 entries
    for (var i = eventsData.length - 1; i > Math.max(0, eventsData.length - 100); i--) {
      var event = eventsData[i];
      var eventName = this.escapeMarkdownV2(event[nameCol]);

      if (event[doneCol] === this.config.RawStatus.PENDING) {
        pendingCount++;
        pendingEvents.push(this.DateInddmmyyyy(event[dateCol]) + this.text.spacedHyphen + eventName);
        continue;
      }

      if (event[doneCol] != this.EMPTY_STRING) {
        continue;
      }
      count++;
      typeCol = event[iamCol] === this.text.Organizer ? organizerCol : nonOrganizerCol;
      if (event[typeCol] == PostTypes.publish) {
        events.push(this.DateInddmmyyyy(event[dateCol]) + this.text.spacedHyphen + eventName);
      }
      else if (event[typeCol] == PostTypes.share) {
        events.push(this.text.ShareEvent + event[titleCol]);
      }
      else
        events.push(this.text.EventFromType + event[typeCol]);
    }
    var res = this.text.telegramBold + this.text.Theres + count + this.text.WaitingEvents + this.text.telegramBold;
    if (count == 0) {
      res += this.text.WellDone;
    }
    res += this.text.colon + this.text.breakline + events.join(this.text.breakline);
    res += pendingCount == 0 ? this.EMPTY_STRING : this.DOUBLE_SPACE + this.text.telegramBold + this.text.Theres + pendingCount + this.text.PendingEvents + this.text.colon + this.text.telegramBold + this.text.breakline + pendingEvents.join(this.text.breakline);
    return res;
  }

  WEEKLY_SUMMARY() {
    var allEvents = this.parseAllEvents()

    const t = Utilities.formatDate(new Date(), 'GMT+2', 'dd/MM/yyyy HH:mm');

    var finalStr = this.text.WeeklySummary.HEADER + this.DOUBLE_SPACE + allEvents +
      this.text.WeeklySummary.FOOTER + this.hotlineFooter();
    finalStr = this.text.UpdatedAt + t + this.text.breakline + finalStr

    return finalStr;
  }

  saveSummery() {
    var summery = this.WEEKLY_SUMMARY();
    var wsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.WEEKLY_SUMMARY_TABLE);

    var cell = wsSheet.getRange(2, 1);
    cell.setValue(summery);

  }

  hotlineFooter() {
    var hotline = this.EMPTY_STRING
    if (this.today.getDate() < 8) {
      hotline = this.DOUBLE_SPACE + this.text.Hotline;
    }
    return hotline;
  }

  setTodayDate() {
    var wsSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.WEEKLY_SUMMARY_TABLE);

    var thuToggle = wsSheet.getRange(1, 2).getCell(1, 1).getValue();
    var today = new Date();
    if (!thuToggle) {
      return today;
    }
    return new Date(today.getTime() - 1 * this.milInDay)
  }

  // #region Parse Events
  parseAllEvents() {
    var eventGroups = this.parseAllIntoEventGroups();
    var groupsStr = eventGroups.map(group => this.concatenateKeysAndEventsStr(this.allKeysSorted(group), group));

    var titlesStr = this.createTitles();

    var finalStr = this.EMPTY_STRING;
    for (var i = 0; i < groupsStr.length; i++) {
      finalStr += titlesStr[i] + groupsStr[i] + this.DOUBLE_SPACE
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

  allKeysSorted(events) {
    var datesKeys = Object.keys(events);
    if (datesKeys.length === 0) {
      return datesKeys;
    }

    if (!datesKeys[0].includes(this.text.dateDividor)) {
      return Object.keys(this.text.weekDays);
    }

    datesKeys.sort((a, b) => {
      return this.sortDatesInddmmyyyy(a, b);
    });
    return datesKeys;
  }

  sortDatesInddmmyyyy(a, b) {
    const [dayA, monthA, yearA] = a.split(this.text.dateDividor).map(Number);
    const [dayB, monthB, yearB] = b.split(this.text.dateDividor).map(Number);
    return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
  }

  setEventGroup(curDate, thisWeekend, nextWeek, after, permEvents = undefined) {
    if (typeof curDate === 'string') {
      return permEvents;
    }
    if (curDate < this.saturday) {
      return thisWeekend;
    }
    else {
      if (curDate < this.nextSat) {
        return nextWeek;
      }
      else {
        return after;
      }
    }
  }
  // #endregion Events By Date

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

    var sunday = new Date(this.saturday.getTime() + 1 * this.milInDay)
    var nextWeek = this.createTitle(text.NextWeek, sunday, this.nextSat)

    var after = this.createTitle(text.FutureEvents);

    var permEvents = this.createTitle(text.PermanentEvents);

    return [thisWeekend, nextWeek, after, permEvents];
  }

  createTitle(text, startDate = null, endDate = null) {
    return this.text.telegramBold + this.text.titleMarker + text + (startDate != null ? this.titleDates(startDate, endDate) : this.EMPTY_STRING) + this.text.titleMarker + this.text.telegramBold + this.DOUBLE_SPACE;
  }

  titleDates(startDate, endDate) {
    return this.SPACE_STRING + this.text.openBracket + startDate.getDate() + (startDate.getMonth() == endDate.getMonth() ? this.EMPTY_STRING : this.text.dateDividor + (startDate.getMonth() + 1)) + this.text.hyphen + endDate.toLocaleDateString(this.text.localesDateString) + this.text.closeBracket
  }
  // #endregion Titles

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
      return this.EMPTY_STRING;

    let summary = date === this.text.PermanentEvent ? this.text.Markers.PermanentEvent : this.text.Markers.RegularEvent;
    summary += eventName.replace(this.text.Markers.Approved, this.EMPTY_STRING).trim() + this.parseLine(eventName, lineName);

    if (moreInfo.includes(this.text.Markers.Discount)) {
      summary += this.SPACE_STRING + this.text.Markers.Discount;
    }

    summary += systemApproved;
    summary = "[" + this.escapeMarkdownV2(summary) + "](" + postLink + ")";

    return summary;
  }

  isHideFromSummary(row) {
    const hideFromSummaryCol = this.getRecordsTableCol(this.RecordsTableCols.HideFromSummary);
    return row[hideFromSummaryCol] !== this.EMPTY_STRING;
  }

  // #region summery helper functions
  fillEventsDict(dict, key, data) {
    if (dict[key] == undefined) {
      dict[key] = [];
    }
    if (data != this.EMPTY_STRING)
      dict[key].push(data);
  }

  concatenateKeysAndEventsStr(keys, events) {
    var eventsStr = this.EMPTY_STRING;
    keys.forEach((value, index) => {
      if (events[value] != undefined) {
        eventsStr += this.dateAndDay(value) + this.text.breakline;
        eventsStr += typeof events[value] === 'string' ? events[value] : events[value].join(this.text.breakline);
        eventsStr += this.text.breakline;
      }
    })

    return eventsStr;
  }
  // #endregion summery helper functions

}
if (typeof module !== "undefined") module.exports = Summary;

function initSummary() {
  return new Summary();
}