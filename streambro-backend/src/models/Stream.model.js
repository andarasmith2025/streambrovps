const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    startTime: String, // "08:00"
    endTime: String, // "12:00"
    durationHours: Number, // 4
}, { _id: false });

const StreamSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    rtmpUrl: {
        type: String,
        required: true,
        default: 'rtmp://a.rtmp.youtube.com/live2',
    },
    streamKey: {
        type: String,
        required: true,
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        default: null,
    },
    loop: {
        type: Boolean,
        default: true,
    },
    scheduleType: {
        type: String,
        enum: ['Manual', 'Recurring', 'Duration'],
        default: 'Manual',
    },
    schedule: ScheduleSchema,
    status: {
        type: String,
        enum: ['Idle', 'Running', 'Scheduled', 'Error'],
        default: 'Idle',
    },
    ffmpegPid: {
        type: Number,
        default: null,
    },
}, {
    timestamps: true,
});

const Stream = mongoose.model('Stream', StreamSchema);
module.exports = Stream;
