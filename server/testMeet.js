import axios from "axios";

const CAL_API_KEY = "cal_live_b0deac0bd347ee99d612c1b3154de4ed";
const CAL_API_VERSION = "2024-08-13";
const EVENT_TYPE_ID = 4025819;

async function generateMeetLink() {
  try {
    console.log("\n=== STEP 1: Finding Available Slot ===\n");

    // 1. Calculate Date Range (Look 30 days ahead to ensure we find a slot)
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + 30); 

    const params = {
      startTime: now.toISOString(),
      endTime: future.toISOString(),
      eventTypeId: EVENT_TYPE_ID,
    };

    console.log("Searching for slots between:");
    console.log(`From: ${params.startTime}`);
    console.log(`To:   ${params.endTime}`);

    // 2. Fetch available slots
    const slotsResp = await axios.get(
      `https://api.cal.com/v2/slots/available`,
      {
        params: params,
        headers: {
          Authorization: `Bearer ${CAL_API_KEY}`,
          "cal-api-version": CAL_API_VERSION,
        },
      }
    );

    const slots = slotsResp.data.data.slots;
    let firstAvailableSlot = null;

    // 3. Find the first valid slot
    // The slots object is grouped by date: { "2025-11-29": [...], "2025-11-30": [...] }
    for (const dateKey in slots) {
      if (slots[dateKey] && slots[dateKey].length > 0) {
        firstAvailableSlot = slots[dateKey][0].time;
        console.log(`\n✓ Found Slot on ${dateKey}: ${firstAvailableSlot}`);
        break; 
      }
    }

    // 4. STOP if no slots found (Do not guess a time)
    if (!firstAvailableSlot) {
      console.error("\n❌ FATAL: No available slots found in the next 30 days.");
      console.error("Check your Cal.com Dashboard: Is the Event Type enabled? Do you have availability hours set?");
      return; 
    }

    console.log("\n=== STEP 2: Creating Booking ===\n");

    const requestBody = {
      eventTypeId: EVENT_TYPE_ID,
      start: firstAvailableSlot,
      location: "integrations:google_meet",
      // Reverting to 'attendee' structure which is standard for v2
      attendee: {
        name: "Subham Test",
        email: "test@example.com",
        timeZone: "Asia/Kolkata",
        language: "en"
      }
    };

    console.log("Sending booking request...");

    const createResp = await axios.post(
      "https://api.cal.com/v2/bookings",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${CAL_API_KEY}`,
          "cal-api-version": CAL_API_VERSION,
          "Content-Type": "application/json",
        },
      }
    );

    const bookingUid = createResp.data.data.uid;
    console.log("✓ Booking Created. UID:", bookingUid);

    console.log("\n=== STEP 3: Getting Meeting Details ===\n");

    // We can usually get the link directly from the creation response or by fetching the booking
    const getBookingResp = await axios.get(
        `https://api.cal.com/v2/bookings/${bookingUid}`,
        {
          headers: {
            Authorization: `Bearer ${CAL_API_KEY}`,
            "cal-api-version": CAL_API_VERSION,
          },
        }
      );
  
    const bookingData = getBookingResp.data.data;
      
    // robustly check for the link in all known locations
    const meetLink =
      bookingData.meetingUrl ||
      bookingData.location?.url ||
      bookingData.metadata?.videoCallUrl ||
      "Link not generated yet (check email)";

    console.log("\n=== GOOGLE MEET LINK ===");
    console.log(meetLink);

  } catch (err) {
    console.log("\n❌ ERROR:");
    // Log the specific API error message if available
    if (err.response?.data) {
        console.log(JSON.stringify(err.response.data, null, 2));
    } else {
        console.log(err.message);
    }
  }
}

generateMeetLink();