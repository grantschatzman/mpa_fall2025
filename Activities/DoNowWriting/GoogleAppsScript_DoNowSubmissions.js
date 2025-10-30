/**
 * Google Apps Script for Do Now Writing Submissions
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Add headers: Timestamp | Student Name | Prompt Name | Prompt Text | Student Writing | Word Count | Teacher Notes
 * 3. Go to Extensions > Apps Script
 * 4. Paste this code
 * 5. Click "Deploy" > "New deployment"
 * 6. Type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"
 * 9. Click "Deploy" and copy the Web App URL
 * 10. Paste that URL into DoNow_Activity.html CONFIG.submissionUrl
 */

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.studentName || !data.promptName || !data.promptText || !data.studentWriting) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Prepare the row data
    const timestamp = new Date();
    const rowData = [
      timestamp,
      data.studentName,
      data.promptName,
      data.promptText,
      data.studentWriting,
      data.wordCount || 0,
      '' // Empty Teacher Notes column
    ];

    // Append the row
    sheet.appendRow(rowData);

    // Return success
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Submission received successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return error
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional - can run this to test the script)
function testSubmission() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        studentName: 'Test Student',
        promptName: 'week1_imagery',
        promptText: 'Describe a storm using vivid sensory details.',
        studentWriting: 'The rain hammered down on the tin roof, creating a deafening roar that drowned out all other sounds.',
        wordCount: 19
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
