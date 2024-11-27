/**
 * Class for creating an Event Post the event form.
 */

    const DOUBLE_SPACE = "\n" + "\n";
    const LINK_TABLE_ERROR = "There's a problem with Links Table"

    class Post {
        constructor() {
            if (Post.instance) return Post.instance;

            Post.instance = this;

            const EVENT_TABLE = "Sheet1";
            this.eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
            this.eventsData = this.eventsSheet.getDataRange().getValues();

            return Post.instance;
        }

        dailySummary() {
          var eventsData = this.eventsSheet.getDataRange().getValues();
          var count = 0;
          var events = []
          
          var doneCol = this._colNumberByLabel("Done?", eventsData) - 1;    // Sheet1!A
          var nameCol = this.getEventNameCol();
          var typeCol = this.getPostTypeCol();

          // check only last 50 entries
          for (var i = eventsData.length-1; i > (eventsData.length-50); i--) {
            var event = eventsData[i];
            
            if (event[doneCol] != '') {
              continue;
            }
            count++;
            if (event[nameCol] == "") {
              events.push("אירוע מסוג: " + event[typeCol]);
            }
            else 
              events.push(event[nameCol]);
          }
          return "יש " + count + " אירועים ממתינים:\n" + events.join("\n");
        }

        createPost(ROW_NUM) {
            var fixEvent = "TODO";  // COL E

            var row = this.eventsData[ROW_NUM];

            var postEvent = this.switchPostType(row);          
            var eventDescription = this.getEventDescription(row);

            return [postEvent, eventDescription];
        }

        // #region ColByLabel
        getPostTypeCol() {
            return this._colNumberByLabel("אני?", this.eventsData) - 1;
        }

        getEventNameCol() {
          return this._colNumberByLabel("שם האירוע", this.eventsData) - 1;
        }
        
        getLineNameCol() {
          return this._colNumberByLabel("שם הליין", this.eventsData) - 1;
        }
        
        getDateCol() {
          return this._colNumberByLabel("מתי זה קורה?", this.eventsData) - 1;
        }
        
        getHourCol() {
          return this._colNumberByLabel("באיזה שעה?", this.eventsData) - 1;
        }

        getDayCol() {
          return this._colNumberByLabel("יום", this.eventsData) - 1;
        }

        getLocationCol() {
          return this._colNumberByLabel("איפה האירוע קורה? (עיר, כתובת, שם מועדון)", this.eventsData) - 1;
        }

        getIsDiscountCol() {
          return this._colNumberByLabel("האם תרצו לתת הנחה לעוקבי הערוץ?", this.eventsData) - 1;
        }
        
        getDiscountCol() {
          return this._colNumberByLabel("איזה כיף!!!! מה היא תהיה?", this.eventsData) - 1;
        }
        
        getCancleEventCol() {
          return this._colNumberByLabel("לינק לפוסט המדובר", this.eventsData) - 1;
        }
        
        getLinkToEventCol() {
          return this._colNumberByLabel("אנא הדבק פה את הלינק לאירוע", this.eventsData) - 1;
        }

        getEventTypeCol() {
          return this._colNumberByLabel("מהו סוג האירוע?", this.eventsData) - 1;
        }

        getRegularLinesCol() {
          return this._colNumberByLabel("האם אתם אחד מהליינים הבאים?", this.eventsData) - 1;
        }

        getLinkOrTextCol() {
          return this._colNumberByLabel("אני אשתמש ב", this.eventsData) - 1;
        }

        getPostLinkCol() {
          return this._colNumberByLabel("יש לצרף את הלינק למודעה בערוץ עצמו", this.eventsData) - 1;
        }

        getPostTextCol() {
          return this._colNumberByLabel("יש לצרף את ההודעה כפי שפורסמה בערוץ עצמו", this.eventsData) - 1;
        }

        getMojoCol() {
          return this._colNumberByLabel("היי רענן, על איזה אירוע מדובר?", this.eventsData) - 1;
        }

        getWildGingerCol() {
          return this._colNumberByLabel("היי ענבל, על איזה אירוע מדובר?", this.eventsData) - 1;
        }

        getNorthenCircleCol() {
          return this._colNumberByLabel("היי איתי, על איזה אירוע מדובר?", this.eventsData) - 1;
        }
        
        getIsTicketsAvailableCol() {
          return this._colNumberByLabel("האם כבר קיימת דרך לרכוש כרטיסים?", this.eventsData) - 1;
        }

        getRegistrationLink() {
          return this._colNumberByLabel("דרך הרשמה לאירוע", this.eventsData) - 1;
        }

        getMoreInfoCol() {
          return this._colNumberByLabel("מידע נוסף", this.eventsData) - 1;
        }

        getAdditionalsNotesCol() {
          return this._colNumberByLabel("הערות נוספות", this.eventsData) - 1;
        }

        getEventDescriptionCol() {
          return this._colNumberByLabel("אם הלינק הוא לצ'אט אישי(וואטסאפ או טלגרם או אפילו פרופיל פייסבוק) - אנא צרפו תיאור אירוע שיפורסם בתגובה למודעה על מנת לספק לעוקבים מידע נוסף.שימו לב:אין לצרף לטקסט החופשי קישורים נוספים, מספרי טלפון או משתמשי טלגרם.", this.eventsData) - 1;
        }

        getPaidPostCol() {
          return this._colNumberByLabel("האם תרצו להוסיף קידום בתשלום למודעה שלכם?", this.eventsData) - 1;
        }

        getIsParmanentCol() {
          return this._colNumberByLabel("האם תרצה לפרסם את האירוע כאירוע קבוע בערוץ?", this.eventsData) - 1;
        }

        getDaysCol() {
          return this._colNumberByLabel("באילו ימים מתרחש האירוע?", this.eventsData) - 1;
        }
        
        getContactWaysCol() {
            return this._colNumberByLabel("דרך ליצירת קשר? (1)", this.eventsData) - 1;
        }

        getContactSubjectCol() {
            return this._colNumberByLabel("באיזה נושא מדובר?", this.eventsData) - 1;
        }


        // #endregion ColByLabel

        switchPostType(row) {
            var postTypeCol    = this.getPostTypeCol();
            var linkToEventCol = this.getLinkToEventCol();
            var cancleEventCol = this.getCancleEventCol();

            var postType = row[postTypeCol]

            switch (postType) {
                case "מארגן אירוע ורוצה לפרסם":
                    return this.buildPost(row);
                case "נתקלתי באירוע ואני רוצה לשתף":
                    return postType + "\n" + row[linkToEventCol];
                case "מארגן אירוע ומבקש להוריד פרסום":
                    return postType + "\n" + row[cancleEventCol];
                case "מארגן אירוע ורוצה לעדכן":
                    return this.fixPost(row);
                case "עוקב אחרי הערוץ ומבקש ליצור קשר":
                    return this.contactRequest(row);
                default:
                    return '';
            }
        }

        buildPost(row) {
            return this.parseName_place_date(row) + DOUBLE_SPACE + this.parseRegistrationSection(row) + this.setReferanceOnly(row) + DOUBLE_SPACE + this.additionalsNotes(row) + this.parseTags(row);
        }

        fixPost(row) {
          return "fix Post";   // TODO
        }

        contactRequest(row) {
          var contWay = this.getContactWaysCol()
          var contSubj = this.getContactSubjectCol();
            
          return "Contact Request" + DOUBLE_SPACE + "דרך תקשורת: " + row[contWay] + DOUBLE_SPACE +  "סיבה: " + row[contSubj];
        }

        parseChannelDiscount(row) {
            var isDiscountCol = this.getIsDiscountCol();
            var discountCol = this.getDiscountCol();

            if (row[isDiscountCol] == "כן") {
                return "\n" + "💎 למגיעים דרך הערוץ: " + row[discountCol]
            }
            else
                return ""
        }

        parseSystemApproved(row) {
            var postEventNameCol = this.getEventNameCol();
            var postLineNameCol = this.getLineNameCol();
            
            var eventName = row[postEventNameCol];
            var lineName = row[postLineNameCol];

            var systemApproval = this.findSystemApproved(eventName, lineName);
            if (systemApproval != undefined) {
              return systemApproval;
            }

            return '';
        }

        findEventOrLineInLinks(eventName, lineName) {
            var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("לינקים");
            var eventsTableData = eventsSheet.getDataRange().getValues();
            
            eventName = eventName.toLowerCase().trim();
            lineName = lineName.toLowerCase().trim();

            var eventNameCol = this._colNumberByLabel("שם אירוע", eventsTableData) - 1;
            var lineNameCol = this._colNumberByLabel("שם הליין", eventsTableData) - 1;

            if (isNaN(eventNameCol)) {
              // throw new Error("problem with Links Table");
              return LINK_TABLE_ERROR;
            }

            var events = [];
            for (var i = 0; i < eventsTableData.length; i++) {
                var dEvent = eventsTableData[i][eventNameCol].toLowerCase();
                var dLine = eventsTableData[i][lineNameCol].toLowerCase();
                
                var lineCheck = false;
                if (lineName != '') {
                  lineCheck = lineName == dLine;
                }  
                
                if (eventName == dEvent || eventName == dLine || lineCheck) {
                  events.push(eventsTableData[i])
                }
            }

            return events;
        }

        findSystemApproved(eventName, lineName) {
          var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("לינקים");
          var linksData = eventsSheet.getRange("A1:F").getValues();
          
          var approvedCol = this._colNumberByLabel("מאושר ערוץ", linksData) - 1;

          return this.findInLinksTable(eventName, lineName, "מאושר ערוץ"); 
          var events = this.findEventOrLineInLinks(eventName, lineName);
          if (events == LINK_TABLE_ERROR) {
            return LINK_TABLE_ERROR;
          }

          if (events.length > 0) {
            for (var i = 0; i<events.length; i++) {
              if (events[i][approvedCol] != '')
                return events[i][approvedCol];
            }
          }
        }

        findLineLink(eventName, lineName) {
          // var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("לינקים");
          // var linksData = eventsSheet.getRange("A1:F").getValues();

          // var linkCol = this._colNumberByLabel("לינק", linksData) - 1;

          return this.findInLinksTable(eventName, lineName, "לינק"); 
          var events = this.findEventOrLineInLinks(eventName, lineName);
          if (events == LINK_TABLE_ERROR) {
            return LINK_TABLE_ERROR;
          }

          if (events.length > 0) {
            for (var i = 0; i<events.length; i++) {
              if (events[i][linkCol] != '')
                return events[i][linkCol];
            }
          }
        }

        findInLinksTable(eventName, lineName, wantedColName) {
          var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("לינקים");
          var linksData = eventsSheet.getRange("A1:F").getValues();

          var wantedCol = this._colNumberByLabel(wantedColName, linksData) - 1;

          var events = this.findEventOrLineInLinks(eventName, lineName);
          if (events == LINK_TABLE_ERROR) {
            return LINK_TABLE_ERROR;
          }

          if (events.length > 0) {
            for (var i = 0; i<events.length; i++) {
              if (events[i][wantedCol] != '')
                return events[i][wantedCol];
            }
          }
        }
        
        // #region Tags
        parseTags(row) {
            var eventTypeCol = this.getEventTypeCol();

            var tags = '';
            if (row[eventTypeCol] != '') {
                tags = this.createTagsForNewEvent(row);
            }
            else {
                tags = this.getTagsFromPastEvent(row);
            }

            if (!this.isTicketsAvailable(row)) {
                tags = this.parsePaidPost(row) + "#SaveTheDate" + "\n" + tags;
            }

            if (tags != '') {
              tags = tags.replace(/[,]/g, " ");
              // return tags;
            }

            console.log(this.emojiTags(tags))

            return tags;
        }

        createTagsForNewEvent(row) {
            var eventTypeCol = this.getEventTypeCol()

            var tagsArr = []
            for (var i = 0; i < 10; i++) {
                tagsArr.push(row[eventTypeCol + i]);
            }

            return tagsArr.join(" ");
        }

        getTagsFromPastEvent(row) {
            var regularLinesCol = this.getRegularLinesCol();
            var linkOrTextCol = this.getLinkOrTextCol();
            var postLinkCol = this.getPostLinkCol();
            var postTextCol = this.getPostTextCol();
            var mojoCol = this.getMojoCol();
            var wildGingerCol = this.getWildGingerCol();
            var northenCircleCol = this.getNorthenCircleCol();

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
            var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("טבלת אירועים");
            var eventsData = eventsSheet.getRange("A1:Z").getValues();

            var postLinkCol = this._colNumberByLabel("לינק לפוסט", eventsData) - 1;
            var tagsCol = this._colNumberByLabel("תגיות", eventsData) - 1;

            var ev = eventsData.find(event => event[postLinkCol] == postLink);
            return ev[tagsCol];
        }

        extractTags(text) {
            var temp = text.match(/(#\S+)/g);
            if (temp != undefined && temp != null)
                return temp.join(" ");
            else
                return undefined;
        }

        emojiTags(tagsText) {
            var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/16kV2BNZj0bTKLeYuvoKt0ro8bq2WCury-wMqoOqWeTw/edit?gid=0#gid=0").getSheetByName("אימוג'ים");
            var eventsData = eventsSheet.getDataRange().getValues();

            var emojiCol = this._colNumberByLabel("אימוג'י", eventsData) - 1;
            var tagsCol = this._colNumberByLabel("תגית", eventsData) - 1;
            var tags = tagsText.split("#").map((value) => value.trim());
            
            var emojis = [];

            for (var i=0; i<tags.length; i++) {
              var tag = tags[i];
              for (var j=0; j<eventsData.length; j++) {
                var emoji = eventsData[j][tagsCol];
                if(tags[i] == eventsData[j][tagsCol]) {
                  emojis.push(eventsData[j][emojiCol])
                }

              }
            }
            return emojis.join(" ");

            tags.forEach((currTag) => {
              eventsData.forEach((value) => {
                if(currTag == value[tagsCol]) {
                  emojis.push(value[emojiCol])
                }
              })
            })


            return '';
        }

        findEmojiForTag(value) {
          
        }
        // #endregion Tags

        setReferanceOnly(row) {
            var lineNameCol = this.getLineNameCol()

            if (row[lineNameCol] == "דקדנס" || row[lineNameCol] == "Sin Ethics") {
                return "\n" + "שימו לב - ההגעה לאירוע היא ע''י ממליצים בלבד. אדם שיענה שהגיע דרך הערוץ לא יאושר.";
            }
            return '';
        }

        isTicketsAvailable(row) {
            var isTicketsAvailableCol = this.getIsTicketsAvailableCol();

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
            var regLinkCol = this.getRegistrationLink();
            var moreInfoCol = this.getMoreInfoCol();
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
            var additionalsNotesCol = this.getAdditionalsNotesCol();

            var notes = row[additionalsNotesCol];
            if (notes != '')
              notes = "**Additionals Notes:** \n" + notes
            return notes;
        }

        getEventDescription(row) {
            var eventDescriptionCol = this.getEventDescriptionCol();

            var eventDescription = row[eventDescriptionCol];
            if (eventDescription != '') {
              return eventDescription
            }
        }

        parsePaidPost(row) {
            var paidPostCol = this.getPaidPostCol();

            if (row[paidPostCol] == "כן")
                return "‼️🤑\n"
            else
                return ''
        }

        getEventAndLineNames(row) {
            var eventNameCol = this.getEventNameCol();
            var lineNameCol = this.getLineNameCol();

            return[row[eventNameCol], row[lineNameCol]];

        }

        parseName_place_date(row) {
            var locationCol = this.getLocationCol();

            var name = this.parseNameRow(row);
            var date = this.parseDate(row);

            var name_place_date = name + "\n" + "מיקום: " + row[locationCol] + "\n" + date;
            return name_place_date;
        }

        parseNameRow(row) {
            var systemApproved = this.parseSystemApproved(row)
            var name = this.parseName(row);
            var line = this.parseLine(...this.getEventAndLineNames(row));
            return systemApproved + name + line;
        }
        
        parseName(row) {          
            var eventNameCol = this.getEventNameCol();
            
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
            var isParmanentCol = this.getIsParmanentCol();
            var daysCol = this.getDaysCol();
            var dayCol = this.getDayCol();
            var dateCol = this.getDateCol();

            if(row[isParmanentCol] == "כן") {
              return "מתי: כל יום " + row[daysCol] + this.parseHour(row);
            }
            return "מתי: יום " + row[dayCol] + ", " + this.DateInddmmyyyy(row[dateCol]) + this.parseHour(row);

        }

        parseHour(row) {
            var hourCol = this.getHourCol();

            if(row[hourCol] != '')
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
        ColNumberByLabelWSheetName(label, sheetName) {
            var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
            var data = sheet.getDataRange().getValues();
            return this._colNumberByLabel(label, data);
        }

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