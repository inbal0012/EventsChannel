/**
 * Class for creating an Event Post the event form.
 */

// jshint esversion: 8
if (typeof require !== 'undefined') {
  Common = require('./Common.js');
}

class CreatePost extends Common {
  constructor() {
    if (CreatePost.instance) return CreatePost.instance;
    
    super();
    CreatePost.instance = this;

    return CreatePost.instance;
  }

  createPost(ROW_NUM) {
    var row = this.eventsData[ROW_NUM];

    var postEvent = this.switchPostType(row);
    var eventDescription = this.getEventDescription(row);

    if (postEvent == this.EMPTY_STRING) {
      postEvent = this.errors.ParsingEventError;
    }

    return [postEvent, eventDescription];
  }

  switchPostType(row) {
    var iamCol = this.getEnmTableCol(this.ENMTableCols.Iam);
    var postTypeCol = row[iamCol] === this.text.Organizer ?
      this.getEnmTableCol(this.ENMTableCols.Organizer) :
      this.getEnmTableCol(this.ENMTableCols.NonOrganizer);

    var postType = row[postTypeCol];
    var PostTypes = this.config.PostTypes;

    switch (postType) {
      case PostTypes.publish:
        return this.buildPost(row);
      case PostTypes.share:
        return this.shareEvent(row);
      case PostTypes.update:
        return this.fixPost(row);
      case PostTypes.contact:
        return this.contactRequest(row);
      default:
        return this.EMPTY_STRING;
    }
  }

  fixPost(row) {
    var lineCol = this.getEnmTableCol(this.ENMTableCols.UpdateLine);
    var linkCol = this.getEnmTableCol(this.ENMTableCols.UpdateLink);
    var contactCol = this.getEnmTableCol(this.ENMTableCols.UpdateContact);
    var updatesCol = this.getEnmTableCol(this.ENMTableCols.Updates);

    var event = row[linkCol] != this.EMPTY_STRING ? row[linkCol] : this.text.By + row[lineCol]
    return this.text.FixPost + this.text.breakline + event + this.text.breakline + this.text.Contact + row[contactCol] + this.text.breakline + this.text.NeededUpdates + row[updatesCol]
  }

  contactRequest(row) {
    var contWay = this.getEnmTableCol(this.ENMTableCols.ContactWays)
    var contSubj = this.getEnmTableCol(this.ENMTableCols.ContactSubject);

    return this.text.ContactRequest + this.DOUBLE_SPACE + this.text.Contact + row[contWay] + this.text.breakline + this.text.Reason + row[contSubj];
  }

  shareEvent(row) {
    var linkToEventCol = this.getEnmTableCol(this.ENMTableCols.LinkToEvent);
    var TitleCol = this.getEnmTableCol(this.ENMTableCols.Title);

    return this.text.ShareEvent + this.text.breakline + row[TitleCol] + this.text.spacedHyphen + row[linkToEventCol];
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

    return this.parsePaidPost(row) + this.parseName_place_date(row) + this.DOUBLE_SPACE + this.parseRegistrationSection(row) + this.setReferanceOnly(row) + this.DOUBLE_SPACE + this.additionalsNotes(row) + this.parseTags(row);
  }
  // #endregion Create Post

