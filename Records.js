/**
 * Class for handling records.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Common = require('./Common.js');
}

class Records extends Common {
  constructor() {
    super();
    if (Records.instance) return Records.instance;

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
if (typeof module !== "undefined") module.exports = Records;

function initRecords() {
  return new Records();
}