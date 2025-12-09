# Resume Parser API

This module provides endpoints to parse resumes/CVs using the [apilayer.com Resume Parser API](https://apilayer.com/marketplace/resume_parser-api).

## Setup

1. Subscribe to the Resume Parser API service at [apilayer.com](https://apilayer.com/marketplace/resume_parser-api)
2. Get your API key from the dashboard
3. Add the API key to your `.env` file:

```env
RESUME_PARSER_API_KEY=your_api_key_here
```

## API Endpoints

### 1. Parse Resume from URL

**POST** `/api/resume-parser/url`

Parse a resume from a publicly accessible URL.

**Request Body:**

```json
{
  "url": "https://example.com/resume.pdf"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "raw": {
      "name": "JOHN DOE",
      "email": "john@gmail.com",
      "skills": ["React", "Node.js", "Python"],
      "education": [
        {
          "name": "University Name",
          "dates": "2011"
        }
      ],
      "experience": [
        {
          "title": "Software Developer",
          "dates": "2015",
          "location": "City",
          "organization": "Company Name"
        }
      ]
    },
    "formatted": {
      "name": "JOHN DOE",
      "email": "john@gmail.com",
      "phone_no": "",
      "skills": ["React", "Node.js", "Python"],
      "experience": 8,
      "bio": "University Name (2011)"
    }
  }
}
```

**GET** `/api/resume-parser/url?url=<encoded_url>`

Alternative GET method for testing.

### 2. Parse Resume from File Upload

**POST** `/api/resume-parser/upload`

Parse a resume from an uploaded file. Supports multiple content types:

#### Option A: Raw Binary (Recommended for large files)

**Headers:**

```
Content-Type: application/octet-stream
x-file-name: resume.pdf
```

**Body:** Raw binary file data

#### Option B: Base64 Encoded (JSON)

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "file": "base64_encoded_file_data",
  "filename": "resume.pdf"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "raw": {
      /* raw parsed data */
    },
    "formatted": {
      /* formatted candidate data */
    }
  }
}
```

**POST** `/api/resume-parser/upload/binary`

Direct endpoint for raw binary uploads (application/octet-stream).

## Supported File Formats

- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)

## File Size Limits

- Maximum file size: 10MB

## Error Responses

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Example Usage

### Using cURL - Parse from URL

```bash
curl --location --request POST 'http://localhost:5000/api/resume-parser/url' \
--header 'Content-Type: application/json' \
--data-raw '{
    "url": "https://assets.apilayer.com/apis/codes/resume_parser/sample_resume.docx"
}'
```

### Using cURL - Parse from File (Raw Binary)

```bash
curl --location --request POST 'http://localhost:5000/api/resume-parser/upload/binary' \
--header 'Content-Type: application/octet-stream' \
--header 'x-file-name: resume.pdf' \
--data-binary '@/path/to/resume.pdf'
```

### Using cURL - Parse from File (Base64)

```bash
# First encode file to base64
FILE_BASE64=$(base64 -i resume.pdf)

curl --location --request POST 'http://localhost:5000/api/resume-parser/upload' \
--header 'Content-Type: application/json' \
--data-raw "{
    \"file\": \"$FILE_BASE64\",
    \"filename\": \"resume.pdf\"
}"
```

## Response Data Structure

### Raw Data

The `raw` field contains the exact response from the apilayer API, including:

- `name`: Candidate name
- `email`: Email address
- `phone`: Phone number (if available)
- `skills`: Array of skills
- `education`: Array of education entries
- `experience`: Array of work experience entries

### Formatted Data

The `formatted` field contains data formatted to match the candidate schema:

- `name`: Candidate name
- `email`: Email address
- `phone_no`: Phone number
- `skills`: Array of skills
- `experience`: Calculated years of experience
- `bio`: Education summary

## Notes

- The API requires a valid `RESUME_PARSER_API_KEY` in your environment variables
- URLs must be publicly accessible (no authentication required)
- The service supports free tier with limited requests
- Experience years are calculated from the earliest date found in the experience array
