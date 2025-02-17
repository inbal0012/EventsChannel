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

  // #region Get from Table
  getEnmTableCol(colName) {
    return this._colNumberByLabel(colName, this.eventsData) - 1;
  }

  getRecordsTableCol(colName) {
    return this._colNumberByLabel(colName, this.recordsData) - 1;
  }
  // #endregion Get from Table

  // #region Create Post
  createPost(ROW_NUM) {
    var row = this.eventsData[ROW_NUM];

    var postEvent = this.switchPostType(row);
    var eventDescription = this.getEventDescription(row);

    if (postEvent == EMPTY_STRING) {
      postEvent = this.errors.ParsingEventError;
    }

    return [postEvent, eventDescription];
  }

  switchPostType(row) {
    var iamCol = this.getEnmTableCol(this.ENMTableCols.Iam);
    var postTypeCol = row[iamCol] === this.text.Organizer ?
      this.getEnmTableCol(this.ENMTableCols.Organizer) :
      this.getEnmTableCol(this.ENMTableCols.NonOrganizer);
    var cancleEventCol = this.getEnmTableCol(this.ENMTableCols.CancleEvent);

    var postType = row[postTypeCol];
    var PostTypes = this.config.PostTypes;

    switch (postType) {
      case PostTypes.publish:
        return this.buildPost(row);
      case PostTypes.share:
        return this.shareEvent(row);
      case PostTypes.cancel:
        return postType + this.text.breakline + row[cancleEventCol];
      case PostTypes.update:
        return this.fixPost(row);
      case PostTypes.contact:
        return this.contactRequest(row);
      default:
        return EMPTY_STRING;
    }
  }

  fixPost(row) {
    var lineCol = this.getEnmTableCol(this.ENMTableCols.UpdateLine);
    var linkCol = this.getEnmTableCol(this.ENMTableCols.UpdateLink);
    var contactCol = this.getEnmTableCol(this.ENMTableCols.UpdateContact);
    var updatesCol = this.getEnmTableCol(this.ENMTableCols.Updates);

    var event = row[linkCol] != EMPTY_STRING ? row[linkCol] : this.text.By + row[lineCol]
    return this.text.FixPost + this.text.breakline + event + this.text.breakline + this.text.Contact + row[contactCol] + this.text.breakline + this.text.NeededUpdates + row[updatesCol]
  }

  contactRequest(row) {
    var contWay = this.getEnmTableCol(this.ENMTableCols.ContactWays)
    var contSubj = this.getEnmTableCol(this.ENMTableCols.ContactSubject);

    return this.text.ContactRequest + DOUBLE_SPACE + this.text.Contact + row[contWay] + DOUBLE_SPACE + this.text.Reason + row[contSubj];
  }

  shareEvent(row) {
    var linkToEventCol = this.getEnmTableCol(this.ENMTableCols.LinkToEvent);
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);

    return this.text.ShareEvent + this.text.breakline + row[eventNameCol] + this.text.spacedHyphen + row[linkToEventCol];
  }

  buildPost(row) {
    const [eventName, eventDate] = [row[this.getEnmTableCol(this.ENMTableCols.EventName)], row[this.getEnmTableCol(this.ENMTableCols.Date)]];
    if (this.isEventExistsInRecordsByNameAndDate(eventName, eventDate) && !this.isPaidPost(row)) {
      return this.errors.EventDuplication.Title + ": " + eventName + this.errors.EventDuplication.Error;
    }

    var temp = this.getEventAndLineNames(row)
    if (temp.indexOf(this.text.vs2Line.Name) + 1) {
      return this.build2VS2Post(row);
    }

    return this.parsePaidPost(row) + this.parseName_place_date(row) + DOUBLE_SPACE + this.parseRegistrationSection(row) + this.setReferanceOnly(row) + DOUBLE_SPACE + this.additionalsNotes(row) + this.parseTags(row);
  }
  // #endregion Create Post

  // #region Build Post
  parseChannelDiscount(row) {
    var isDiscountCol = this.getEnmTableCol(this.ENMTableCols.IsDiscount);
    var discountCol = this.getEnmTableCol(this.ENMTableCols.Discount);

    if (!(row[isDiscountCol] === this.text.Yes)) {
      return EMPTY_STRING
    }

    var discountStr = this.text.breakline + this.text.ChannelDiscount;
    if (row[discountCol] < 1) {
      discountStr += row[discountCol] * 100 + this.text.PercentDiscount;
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

    return EMPTY_STRING;
  }

  build2VS2Post(row) {
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date)
    var date = row[dateCol]
    var day = date.getDay();
    var text = this.text.vs2Line;
    if (day != 2)
      return text.Duplication;

    var header = text.header;
    var tuesday = text.tuesday + this.DateInddmmyyyy(date) + this.text.ComaHour + "22:00";
    var thursday = text.thursday + this.DateInddmmyyyy(new Date(date.getTime() + 2 * milInDay)) + this.text.ComaHour + "23:00";
    var friday = text.friday + this.DateInddmmyyyy(new Date(date.getTime() + 3 * milInDay)) + this.text.ComaHour + "23:00";
    var ending = text.ending;
    var tags = text.tags;

    return header + DOUBLE_SPACE + tuesday + DOUBLE_SPACE + thursday + DOUBLE_SPACE + friday + DOUBLE_SPACE + ending + DOUBLE_SPACE + tags;
  }

  // #region Links Table
  findEventOrLineInLinks(eventName, lineName) {
    var linksSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.LINKS_TABLE);
    var linksData = linksSheet.getDataRange().getValues();

    eventName = eventName.toLowerCase().trim();
    lineName = lineName.toLowerCase().trim();

    var eventNameCol = this._colNumberByLabel(this.RecordsTableCols.EventName, linksData) - 1;
    var lineNameCol = this._colNumberByLabel(this.RecordsTableCols.LineName, linksData) - 1;

    if (isNaN(eventNameCol)) {
      // throw new Error("problem with Links Table");
      return this.errors.LinksTableError;
    }

    var events = [];
    for (var i = 0; i < linksData.length; i++) {
      var dEvent = linksData[i][eventNameCol].toLowerCase();
      var dLine = linksData[i][lineNameCol].toLowerCase();

      var lineCheck = false;
      if (lineName != EMPTY_STRING) {
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
    var linksSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.LINKS_TABLE);
    var linksData = linksSheet.getDataRange().getValues();

    var wantedCol = this._colNumberByLabel(wantedColName, linksData) - 1;

    var events = this.findEventOrLineInLinks(eventName, lineName);
    if (events == this.errors.LinksTableError) {
      return this.errors.LinksTableError;
    }

    if (events.length > 0) {
      for (var i = 0; i < events.length; i++) {
        if (events[i][wantedCol] != EMPTY_STRING)
          return events[i][wantedCol];
      }
    }
  }

  searchLinesInEventName(eventName) {
    const linksSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.LINKS_TABLE);
    const linksData = linksSheet.getDataRange().getValues();
    const lineNameCol = this._colNumberByLabel(this.RecordsTableCols.LineName, linksData) - 1;

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
  // #endregion Links Table

  // #region Tags
  parseTags(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType);

    var tags = EMPTY_STRING;
    if (row[eventTypeCol] != EMPTY_STRING) {
      tags = this.createTagsForNewEvent(row);
    }
    else {
      tags = this.getTagsFromPastEvent(row);
    }

    if (!this.isTicketsAvailable(row)) {
      tags = this.text.SaveTheDateTag + this.text.breakline + tags;
    }

    if (tags != EMPTY_STRING) {
      tags = tags.replace(/[,]/g, SPACE_STRING);
    }

    return tags;
  }

  createTagsForNewEvent(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType)

    var tagsArr = []
    for (var i = 0; i < 10; i++) {
      tagsArr.push(row[eventTypeCol + i]);
    }

    return tagsArr.join(SPACE_STRING);
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
    var lines = this.text.regularLines;
    var tags = EMPTY_STRING;
    switch (regularLines) {
      case lines.NoneOfTheAbove:
        if (row[linkOrTextCol] == this.text.LinkToPost) {
          var postLink = row[postLinkCol];
          return this.getTagsByPostLink(postLink);
        }
        else {
          tags = row[postTextCol]
        }
        break;
      case lines.WildGinger:
        tags = row[wildGingerCol]
        break;
      case lines.MOJO:
        tags = row[mojoCol]
        break;
      case lines.NorthenCircle:
        tags = row[northenCircleCol]
        break;
      default:
        if (regularLines.match(this.text.ChannelLink) != undefined) {
          return this.getTagsByPostLink(regularLines);
        }
        tags = regularLines;
    }

    if (tags != EMPTY_STRING)
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
      return temp.join(SPACE_STRING);
    else
      return undefined;
  }
  // #endregion Tags

  setReferanceOnly(row) {
    // TODO upgrade
    var lineNameCol = this.getEnmTableCol(this.ENMTableCols.LineName);
    var context = this.text.ReferanceOnly;

    if (context.Lines.includes(row[lineNameCol])) {
      return this.text.breakline + context.text;
    }
    return EMPTY_STRING;
  }

  isTicketsAvailable(row) {
    var isTicketsAvailableCol = this.getEnmTableCol(this.ENMTableCols.IsTicketsAvailable);

    if (row[isTicketsAvailableCol] == this.text.SaveTheDateTag)
      return false;
    return true;

  }

  // #region Registration Section
  parseRegistrationSection(row) {
    var link = this.parseRegistration(row)
    var channelDiscount = this.parseChannelDiscount(row)
    return link + channelDiscount;
  }

  parseRegistration(row) {
    var link = this.parseRegistrationLink(row) + this.text.breakline;
    var temp = this.getEventDescription(row);
    if (temp) {
      link += this.text.registrationLinkWithDetailsInFirstComment;
    }
    else {
      link += this.text.registrationLinkWithDetails;
    }

    return link;

  }

  parseRegistrationLink(row) {
    var regLinkCol = this.getEnmTableCol(this.ENMTableCols.RegistrationLink);
    var moreInfoCol = this.getEnmTableCol(this.ENMTableCols.MoreInfo);
    var link = this.text.OriginalLink;

    if (this.isTicketsAvailable(row)) {
      link += row[regLinkCol];
    }
    else {
      link += row[moreInfoCol];
    }

    var tiny = this.findLineLink(...this.getEventAndLineNames(row))
    if (tiny != undefined) {
      link += this.text.TinyLink + tiny;
    }

    return link;
  }
  // #endregion Registration Section

  additionalsNotes(row) {
    var additionalsNotesCol = this.getEnmTableCol(this.ENMTableCols.AdditionalsNotes);

    var notes = row[additionalsNotesCol];
    if (notes != EMPTY_STRING)
      notes = this.text.telegramBold + this.text.AdditionalsNotes + this.text.telegramBold + this.text.breakline + notes + this.text.breakline
    return notes;
  }

  getEventDescription(row) {
    var eventDescriptionCol = this.getEnmTableCol(this.ENMTableCols.EventDescription);

    var eventDescription = row[eventDescriptionCol];
    if (eventDescription != EMPTY_STRING) {
      return eventDescription
    }
  }

  parsePaidPost(row) {
    const adTypeCol = this.getEnmTableCol(this.ENMTableCols.AdType);
    const numOfPostsCol = this.getEnmTableCol(this.ENMTableCols.NumOfPosts);
    const paidAdditionsCol = this.getEnmTableCol(this.ENMTableCols.PaidAdditions);
    const additionalLinksCol = this.getEnmTableCol(this.ENMTableCols.AdditionalLinks);
    const numOfEmojisCol = this.getEnmTableCol(this.ENMTableCols.NumOfEmojis);
    const payerNameCol = this.getEnmTableCol(this.ENMTableCols.PayerName);
    const CalcPaymentCol = this.getEnmTableCol(this.ENMTableCols.CalcPayment);

    if (this.isPaidPost(row)) {
      let paidPostInfo = this.text.PaidPost + this.text.breakline + row[payerNameCol] + this.text.spacedHyphen + row[CalcPaymentCol] + this.text.breakline + this.text.For;
      var AdType = this.config.AdType;

      if (row[adTypeCol] != AdType.BASIC) {
        paidPostInfo += row[adTypeCol] + this.text.coma;
      }
      if (row[numOfPostsCol] > 1) {
        paidPostInfo += row[numOfPostsCol] + this.text.Posts + this.text.coma;
      }
      if (row[paidAdditionsCol].includes(AdType.ADDITIONAL_LINK)) {
        paidPostInfo += AdType.ADDITIONAL_LINK + this.text.spacedHyphen + row[additionalLinksCol] + this.text.coma;
      }
      if (row[paidAdditionsCol].includes(AdType.EMOJIS)) {
        paidPostInfo += row[numOfEmojisCol] + AdType.EMOJIS + this.text.coma;
      }

      return paidPostInfo + DOUBLE_SPACE;
    }

    return EMPTY_STRING;
  }

  isPaidPost(row) {
    return row[this.getEnmTableCol(this.ENMTableCols.ShowPayment)] > 0;
  }

  // #region Name and Line
  getEventAndLineNames(row) {
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var lineNameCol = this.getEnmTableCol(this.ENMTableCols.LineName);

    return [row[eventNameCol], row[lineNameCol]];

  }

  parseName_place_date(row) {
    var locationCol = this.getEnmTableCol(this.ENMTableCols.Location);

    var name = this.parseNameRow(row);
    var date = this.parseDate(row);

    var name_place_date = name + this.text.breakline + this.text.Location + row[locationCol] + this.text.breakline + date;
    return name_place_date;
  }

  parseNameRow(row) {
    var systemApproved = this.parseSystemApproved(row)
    var name = this.parseName(row);
    var line = this.parseLine(...this.getEventAndLineNames(row));
    return systemApproved + this.text.telegramBold + name + this.text.telegramBold + line;
  }

  parseName(row) {
    var eventNameCol = this.getEnmTableCol(this.ENMTableCols.EventName);
    var name = row[eventNameCol];

    return this.addPrefixIfNeeded(name);

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
  // #endregion Name and Line

  // #region Date
  parseDate(row) {
    var isParmanentCol = this.getEnmTableCol(this.ENMTableCols.IsParmanent);
    var daysCol = this.getEnmTableCol(this.ENMTableCols.ParmanentDays);
    var dayCol = this.getEnmTableCol(this.ENMTableCols.Day);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);

    if (row[isParmanentCol] == this.text.Yes) {
      return this.text.When + this.text.EveryDay + row[daysCol] + this.parseHour(row);
    }
    return this.text.When + this.dateAndDay(row[dateCol], true) + this.parseHour(row);

  }

  parseHour(row) {
    var hourCol = this.getEnmTableCol(this.ENMTableCols.Hour);

    if (row[hourCol] != EMPTY_STRING)
      return this.text.ComaHour + row[hourCol];
    else
      return EMPTY_STRING;

  }

  DateInddmmyyyy(i_date) {
    if (typeof i_date === "string") {
      i_date = Utilities.parseDate(i_date, "GMT", "dd/MM/yyyy");
    }
    var curDate = new Date(i_date);
    return curDate.toLocaleDateString(this.text.localesDateString);
  }
  // #endregion Date

  // #endregion Build Post

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
  // #endregion Events By Date

  // #region summery helper functions
  fillEventsDict(dict, key, data) {
    if (dict[key] == undefined) {
      dict[key] = new Array();
    }
    if (data != EMPTY_STRING)
      dict[key].push(data);
  }

  keysByWeekday() {
    return Object.keys(this.text.weekDays);
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

  isEventExistsInRecordsByNameAndDate(eventName, eventDate) {
    const eventNameCol = this.getRecordsTableCol(this.RecordsTableCols.EventName);
    const eventDateCol = this.getRecordsTableCol(this.RecordsTableCols.Date);
    eventDate = this.DateInddmmyyyy(eventDate);

    return this.recordsData.some(row => row[eventNameCol].trim() === this.addPrefixIfNeeded(eventName) && this.DateInddmmyyyy(row[eventDateCol]) === eventDate);
  }
}
if (typeof module !== "undefined") module.exports = Post;

function initPost() {
  return new Post();
}