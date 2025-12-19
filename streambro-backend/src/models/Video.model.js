const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: { // Original filename
        type: String,
        required: true,
        trim: true,
    },
    duration: { // Formatted duration string e.g., "01:23:45"
        type: String, 
        required: true,
    },
    filePath: { // Path on the server filesystem
        type: String,
        required: true,
    },
    fileUrl: { // URL to access the file via HTTP
        type: String,
        required: true,
    },
    thumbnailUrl: { // URL to access the thumbnail
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Video = mongoose.model('Video', VideoSchema);
module.exports = Video;
