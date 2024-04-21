const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const app = express();
dotenv.config();

const PORT = process.env.PORT

// Load availability data from JSON file
const availabilityData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'available.json'))
);

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Endpoint to check doctor availability
app.get('/doctor-availability', (req, res) => {
  const { date, time } = req.query;
  const requestedDateTime = new Date(`${date}T${time}`);

  // Determine the day of the week for the requested date
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    requestedDateTime.getDay()
  ];

  // Check if the doctor is available on the requested weekday
  const slots = availabilityData.availabilityTimings[weekday];
  if (slots && slots.length > 0) {
    const requestedTimeMinutes = timeToMinutes(time);

    const slotAvailable = slots.some(slot => {
      const slotStartMinutes = timeToMinutes(slot.start);
      const slotEndMinutes = timeToMinutes(slot.end);

      return requestedTimeMinutes >= slotStartMinutes && requestedTimeMinutes <= slotEndMinutes;
    });

    if (slotAvailable) {
      res.json({ isAvailable: true });
    } else {
      // Find the next available slot
      const nextSlot = slots.find(slot => {
        const slotStartMinutes = timeToMinutes(slot.start);
        return slotStartMinutes > requestedTimeMinutes;
      });
      console.log(nextSlot);

      if (nextSlot) {
        res.json({
          isAvailable: false,
          nextAvailableSlot: {
            date,
            time: nextSlot.start
          }
        });
      } else {
        res.json({ isAvailable: false, nextAvailableSlot: null, message: "No next slot" });
      }
    }
  } else {
    res.json({ isAvailable: false, nextAvailableSlot: null, message: "No slot" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