  // #region Build Post
  parseChannelDiscount(row) {
    var isDiscountCol = this.getEnmTableCol(this.ENMTableCols.IsDiscount);
    var discountCol = this.getEnmTableCol(this.ENMTableCols.Discount);

    if (!(row[isDiscountCol] === this.text.Yes)) {
      return this.EMPTY_STRING
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

    return this.EMPTY_STRING;
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
    var thursday = text.thursday + this.DateInddmmyyyy(new Date(date.getTime() + 2 * this.milInDay)) + this.text.ComaHour + "23:00";
    var friday = text.friday + this.DateInddmmyyyy(new Date(date.getTime() + 3 * this.milInDay)) + this.text.ComaHour + "23:00";
    var ending = text.ending;
    var tags = text.tags;

    return this.parsePaidPost(row) + header + this.DOUBLE_SPACE + tuesday + this.DOUBLE_SPACE + thursday + this.DOUBLE_SPACE + friday + this.DOUBLE_SPACE + ending + this.DOUBLE_SPACE + tags;
  }

  // #region Links Table
  findEventOrLineInLinks(eventName, lineName) {
    var linksSheet = this.recordsSpreadsheet.getSheetByName(this.config.INNER_DB.LINKS_TABLE);
    var linksData = linksSheet.getDataRange().getValues();

    eventName = eventName.toLowerCase().trim();
    lineName = lineName.toLowerCase().trim();

    var eventNameCol = this._colNumberByLabel(this.RecordsTableCols.EventName, linksData);
    var lineNameCol = this._colNumberByLabel(this.RecordsTableCols.LineName, linksData);

    if (isNaN(eventNameCol)) {
      // throw new Error("problem with Links Table");
      return this.errors.LinksTableError;
    }

    var events = [];
    for (var i = 0; i < linksData.length; i++) {
      var dEvent = linksData[i][eventNameCol].toLowerCase();
      var dLine = linksData[i][lineNameCol].toLowerCase();

      var lineCheck = false;
      if (lineName != this.EMPTY_STRING) {
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

    var wantedCol = this._colNumberByLabel(wantedColName, linksData);

    var events = this.findEventOrLineInLinks(eventName, lineName);
    if (events == this.errors.LinksTableError) {
      return this.errors.LinksTableError;
    }

    if (events.length > 0) {
      for (var i = 0; i < events.length; i++) {
        if (events[i][wantedCol] != this.EMPTY_STRING)
          return events[i][wantedCol];
      }
    }
  }
  // #endregion Links Table

  // #region Tags
  parseTags(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType);

    var tags = this.EMPTY_STRING;
    if (row[eventTypeCol] != this.EMPTY_STRING) {
      tags = this.createTagsForNewEvent(row);
    }
    else {
      tags = this.getTagsFromPastEvent(row);
    }

    if (!this.isTicketsAvailable(row)) {
      tags = this.text.SaveTheDateTag + this.text.breakline + tags;
    }

    if (tags != this.EMPTY_STRING) {
      tags = tags.replace(/[,]/g, this.SPACE_STRING);
    }

    return tags;
  }

  createTagsForNewEvent(row) {
    var eventTypeCol = this.getEnmTableCol(this.ENMTableCols.EventType)

    var tagsArr = []
    for (var i = 0; i < 10; i++) {
      tagsArr.push(row[eventTypeCol + i]);
    }

    return tagsArr.join(this.SPACE_STRING);
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
    var tags = this.EMPTY_STRING;
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

    if (tags != this.EMPTY_STRING)
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
      return temp.join(this.SPACE_STRING);
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
    return this.EMPTY_STRING;
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
    if (notes != this.EMPTY_STRING)
      notes = this.text.telegramBold + this.text.AdditionalsNotes + this.text.telegramBold + this.text.breakline + notes + this.text.breakline
    return notes;
  }

  getEventDescription(row) {
    var eventDescriptionCol = this.getEnmTableCol(this.ENMTableCols.EventDescription);

    var eventDescription = row[eventDescriptionCol];
    if (eventDescription != this.EMPTY_STRING) {
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

      return paidPostInfo + this.DOUBLE_SPACE;
    }

    return this.EMPTY_STRING;
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
  // #endregion Name and Line

  // #region Date
  parseDate(row) {
    var isParmanentCol = this.getEnmTableCol(this.ENMTableCols.IsParmanent);
    var daysCol = this.getEnmTableCol(this.ENMTableCols.ParmanentDays);
    var dateCol = this.getEnmTableCol(this.ENMTableCols.Date);

    if (row[isParmanentCol] == this.text.Yes) {
      return this.text.When + this.text.EveryDay + row[daysCol] + this.parseHour(row);
    }
    return this.text.When + this.dateAndDay(row[dateCol], true) + this.parseHour(row);

  }

  parseHour(row) {
    var hourCol = this.getEnmTableCol(this.ENMTableCols.Hour);

    if (row[hourCol] != this.EMPTY_STRING)
      return this.text.ComaHour + this.HHmmHour(row[hourCol]);
    else
      return this.EMPTY_STRING;

  }

  HHmmHour(date) {
    if (!date) return this.EMPTY_STRING;
    return date.toTimeString().slice(0, 5);
  }
  // #endregion Date
}
if (typeof module !== "undefined") module.exports = CreatePost;

function initCreatePost() {
  return new CreatePost();
}