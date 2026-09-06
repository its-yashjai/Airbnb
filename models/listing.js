const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const listingSchema = new Schema({
    title: {
        type: String,
        required: true
    },  
    description: {
        type: String,
        required: true
    },
image: {
  url: {
    type: String,
    default: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
  },
  filename: {
    type: String,
    default: "default-image",
  }
},
    price: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    owner: {
    type: Schema.Types.ObjectId,
    ref: "User"
},
});

const Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing;