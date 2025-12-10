# Postman Testing Guide for Resume Parser API

This guide explains how to test the Resume Parser API endpoints using Postman.

## Prerequisites

1. **Server must be running** on `http://localhost:5000` (or your configured port)
2. **Environment variables** must be set:
   - `OPENAI_API_KEY` - Required for LLM parsing
   - `OPENAI_MODEL` - Optional (defaults to `gpt-4o-mini`)

## Endpoint 1: Parse Resume from URL

### POST `/api/resume-parser/url`

Parse a resume from a publicly accessible URL.

#### Setup in Postman:

1. **Method:** `POST`
2. **URL:** `http://localhost:5000/api/resume-parser/url`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**
   ```json
   {
     "url": "https://example.com/resume.pdf",
     "saveToDatabase": false
   }
   ```

#### Example Request:

```json
{
  "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "saveToDatabase": false
}
```

#### Expected Response (Success):

```json
{
  "success": true,
  "message": "Resume parsed successfully",
  "data": {
    "raw": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "skills": ["JavaScript", "React", "Node.js"],
      "experience": [
        {
          "company": "Tech Corp",
          "position": "Senior Developer",
          "dates": "2020-2023",
          "description": "Led development team"
        }
      ],
      "education": [
        {
          "name": "University of Technology",
          "dates": "2016-2020",
          "field": "Computer Science"
        }
      ],
      "bio": "Experienced software developer"
    },
    "formatted": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_no": "+1234567890",
      "skills": ["JavaScript", "React", "Node.js"],
      "experience": 3,
      "bio": "Education: University of Technology in Computer Science (2016-2020)"
    },
    "candidate": null
  }
}
```

#### To Save to Database:

Set `saveToDatabase: true` in the request body:

```json
{
  "url": "https://example.com/resume.pdf",
  "saveToDatabase": true
}
```

---

## Endpoint 2: Parse Resume from File Upload

### POST `/api/resume-parser/upload`

Parse a resume from an uploaded file. Supports multiple methods:

### Method A: Form-Data Upload (Recommended - Easiest in Postman) ✅

#### Setup in Postman:

1. **Method:** `POST`
2. **URL:** `http://localhost:5000/api/resume-parser/upload`
3. **Headers:**
   - Postman will automatically set `Content-Type: multipart/form-data` when you select form-data
4. **Body:**
   - Select **form-data** tab
   - Add key: `file` (type: **File**)
   - Click **Select Files** and choose your PDF/DOCX file
   - Add key: `saveToDatabase` (type: **Text**), value: `false` or `true`

**This is the easiest method for testing in Postman!** Just select form-data, add your file, and send.

#### Expected Response:

Same structure as URL endpoint response.

---

### Method B: Base64 Encoded (JSON)

#### Setup in Postman:

1. **Method:** `POST`
2. **URL:** `http://localhost:5000/api/resume-parser/upload`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**

   First, convert your PDF/DOCX file to base64. You can use:

   - Online tools: https://www.base64encode.org/
   - Or use this JavaScript in browser console:
     ```javascript
     // In browser console
     const fileInput = document.createElement("input");
     fileInput.type = "file";
     fileInput.onchange = async (e) => {
       const file = e.target.files[0];
       const reader = new FileReader();
       reader.onload = () => {
         const base64 = reader.result.split(",")[1];
         console.log(base64);
       };
       reader.readAsDataURL(file);
     };
     fileInput.click();
     ```

   Then use in Postman:

   ```json
   {
     "file": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9MZW5ndGggNDkgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAw...",
     "filename": "resume.pdf",
     "saveToDatabase": false
   }
   ```

#### Expected Response:

Same structure as URL endpoint response.

---

### Method C: Raw Binary (application/octet-stream)

#### Setup in Postman:

1. **Method:** `POST`
2. **URL:** `http://localhost:5000/api/resume-parser/upload/binary`
3. **Headers:**
   ```
   Content-Type: application/octet-stream
   x-file-name: resume.pdf
   x-save-to-database: false
   ```
4. **Body:**
   - Select **binary** tab
   - Click **Select File** and choose your PDF/DOCX file

#### Expected Response:

Same structure as URL endpoint response.

---

## Endpoint 3: GET Method for URL (Testing)

### GET `/api/resume-parser/url`

Alternative GET method for quick testing.

#### Setup in Postman:

1. **Method:** `GET`
2. **URL:** `http://localhost:5000/api/resume-parser/url?url=https://example.com/resume.pdf`
3. **No headers required** (optional: `Content-Type: application/json`)

---

## Testing Checklist

### ✅ Before Testing:

- [ ] Server is running (`npm run dev` or `npm start`)
- [ ] `OPENAI_API_KEY` is set in `.env` file
- [ ] You have a test resume file (PDF or DOCX)
- [ ] You have a publicly accessible resume URL (for URL testing)

### ✅ Test Cases:

1. **Test URL parsing:**

   - [ ] Valid PDF URL
   - [ ] Valid DOCX URL
   - [ ] Invalid URL (should return error)
   - [ ] Missing URL (should return 400 error)

2. **Test File Upload:**

   - [ ] Upload PDF file (base64)
   - [ ] Upload DOCX file (base64)
   - [ ] Upload invalid file type (should return error)
   - [ ] Upload file > 10MB (should return error)

3. **Test Database Saving:**
   - [ ] Parse and save to database (`saveToDatabase: true`)
   - [ ] Try saving duplicate email (should return error)

---

## Common Errors and Solutions

### Error: "OpenAI API key is not configured"

**Solution:** Add `OPENAI_API_KEY=your_key_here` to your `.env` file

### Error: "Failed to download file: HTTP 404"

**Solution:** The URL is not accessible. Use a publicly accessible URL or upload the file directly.

### Error: "Invalid file type"

**Solution:** Only PDF, DOCX, and DOC files are supported. Convert your file to one of these formats.

### Error: "File size exceeds 10MB limit"

**Solution:** Compress or reduce the file size before uploading.

### Error: "Resume text is empty or invalid"

**Solution:** The file might be corrupted, image-based PDF (needs OCR), or password-protected.

---

## Sample Test Files

You can use these sample resume URLs for testing:

1. **Sample PDF Resume:**

   ```
   https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
   ```

2. **Create your own test file:**
   - Create a simple PDF/DOCX with:
     - Name
     - Email
     - Phone
     - Skills
     - Work Experience
     - Education

---

## Tips for Better Results

1. **Use clear, well-formatted resumes** - The LLM works better with structured resumes
2. **Ensure resumes contain name and email** - These are required fields
3. **Test with different resume formats** - PDF, DOCX, various layouts
4. **Check the `raw` field** - This shows what the LLM extracted before formatting
5. **Monitor server logs** - Check console for detailed error messages

---

## Postman Collection Setup

You can create a Postman collection with these requests:

1. Create a new Collection: "Resume Parser API"
2. Add environment variables:
   - `base_url`: `http://localhost:5000`
   - `test_resume_url`: Your test resume URL
3. Add all three endpoints as separate requests
4. Save the collection for future use

---

## Example: Complete Postman Request (Base64 Method)

**Request:**

```
POST http://localhost:5000/api/resume-parser/upload
Content-Type: application/json

{
  "file": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9MZW5ndGggNDkgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAw...",
  "filename": "john_doe_resume.pdf",
  "saveToDatabase": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Resume parsed successfully",
  "data": {
    "raw": {
      /* LLM parsed data */
    },
    "formatted": {
      /* Formatted candidate data */
    },
    "candidate": null
  }
}
```

---

## Need Help?

- Check server console logs for detailed error messages
- Verify your `.env` file has `OPENAI_API_KEY` set
- Ensure the server is running on the correct port
- Test with a simple, well-formatted resume first
