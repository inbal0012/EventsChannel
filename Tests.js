// jshint esversion: 8
if (typeof require !== 'undefined') {
  UnitTestingApp = require('./UnitTestingApp.js');
  Post = require('./PostFromForm.js');
}

/*****************
 * TESTS 
 *****************/

/**
 * Runs the tests; insert online and offline tests where specified by comments
 * @returns {void}
 */
function runTests() {
  const test = new UnitTestingApp();
  const post = new Post();

  test.enable();
  test.clearConsole();
  
  test.runInGas(false);
  test.printHeader('LOCAL TESTS');
  /************************
   * Run Local Tests Here
  ************************/

  test.runInGas(true);
  test.printHeader('ONLINE TESTS');
  /************************
  * Run Online Tests Here
  ************************/
  
  const EVENT_TABLE = "Sheet1";
  const DATA_RANGE = 'A1:BW';
  
  var eventsSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Q5pNPWrtLCkDtGDmadupOueSDQoZ3d8-FU0hJwZr4Kk/edit?gid=696755716#gid=696755716").getSheetByName(EVENT_TABLE);
  var eventsData = eventsSheet.getDataRange().getValues();

  // #region Tags
  function testTags(rowNum, expectedResult) {  
    var tags = post.parseTags(row_num(rowNum), eventsData)
    this.assert(tags==expectedResult, "testTags: row " + rowNum, expectedResult, tags);
  }
  test.addNewTest('testTags', testTags);

  var tagsTests = {
    194: "#מסיבתפטיש #אורגיה, #פלייפרטי #במועדון #אירועציבורי #ללאהגבלתמשתתפים #מיניותפומבית, #עירוםפומבי, #בדסמ #לגבריםבלבד #ללאהגבלתגיל #עםעישוןבפנים #עםמתחםעישון #שיבארי",
    // AA text
    454 : `#מסיבהליברלית #אורגיה #מסיבתסווינגרס #אירועביתי #אירועפרטי #עד50איש #מיניותפומבית #באיזוןמגדרי #נשיםיחידות #גיל30עד50 #אירועעםהנחיה`,
    // post text
    199 : `#סדנה #במתחםפרטי #עד6זוגות #עירוםפומבי #ללאהגבלתגיל #זוגותבלבד #ללאעישוןבפנים #עםמתחםעישון #אירועעםהנחיה`,
    // post link  // TODO
    445 : `#מסיבתפטיש #מסיבהליברלית #פלייפרטי #במועדון #אירועפרטי #מיניותפומבית #בדסמ #באיזוןמגדרי #באיזוןמשחקי #להטבקפרנדלי #ללאמגבלתגיל #ללאעישוןבפנים #עםמתחםעישון #יומולדת`,
    // MOJO
    116 : `#מסיבתסווינגרס #מסיבתפטיש #פלייפרטי #במועדון #אירועציבורי #עד300איש #בדסמ #מיניותפומבית #באיזוןמגדרי #נשיםיחידות #ללאמגבלתגיל #ללאעישוןבפנים #עםמתחםעישון`,
    // Wild Ginger
    180 : `#כירבולייה #אירועביתי #אירועפרטי #עד20איש #ללאמיניות #ללאמגבלתגיל #באיזוןמגדרי #איזוןעיהמארגנים #להטבקפרנדלי #אירועעםהנחיה #ללאעישוןבפנים #עםמתחםעישון`,
    200 : `#SaveTheDate
#פיקניק #מפגשפולי #בטבע #אירועציבורי #ללאמגבלתמשתתפים #ללאמיניות #ללאאיזוןמגדרי`,
    // northen Circle
    229 : `#SaveTheDate
#מסיבהליברלית #מסיבתסווינגרס #מתחםפרטי #אירועפרטי #עד100איש #מיניותפומבית #גיל25עד45 #באיזוןמגדרי #באיזוןעיהמארגנים #נשיםיחידות`,
    // Paid event
    342 : `‼️🤑
#SaveTheDate
#מסיבהליברלית #מסיבתסווינגרס #מתחםפרטי #אירועפרטי #עד40איש #מיניותפומבית #באיזוןמגדרי #נשיםיחידות #ללאמגבלתגיל`,
  }

  for(var key in tagsTests) {
    // test.testTags(key, tagsTests[key]);
  }  
  // #endregion Tags

  // #region date
  function testDate(rowNum, expectedResult) {
    var result = post.parseDate(row_num(rowNum), eventsData);
    this.assert(result==expectedResult, "testDate: row " + rowNum, expectedResult, result);
  }
  test.addNewTest('testDate', testDate);

  var dateTests = {
    446 : "מתי: יום חמישי, 26/09/2024",
    455 : "מתי: יום חמישי, 26/09/2024, בשעה 23:00"
  }

  for(var key in dateTests) {
    // test.testDate(key, dateTests[key]);
  }  
  // #endregion Date

  // #region System Approved  
  function testSystemApproved(rowNum, expectedResult) {
    var result = post.parseSystemApproved(row_num(rowNum), eventsData);
    this.assert(result==expectedResult, "testSystemApproved: row " + rowNum, expectedResult, result);
  }
  test.addNewTest('testSystemApproved', testSystemApproved);

  var systemApprovedTests = {
    408 : "✅ ",
    423 : "✅ ",
    375 : "✅ ",
    460 : ""
  }

  for(var key in systemApprovedTests) {
    // test.testSystemApproved(key, systemApprovedTests[key]);
  } 
  // #endregion System Approved  

  // #region Link  
  function testLink(rowNum, expectedResult) {
    var result = post.parseRegistrationLink(row_num(rowNum), eventsData);
    this.assert(result==expectedResult, "testLink: row " + rowNum, expectedResult, result);
  }
  test.addNewTest('testLink', testLink);

  var linkTests = {
    457 : "https://tinyurl.com/ShvaEvents",
    448 : "https://tinyurl.com/KimberliSecretFemdom",
    439 : "https://tinyurl.com/ENM-YWP-party",
    419 : "https://www.facebook.com/share/5diKavqbCxwTB8Zz/",
    254 : "https://www.avishagmaya.com/kirbulim/",
    265 : "https://www.facebook.com/share/resBmXAHjfjkTtur/?mibextid=9VsGKo"
  }

  for(var key in linkTests) {
    // test.testLink(key, linkTests[key]);
  } 
  // #endregion Link  


  function testPost(rowNum, expectedResult) {  
    var tags = post.createPost(rowNum)
    this.assert(tags==expectedResult, "testPost: row " + (rowNum+1), expectedResult, tags);
  }
  test.addNewTest('testPost', testPost);
  
  var postCol = post._colNumberByLabel("פוסט", eventsData) - 1;
  var inbalPostCol = post._colNumberByLabel("פוסט ענבל", eventsData);
  
    var testRow = 456;
    var result = eventsData[testRow][postCol];
    // test.testPost(testRow, result);

  for (var i = 380; i< eventsData.length; i++) {
    var result = post.createPost(i);    
    var cell = eventsSheet.getRange(i+1, inbalPostCol);
    cell.setValue(result);
  }

  for (var i = 380; i< eventsData.length; i++) {
    var result = eventsData[i][postCol];
    test.testPost(i, result);
  }
}

function row_num(num){
  return num-1;
}

/**
 * If we're running locally, execute the tests. In GAS environment, runTests() needs to be executed manually
 */
(function() {
  /**
 * @param {Boolean} - if true, were're in the GAS environment, otherwise we're running locally
 */
  const IS_GAS_ENV = typeof ScriptApp !== 'undefined';
  if (!IS_GAS_ENV) runTests();
})();