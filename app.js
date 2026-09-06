require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejs = require("ejs");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const passport = require("./config/passport");

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");

const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");

const transporter = require("./utils/email");
const generateInvoice = require("./utils/invoice");


// =========================
// APP CONFIGURATION
// =========================

app.engine("ejs", ejsMate);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// =========================
// MIDDLEWARE
// =========================

app.use(methodOverride("_method"));

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


// =========================
// SESSION
// =========================

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);


// =========================
// PASSPORT
// =========================

app.use(passport.initialize());
app.use(passport.session());


// Make logged-in user available in EJS
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});


// =========================
// AUTHENTICATION MIDDLEWARE
// =========================

const isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {
        return res.redirect("/auth/google");
    }

    next();
};


// =========================
// AUTHORIZATION MIDDLEWARE
// =========================

const isOwner = wrapAsync(async (req, res, next) => {

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        throw new ExpressError("Listing not found", 404);
    }

    if (
        !listing.owner ||
        !listing.owner.equals(req.user._id)
    ) {
        throw new ExpressError(
            "You don't have permission",
            403
        );
    }

    next();
});


// =========================
// MONGODB CONNECTION
// =========================

async function main() {

    await mongoose.connect(
        "mongodb://127.0.0.1:27017/wanderlust"
    );
}

main()
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log(
            "Error connecting to MongoDB:",
            err
        );
    });


// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
    res.redirect("/listings");
});


// =========================
// LISTINGS
// =========================

// Index
app.get(
    "/listings",
    wrapAsync(async (req, res) => {

        const listings = await Listing.find({});

        res.render("listings/index.ejs", {
            listings
        });
    })
);


// New
app.get(
    "/listings/new",
    isLoggedIn,
    (req, res) => {

        res.render("listings/new.ejs");
    }
);


// Show
app.get(
    "/listings/:id",
    wrapAsync(async (req, res) => {

        const listing = await Listing
            .findById(req.params.id)
            .populate("reviews");

        if (!listing) {
            throw new ExpressError(
                "Listing not found",
                404
            );
        }

        res.render("listings/show.ejs", {
            listing
        });
    })
);


// Create
app.post(
    "/listings",
    isLoggedIn,

    wrapAsync(async (req, res) => {

        // Joi validation
        const result =
            listingSchema.validate(req.body);

        if (result.error) {

            throw new ExpressError(
                result.error.details[0].message,
                400
            );
        }

        const {
            title,
            description,
            price,
            location,
            country
        } = req.body;


        const newListing = new Listing({

            title,

            description,

            price,

            location,

            country,

            owner: req.user._id,

            image: {
                url: req.body["image.url"],
                filename: "listingimage"
            }
        });


        await newListing.save();

        res.redirect("/listings");
    })
);


// Edit
app.get(
    "/listings/:id/edit",

    isLoggedIn,

    isOwner,

    wrapAsync(async (req, res) => {

        const listing =
            await Listing.findById(req.params.id);

        if (!listing) {
            throw new ExpressError(
                "Listing not found",
                404
            );
        }

        res.render("listings/edit.ejs", {
            listing
        });
    })
);


// Update
app.post(
    "/listings/:id",

    isLoggedIn,

    isOwner,

    wrapAsync(async (req, res) => {

        const { id } = req.params;


        // Joi validation
        const result =
            listingSchema.validate(req.body);

        if (result.error) {

            throw new ExpressError(
                result.error.details[0].message,
                400
            );
        }


        const listing =
            await Listing.findByIdAndUpdate(

                id,

                {
                    title: req.body.title,

                    description: req.body.description,

                    price: req.body.price,

                    location: req.body.location,

                    country: req.body.country,

                    image: {
                        url: req.body["image.url"],
                        filename: "listingimage"
                    }
                },

                {
                    new: true
                }
            );


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        res.redirect(`/listings/${id}`);
    })
);


// Delete
app.delete(
    "/listings/:id",

    isLoggedIn,

    isOwner,

    wrapAsync(async (req, res) => {

        const { id } = req.params;


        const listing =
            await Listing.findByIdAndDelete(id);


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        res.redirect("/listings");
    })
);


// =========================
// REVIEWS
// =========================

