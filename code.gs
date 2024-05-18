function doGet(e) {
    Logger.log(e);
    const op = e.parameter.req;
    const ss = SpreadsheetApp.open(DriveApp.getFileById("yourGoogleSheetID"));
    const sn = "yourGoogleSheetName";

    if (op == "get")
        return findAll(ss, sn);

    if (op == "getone")
        return findOne(e, ss, sn);

    if (op == "post")
        return update(e, ss, sn);
}

function getSheetData(ss, sn) {
    const sh = ss.getSheetByName(sn);
    return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function findAll(ss, sn) {
    const sh = getSheetData(ss, sn);
    const result = sh.map((data, index) => {
      return {
        rowIndex: index + 2,
        entry_id: data[0],
        uuid: data[1],
        emojiName1: data[2],
        emojiName2: data[3],
        emojiName3: data[4],
        emojiName4: data[5],
        emojiName5: data[6],
        created_at: data[7],
        updated_at: data[8],
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON)
}

function findOne(e, ss, sn) {
    const entry_id = e.parameter.eid;
    const uuid = e.parameter.uid;

    const sh = ss.getSheetByName(sn);
    const data = sh.getDataRange().getValues();

    var result = "id not found";

    for(var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0] == entry_id && row[1] == uuid) {
        result = {
        rowIndex: i + 1,
        entry_id: row[0],
        user_id: row[1],
        emojiName1: row[2],
        emojiName2: row[3],
        emojiName3: row[4],
        emojiName4: row[5],
        emojiName5: row[6],
        created_at: row[7],
        updated_at: row[8],
      };
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON)
}

function update(e, ss, sn) {
    const entry_id = e.parameter.eid;
    const uuid = e.parameter.uid;
    const emoji = e.parameter.emoji;

    const emojiMapping = {
      "emojiName1": 3,
      "emojiName2": 4,
      "emojiName3": 5,
      "emojiName4": 6,
      "emojiName5": 7,
    };
    const updatedAtIndex = 9;

    if (!emojiMapping.hasOwnProperty(emoji)) {
      throw new Error('Invalid emoji name');
    }

    var rowIndex = -1;
    var result = "";

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      const sh = ss.getSheetByName(sn);
      var data = JSON.parse(findOne(e, ss, sn).getContent()).data;
      const colIndex = emojiMapping[emoji];
      const currentTime = new Date().toLocaleString();

      if (!data.rowIndex) {
        // create
        var newRow = [entry_id, uuid, false, false, false, false, false, currentTime, currentTime];
        newRow[colIndex - 1] = true;
        sh.appendRow(newRow);
        rowIndex = sh.getLastRow();
        result = "created successfully";
      } else {
        // update
        rowIndex = data.rowIndex;
        var updateEmojiValue = !data[emoji];
        sh.getRange(rowIndex, colIndex).setValue(updateEmojiValue);
        sh.getRange(rowIndex, updatedAtIndex).setValue(currentTime);
        result = "updated successfully";

        // delete
        data = JSON.parse(findOne(e, ss, sn).getContent()).data;
        var allEmojiFalse = true;
        for (var key of Object.keys(emojiMapping)) {
          if (data[key]) {
            allEmojiFalse = false;
            break;
          }
        }
        if (allEmojiFalse) {
          sh.deleteRow(rowIndex);
          result = "deleted successfully";
        }
      }
    } finally {
      lock.releaseLock();
    }

    result = {
      rowIndex: rowIndex,
      result: result,
    };

    return ContentService.createTextOutput(JSON.stringify({ result })).setMimeType(ContentService.MimeType.JSON)
}