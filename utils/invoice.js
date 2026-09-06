const PDFDocument = require("pdfkit");

function generateInvoice(booking, listing, user) {

    const doc = new PDFDocument();

    doc.fontSize(24).text("WANDERLUST", {
        align: "center"
    });

    doc.moveDown();

    doc.fontSize(18).text("Booking Invoice");

    doc.moveDown();

    doc.fontSize(12);

    doc.text(`Guest: ${user.name}`);
    doc.text(`Email: ${user.email}`);

    doc.moveDown();

    doc.text(`Listing: ${listing.title}`);
    doc.text(`Location: ${listing.location}`);

    doc.moveDown();

    doc.text(`Check-in: ${booking.checkIn}`);
    doc.text(`Check-out: ${booking.checkOut}`);
    doc.text(`Guests: ${booking.guests}`);

    doc.moveDown();

    doc.fontSize(16)
       .text(`Total Paid: ₹${booking.totalPrice}`);

    doc.moveDown();

    doc.text("Payment Status: PAID");

    return doc;
}

module.exports = generateInvoice;