app.post(
    "/listings/:id/reviews",

    isLoggedIn,

    wrapAsync(async (req, res) => {

        const listing =
            await Listing.findById(req.params.id);


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        const {
            comment,
            rating
        } = req.body.review;


        const review = new Review({

            comment,

            rating
        });


        await review.save();


        listing.reviews.push(review);


        await listing.save();


        res.redirect(
            `/listings/${listing._id}`
        );
    })
);


// =========================
// GOOGLE AUTHENTICATION
// =========================

app.get(
    "/auth/google",

    passport.authenticate(
        "google",
        {
            scope: [
                "profile",
                "email"
            ]
        }
    )
);


app.get(
    "/auth/google/callback",

    passport.authenticate(
        "google",
        {
            failureRedirect: "/"
        }
    ),

    (req, res) => {

        res.redirect("/listings");
    }
);


// =========================
// LOGOUT
// =========================

app.get(
    "/logout",

    (req, res, next) => {

        req.logout((err) => {

            if (err) {
                return next(err);
            }

            res.redirect("/listings");
        });
    }
);


// ==================================================
// BOOKING
// ==================================================


// Booking page
app.get(
    "/listings/:id/book",

    isLoggedIn,

    wrapAsync(async (req, res) => {

        const listing =
            await Listing.findById(req.params.id);


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        res.render(
            "bookings/new.ejs",
            {
                listing
            }
        );
    })
);


// Booking details → Payment page
app.post(
    "/listings/:id/book",

    isLoggedIn,

    wrapAsync(async (req, res) => {

        const listing =
            await Listing.findById(req.params.id);


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        const {
            checkIn,
            checkOut,
            guests
        } = req.body;


        const start =
            new Date(checkIn);

        const end =
            new Date(checkOut);


        const nights =
            Math.ceil(
                (end - start) /
                (1000 * 60 * 60 * 24)
            );


        if (nights <= 0) {

            throw new ExpressError(
                "Check-out must be after check-in",
                400
            );
        }


        const totalPrice =
            nights * listing.price;


        res.render(
            "bookings/payment.ejs",
            {
                listing,

                checkIn,

                checkOut,

                guests,

                nights,

                totalPrice
            }
        );
    })
);


// ==================================================
// PAYMENT + BOOKING + INVOICE + EMAIL
// ==================================================

app.post(
    "/bookings/payment",

    isLoggedIn,

    wrapAsync(async (req, res) => {

        const {
            listingId,
            checkIn,
            checkOut,
            guests,
            totalPrice
        } = req.body;


        // Create booking
        const booking = new Booking({

            listing: listingId,

            user: req.user._id,

            checkIn,

            checkOut,

            guests,

            totalPrice,

            paymentStatus: "paid"
        });


        // Save booking
        await booking.save();


        // Get listing
        const listing =
            await Listing.findById(listingId);


        if (!listing) {

            throw new ExpressError(
                "Listing not found",
                404
            );
        }


        // Generate invoice
        const invoice =
            generateInvoice(
                booking,
                listing,
                req.user
            );


        // Send email
        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: req.user.email,

            subject:
                "Wanderlust Booking Confirmation",

            text: `
Your booking has been confirmed.

Listing: ${listing.title}

Check-in: ${checkIn}

Check-out: ${checkOut}

Guests: ${guests}

Total Paid: ₹${totalPrice}

Your invoice is attached.
            `,

            attachments: [
                {
                    filename: "invoice.pdf",

                    content: invoice
                }
            ]
        });


        // Success page
        res.render(
            "bookings/success.ejs",
            {
                booking,

                listing
            }
        );
    })
);


// =========================
// 404 ROUTE
// =========================
// IMPORTANT:
// This MUST be at the very end,
// after ALL normal routes.

app.all(
    "/{*path}",

    (req, res, next) => {

        next(
            new ExpressError(
                "Page Not Found",
                404
            )
        );
    }
);


// =========================
// ERROR HANDLING
// =========================

app.use(
    (err, req, res, next) => {

        const {
            statusCode = 500,
            message = "Something went wrong"
        } = err;


        res
            .status(statusCode)
            .render(
                "listings/error.ejs",
                {
                    message,

                    err
                }
            );
    }
);


// =========================
// SERVER
// =========================

app.listen(
    3000,
    () => {

        console.log(
            "Server is running on port 3000"
        );
    }
);