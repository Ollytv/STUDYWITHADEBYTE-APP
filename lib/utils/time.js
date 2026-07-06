"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeToMinutes = timeToMinutes;
exports.minutesToTime = minutesToTime;
exports.formatTime = formatTime;
exports.getCurrentDayName = getCurrentDayName;
exports.getCurrentTimeMinutes = getCurrentTimeMinutes;
exports.getMinutesUntilClass = getMinutesUntilClass;
exports.isClassNow = isClassNow;
exports.isClassSoon = isClassSoon;
exports.isClassPast = isClassPast;
exports.formatCountdown = formatCountdown;
exports.getDayOrder = getDayOrder;
exports.sortClassesByTime = sortClassesByTime;
exports.formatDate = formatDate;
exports.todayDateString = todayDateString;
exports.formatTimeRange = formatTimeRange;
function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}
function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function formatTime(time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}
function getCurrentDayName() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
}
function getCurrentTimeMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}
function getMinutesUntilClass(startTime) {
    return timeToMinutes(startTime) - getCurrentTimeMinutes();
}
function isClassNow(startTime, endTime) {
    const now = getCurrentTimeMinutes();
    return now >= timeToMinutes(startTime) && now <= timeToMinutes(endTime);
}
function isClassSoon(startTime, threshold = 30) {
    const minutesUntil = getMinutesUntilClass(startTime);
    return minutesUntil > 0 && minutesUntil <= threshold;
}
function isClassPast(endTime) {
    return getCurrentTimeMinutes() > timeToMinutes(endTime);
}
function formatCountdown(minutes) {
    if (minutes <= 0)
        return 'Now';
    if (minutes < 60)
        return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0)
        return `${h}h`;
    return `${h}h ${m}m`;
}
function getDayOrder() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
}
function sortClassesByTime(classes) {
    return [...classes].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-NG', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
function todayDateString() {
    return new Date().toISOString().split('T')[0];
}
function formatTimeRange(start, end) {
    return `${formatTime(start)} – ${formatTime(end)}`;
}
//# sourceMappingURL=time.js.map