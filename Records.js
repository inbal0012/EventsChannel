/**
 * Class for handling records.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Common = require('./Common.js');
}

class Records extends Common {
  constructor() {
    if (Records.instance) return Records.instance;

    super();
    Records.instance = this;

    return Records.instance;
  }

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
    var extraData = this.extractExtraData(data);
    var hide = this.EMPTY_STRING;

    if (this.isEventExistsInRecordsByNameAndDate(name, date, day)) {

      var response = Browser.msgBox(this.errors.EventDuplication.Title, name + this.errors.EventDuplication.Error + this.text.AddAnyway, Browser.Buttons.YES_NO);
      if (response == "yes") {
        hide = this.text.Yes;
      } else {
        return;
      }
    }

    var response = Browser.msgBox(this.text.postAgain, Browser.Buttons.YES_NO);
    if (response == "yes") {
      this.markRawAs(this.config.RawStatus.PENDING, name, date);
    } else {
      this.markRawAs(this.config.RawStatus.DONE, name, date);
    }
    this.setUpToDateStatus(false);

    // לינק לפוסט, תגיות, שם אירוע, שם הליין, מיקום, יום, תאריך, שעה, לינק, מידע נוסף, האם להסתיר מהסיכום
    var postArray = [postLink, tags, name, lineName, location, day, date, hour, eventLink, extraData, hide]

    this.addToTable(postArray);
    this.cleanForm();
  }

  // #region Submit Event
  validateEventLink(eventLink) {
    if (eventLink == undefined) {
      return false;
    }
    return true;
  }

  validatePostLink(postLink) {
    return postLink !== this.EMPTY_STRING && (postLink.includes(this.text.ChannelLink));
  }

  // #region Extract Data
  extractLocation(data) {
    var locationRow = this.findRowInPost(this.text.Location, data);
    if (locationRow !== -1) {
      return data[locationRow].replace(this.text.Location, this.EMPTY_STRING);
    }
    return this.EMPTY_STRING;
  }

  extractEventLink(data, formSheet) {
    var eventLink = formSheet.getRange(this.config.INNER_DB.PARSE_POST.REG_LINK_CELL).getCell(1, 1).getValue();
    if (eventLink != this.EMPTY_STRING) {
      return eventLink;
    }

    var eventLinkRowNum = this.findRowInPost("://", data)
    if (eventLinkRowNum == -1) {
      return;
    }

    eventLink = data[eventLinkRowNum]

    if (eventLink.includes(this.text.openBracket)) {
      var temp = eventLink.split(this.text.openBracket)
      eventLink = this.EMPTY_STRING;
      if (temp.length < 2) {
        temp = data[this.findRowInPost(this.text.openBracket, data)].split(this.text.openBracket)
        temp = temp[1].split(this.text.closeBracket)
        eventLink = temp[0];
      }
      else {
        eventLink = temp[1].replace(this.text.closeBracket, this.EMPTY_STRING)
      }
    }

    return eventLink;

  }

  extractDayDateAndHour(data) {
    var timeRaw = data[this.findRowInPost(this.text.When, data)]

    if (timeRaw.includes(this.text.EveryDay)) {
      var template = timeRaw.match(this.text.PermanentEventTemplate);
      if (template) {
        var day = template[1];
        var hour = template[2];
        return [day, this.text.PermanentEvent, hour];
      }
    }

    var temp = timeRaw.replace(this.text.When, this.EMPTY_STRING).split(this.text.coma)
    var day = temp[0].replace(this.text.Day, this.EMPTY_STRING)
    var date = temp[1].trim()
    var hour = this.EMPTY_STRING
    if (temp.length > 2) {
      hour = temp[2].replace(this.text.Hour, this.EMPTY_STRING)
    }

    return [day, date, hour];
  }

  extractEventAndLineName(data) {
    var nameRaw = data[0]

    var temp = nameRaw.split(this.text.By)
    var name = temp[0].trim(), lineName = this.EMPTY_STRING
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
      tags += this.SPACE_STRING + data[tagsRow + 1];
    }

    return tags;
  }

  extractExtraData(data) {
    var eventLinkRowNum = this.findRowInPost(this.text.Register, data)
    var extraData = data[eventLinkRowNum + 1]
    if (extraData.includes(this.text.Details)) {
      extraData = data[eventLinkRowNum + 2]
    }

    return extraData;
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

  markRawAs(status, name, date) {
    var rawDataSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.RAW_DATA_TABLE);
    var rawData = rawDataSheet.getDataRange().getValues();
    var lastRow = rawData.length - 1;
    var nameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);
    var doneCol = this.getEnmTableCol(this.ENMTableCols.Done);

    for (var i = lastRow; i > Math.max(0, lastRow - 100); i--) {
      var currEvent = rawData[i]
      var eventName = currEvent[nameCol];
      var eventDate = currEvent[dateCol];
      if (eventName === name && this.DateInddmmyyyy(eventDate) === date) {
        rawDataSheet.getRange(i + 1, doneCol + 1).setValue(status);
        return;
      }
    }
  }
  // #endregion Submit Event

}
if (typeof module !== "undefined") module.exports = Records;

function initRecords() {
  return new Records();
}